// #region Dependencies
const express = require("express");
const { google } = require("googleapis");
const mysql = require("mysql");
//const drive = google.drive({version: 'v3'});
const mime = require('mime-types');
const cron = require('node-cron');

//const sharp = require('sharp'); // kép resizinghez kell
const crypto = require('crypto');
const fs = require('fs'); 
const fspromise = require('fs').promises; 
const path = require("path");
const { exec } = require("child_process");
// const mysqldump = require("mysqldump") // nincs használva
const util = require("util");
const ansiToHtml = require('ansi-to-html');

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const app = express();
const convert = new ansiToHtml();
app.use(express.json());
app.use(express.static("public"));
app.use('/segitseg', express.static(path.join(__dirname, 'segitseg')));
var md5 = require('js-md5');
let drive = null;

const config = require("./config/config.js");
//require('dotenv').config();
const session = require('express-session');

const { rnd, randomHatterszin, randomFajlNev, base64Ment, base64Tolt, isPositiveInt, isEmail, isNonEmptyString, userTokenCreate } = require("./utils/helpers");
const { naplozz } = require("./utils/naplozo");
const conn = require("./config/db").connMegszerez();
const { createOAuthClient, createClientUsingCredentials, SCOPES, baseUrl, clientId } = require("./config/google")
const { sendMail } = require("./services/emailsend")
const { loggerConfig, getLogger, terminal_wss_tokens, startWss } = require("./config/logging")


const pad = (s, n) => s.padEnd(n);
const activeSessions = new Set()

MSG_PAD = 30;
METHOD_PAD = 16;
IP_PAD = 16;

function logFormat(msg, method, ip) {
  return `${msg.padEnd(MSG_PAD)} method=${method.padEnd(METHOD_PAD)} ip=${ip.padEnd(IP_PAD)}`;
}

loggerConfig('debug', false);
var logger = getLogger();



// ha jól értem akkor ez callback helyett vagy elfogadja vagy elutasítja a connectiont, promise based lesz, a bind pedig megakadályozza a leválasztást?
const queryAsync = util.promisify(conn.query).bind(conn);  
const sessionMiddleware = session({ // ez egy middleware, ez kell a storehoz ha nem akarunk session kezelő libraryt
  secret: config.server.session_secret || 'default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60  // 1 óra
  }
});

app.use(sessionMiddleware)

const sessionStore = sessionMiddleware.store
// #endregion


/* ------------------------------------ - Global variables - --------------------------------------- */
// #region Global variables
var feladat_utolso_id

//#endregion

/* 
websocketes frontend terminál:
GET /wss endpoint -> Helyes admin bejelentkezés esetében visszaküld egy 32 karakteres random wss session tokent

wss: Csak akkor tud az admin bármi terminál logot látni ha a wss csatlakozásban azt a tokent elküldi a kliens
uxterm: szép terminál format
*/

/* --------------------------------------- - index.html - ------------------------------------------ */
   
    /* ------ ------------------- ------    Google Auth   ------ ------------------- ------ */
 //#region Google Auth
// 1.lépés: átirányítani a usert a google bejelentkezési oldalára, az authurl-ben határozzuk meg a jogosultságokat az url átdob a google bejelentkezési felületére
app.get("/redirect", (req, res) => {  //PR, RD
  //Átirányítás a google bejeentkezés/engedélyadás oldalra
  logger.log({
    level: 'info',
    message: logFormat("Google Auth progress started", "GET", req.ip),
  })
  
  try {
    const client = createOAuthClient(); //új kliens a sessionhoz -> nem dob be más user accountjába
    
    const userToken = crypto.randomBytes(16).toString("hex")
    req.session.userToken = userToken
    req.session.oauthState = userToken
    
    const state = req.session.userToken;   

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: state
    })
    
    res.redirect(authUrl); // autómatikusan átirányít a Google login oldalra
  } catch (error) {
    res.status(400).end()
    logger.log({
      level: 'error',
      message: `/redirect error!  error=${error.message}`
    });
  }
});

app.get("/reg", async (req, res) => { //PR, RD
  try{
    const returnedState = req.query.state || null //google küldte vissza (token)
    const pendingState = req.session.oauthState || null//mi tároltuk el a sessionbe (token)
    
    // ha nincs returnState(google nem küld vissza semmit) vagy nincs pendingState(mi nem tárolunk semmit) vagy nem matchelnek a tokenek 
    if(!returnedState || !pendingState || returnedState !== pendingState) {
      logger.log({
        level: 'error',
        message: `/reg error! Valamelyik session-token hiányzik, vagy nem egyeznek a tokenek`
      });

      return res.status(400).send('Invalid OAuth state');
    }

    const code = req.query.code;
    if (!code) return res.status(400).send('Missing code');
    req.session.code = code;

    const client = createOAuthClient(); //új kliens a sessionhoz -> nem dob be más user accountjába
    const {tokens: uj_tokenek} = await client.getToken(req.query.code) // uj_tokenek tartalmazza: access_token, refresh_token, expiry_date

    const lejaratms = uj_tokenek.expiry_date || Date.now() + (3600 * 1000) //vagy a lejárati idő a tokenekből ha nincs akkor most + 2 óra(időzóna difference)
    req.session.access_token = uj_tokenek.access_token;
    req.session.refresh_token = uj_tokenek.refresh_token;
    req.session.expiry_date = lejaratms;

    //felhasználó adataiak kiszedése az új tokenek segítségével
    client.setCredentials(uj_tokenek)
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    const name = userInfo.data.name

    naplozz(`login_redirect_2 email=${email}`, 0);
    res.redirect(`/?name=${name}&email=${encodeURIComponent(email)}`);
  }
  catch(err){
    console.error(err);
    res.redirect("hiba.html");
  }
});

app.post("/logout", (req, res) =>{ //RD
  const sessionId = req.sessionID;
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout error");

    activeSessions.delete(sessionId);
    /*console.log("bejelentkezett user count: ")*/
    res.clearCookie('connect.sid');
    sessionCounter()
    res.end()
  });
})

function sessionCounter(){ //RD
  const now = Date.now();
  const maxAge = 1000 * 60 * 60; // 1 óra
  for (const [sid, ts] of activeSessions) {
    if (now - ts > maxAge) activeSessions.delete(sid);
  }
  var dbSzam = activeSessions.size
  /*console.log(dbSzam);*/
  return dbSzam
}
//#endregion

    /* ------ ----------------- ------    Register, Login   ------ ----------------- ------ */
  //#region Register, Login
app.post("/registerData", async (req, res) =>{ //RD, PR
  try{
    const username = req.body.username
    const email = req.body.email
    const passwd = req.body.password
    
    if (!isEmail(email) || !isNonEmptyString(passwd) || !isNonEmptyString(username)) {//mezőellenőrzés
      return res.send(JSON.stringify({ error: 'invalid input' }));
    }

    // Check if username already exists
    const checkUsernameSql = `SELECT id FROM Users WHERE Nev = ? LIMIT 1`;
    const existingUser = await queryAsync(checkUsernameSql, [username]);
    if (existingUser && existingUser.length > 0) {
      return res.send(JSON.stringify({ error: 'username_exists' }));
    }

    // új user felvétele, adatok tárolása, a jelszó MD5-ös hashelése, FROM_UNIXTIME - másodpercről datetimera alakít, hozzá kell adni 2 órát(7200000 ms) mert a  token expiry date más időzónát számít augh
    let sql = `INSERT INTO Users(Nev, Email, Jelszo, Jogosultsag, AccessToken, RefreshToken, UserToken, AccessEletTartam, Hatterszin, IntezmenyId) 
              VALUES(?, ?, MD5(?), 'Tanár', ?, ?, MD5(?), FROM_UNIXTIME((? + 7200000) / 1000), '${randomHatterszin()}', NULL)`; 
    
    
    const insertSql = await queryAsync(sql, [username, email, passwd, req.session.access_token, req.session.refresh_token, req.session.userToken, req.session.expiry_date]) //insert végrehajtása
    const ujId = insertSql.insertId //user idjének kiszedése
    
    req.session.userId = ujId //tulajdonképpen meg lesz jelölve bejelentkezettként a user // id eltárolása a sessionbe
    
    activeSessions.add(req.sessionID)
    /*console.log("bejelentkezett user count: ")*/
    sessionCounter()

    delete req.session.pendingUserId // nincs szükség rá, ott van a usreId a sessionbe, ha van a usernek userIdje a sessionbe akkor van bejelentkezve
    delete req.session.oauthState     //useless ezután  //useless???
    delete req.session.access_token   
    delete req.session.refresh_token  
    delete req.session.expiry_date    

    logger.log({
      level: 'info',
      message: logFormat(`User ${username} succesfully registered!`, "POST", req.ip),
    });

    res.send(JSON.stringify({"userToken":req.session.userToken}))
    
    delete req.session.userToken
  }
  catch(err){
    logger.log({
      level: 'error',
      message: `registerdata error=${err.message}`
    });
    res.status(500).send(JSON.stringify({error:'Registration failed'}));
  }
  res.end()
})

app.post("/isRegistered", (req, res) => { //PR, regisztrálva van-e a user
  try{
    var email = req.body.email;
    /*console.log(email)*/
    if (!isEmail(email)) {
        return res.send(JSON.stringify({ error: 'invalid input' }));
      }

    let sql = "select count(*) from Users where Email = ?";
    conn.query(sql, [email], (err, results) => {
      if(err){
        logger.log({
          level: 'error',
          message: `isRegistered error=${err.message} email=${email}`
        });
      }
      //res.set('Content-Type', 'text/html', 'charset=utf-8');
      res.send(results[0]['count(*)'] > 0 ? 'true' : 'false'); 
    });
  }
  catch(err){
    logger.log({
      level: 'error',
      message: `isRegistered error=${err.message}`
    });
    res.status(500).send(JSON.stringify({error:'Registration failed'}));
  }
  //res.end()
});


app.post("/setIntezmeny", async (req, res) => { //PR, a user intézményének adatbázisba való mentése
  try{

    const email = req.body.email
    const intezmeny = req.body.intezmeny

    var sql = "UPDATE Users SET IntezmenyId = ? WHERE Email = ?;"
    conn.query(sql, [intezmeny, email], (err, results) => {
      if(err){
        logger.log({
          level: 'error',
          message: `setIntezmeny error=${err.message} email=${email}`
        });
      }

      req.session.intezmenyId = intezmeny
      res.set('Content-Type', 'text/html', 'charset=utf-8');
      res.end();
  });}
  catch (err){
    /*console.log(err)*/
    res.end()
  }
})


app.post("/loginUser", async (req, res) => { //RD, PR
  var user = req.body.user;                // login adatok ellenőrzése, az email és a felhasználónév is elfogadott,
  var passwd = req.body.passwd;           // pontosabban a helyes bejelentekzési adatokkal rendelkező userek megszámolása, 
  var user_token = req.body.userToken    // ha tobb mint 0 akkor bejelentkeztetjük
  var mail = req.body.mail

  const noMail = !Boolean(mail)
  
  
  if (noMail) {
    /*console.log("stay logged in")*/
    if ( (user_token == "" && (!isNonEmptyString(passwd) || !isNonEmptyString(user)))) {
      return res.send(JSON.stringify({ error: 'invalid input' }));
    }
  }
  let sql = `SELECT COUNT(id), id, UserToken, IntezmenyId
             FROM Users 
             ${noMail ? `WHERE (${isEmail(user) ? "Email = ?" : "Nev = ?" } AND Jelszo = MD5(?)) 
             OR UserToken = ?` : `Where Email = ?`}`;
  conn.query(sql, noMail ? [user, passwd, user_token] : [mail], async (err, results) => {
    if(err){ 
      logger.log({
        level: 'error',
        message: `loginUser error=${err.message} user=${user}`
      });
      throw err
    }
    
    if(results[0]['COUNT(id)'] > 0){
      req.session.userId = results[0]['id'];
      req.session.intezmenyId = results[0]['IntezmenyId']
      activeSessions.add(req.sessionID)
      /*console.log("bejelentkezett user count: ")*/
      sessionCounter()
    }
     logger.log({
        level: 'info',
        message: `User ${user} login attempted..`
      });
    res.set('Content-Type', 'application/json', 'charset=utf-8');
    res.send(JSON.stringify({ 'db': results[0]['COUNT(id)'], 'UserToken':results[0]["UserToken"]}));
    res.end();
  })
})

app.post("/sendMailTo", (req, res) => { //PR  //email
  

  var email = req.body.email;
   if (!isEmail(email)) {
    return res.send(JSON.stringify({ error: 'invalid input' }));
  }

  logger.log({
    level: 'info',
    message: "Sending mail to "+email,
  })
    sendMail(email);
    res.end();
})
//#endregion




/* -------------------------------------- - homepage.html - ---------------------------------------- */



async function refreshAccessTokenIfNeeded(user) {//RD, ha lejárt az accesstoken akkor egy új készül
  var client = createOAuthClient();
  client.setCredentials({
    access_token: user.AccessToken,
    refresh_token: user.RefreshToken,
    expiry_date: user.AccessEletTartam,
  });
  // token frissitése automatikusan
  if (Date.now() >= user.AccessEletTartam) {
    const newTokens = await client.refreshAccessToken();
    const { access_token, expiry_date } = newTokens.credentials;

    // adatbázis frissítés
    await queryAsync(
      `UPDATE Users SET AccessToken=?, AccessEletTartam=FROM_UNIXTIME((? + 3600000)/1000) WHERE id=?`, //időzóna cucc
      [access_token, expiry_date, user.id]
    );

    return { access_token: access_token, expiry_date: expiry_date };
  }

  return { access_token: user.AccessToken, expiry_date: user.AccessEletTartam };
}



function getUtolsoId() { //BBB?
  conn.query("SELECT MAX(id) AS maxId FROM Feladatok", (err, results) => {
    if (err) throw err;
    
    feladat_utolso_id = results[0].maxId; 
  });
}
getUtolsoId()


async function getUserDataFromSessionId (id){ //RD a user összes adata a sessionId segítségével
  const results = await queryAsync(`SELECT * FROM Users WHERE id=?`, [id])
  return results[0]
}




app.post("/updatePassword" , (req, res) => { //PR, jelszó reset esetén jelszó frissítése az adatbázisban
  logger.log({
    level: 'info',
    message: logFormat("Password reset requested", "POST", req.ip),
  })

  var email = req.body.email;
  var newPasswd = req.body.password;

  if (!isEmail(email) || !isNonEmptyString(newPasswd)) {
    return res.send(JSON.stringify({ error: 'invalid input' }));
  }

  let sql = `UPDATE Users SET Jelszo = MD5(?) WHERE Email = ?`;
  conn.query(sql, [newPasswd, email], (err, results) => {
    
    if(err){
      logger.log({
        level: 'debug',
        message: `update_password error=${err.message} email=${email}`
      });
    }
    res.send(JSON.stringify({ "dataset":results } ))
    res.end();
  })

  naplozz(`update_password email=${email}`, 0)
});

app.post("/GetUserData", async (req, res) => { //PR, az összes felhasználó fontos adatai, 
  

  if(req.session.userId == undefined) {req.session.userId = (await queryAsync('select id from Users where UserToken = ?', [req.body.UserToken]))[0].id;}
  if(req.session.intezmenyId == undefined) {req.session.intezmenyId = (await queryAsync('select IntezmenyId from Users where UserToken = ?', [req.body.UserToken]))[0].IntezmenyId;}

  logger.log({
    level: 'debug',
    message: logFormat("User has logged in", "POST", req.ip),
  })

  const results = await getUserDataFromSessionId(req.session.userId)
  
  res.set('Content-Type', 'application/json', 'charset=utf-8');
  res.send(JSON.stringify({ "dataset":results } ))
  res.end();
  
})

app.post("/changeJog", (req, res)=> { //PR, jog változtatása

  const id = req.body.id
  const mire = req.body.mire
  var sql = `UPDATE Users SET Jogosultsag = '${mire}' WHERE id = ${id}`
  conn.query(sql, (err, results) => {
    
    if(err){
      logger.log({
        level: 'error',
        message: `/changeJog error=${err.message}`
      });
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }
    res.send(JSON.stringify({ success: true }));
  })
})

app.post("/getUserCount", (req, res) =>{ //RD, a limit offset miatt a felhasználók száma
  
  const intezmeny = req.session.intezmenyId
  const kereso = req.body.kereso
  var where = ""
  if (kereso != "") where = ` AND LOWER(Users.Nev) COLLATE utf8mb4_bin LIKE '%${kereso}%'`
  
  var sql = `SELECT COUNT(Users.id) AS tanarDb
              FROM Users
              WHERE NOT Jogosultsag = 'Mailsender' and not Jogosultsag = 'Főadmin' ${req.session.userId != '2' ? `AND IntezmenyId = ${intezmeny}` : ''}${where}`
              
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/getUserCount error=${err.message}`
      });
    }
  
    if(results == null) res.send(JSON.stringify({"results":{}} ))
    else res.send(JSON.stringify({"db":results[0]["tanarDb"]} ))
    res.end();
  })
})

app.post("/megosztottFeladatokData", (req, res) =>{ //RD, statok
  const felhId = req.body.felhId
  var sql = `SELECT Users.Nev, COUNT(Users.nev) AS Darabszam
              FROM Users INNER JOIN Megosztott ON Megosztott.VevoId = Users.id
              WHERE Megosztott.FeladoId = ${felhId}
              GROUP BY Users.id, Users.Nev
              ORDER BY 2`

  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/megosztottFeladatokData error=${err.message}`
      });
    }

    if(results == null) res.send(JSON.stringify({"results":{}} ))
    else res.send(JSON.stringify({"results": results} ))
    res.end();
  })
})

app.post("/kozzetettFeladatokData", (req, res) =>{ //RD, statok
  const felhId = req.body.felhId
  var sql = `SELECT kurzusNev, COUNT(Kozzetett.id) AS Darabszam
              FROM Users INNER JOIN Kozzetett ON Kozzetett.Tanar = Users.id
              WHERE Users.id = ${felhId}
              GROUP BY Kozzetett.kurzusNev, Kozzetett.kurzusId
              ORDER BY 2`

  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/megosztottFeladatokData error=${err.message}`
      });
    }
    
    if(results == null) res.send(JSON.stringify({"results":{}} ))
    else res.send(JSON.stringify({"results": results} ))
    res.end();
  })
})

app.post("/generalFeladatokData", (req, res) =>{ //RD, statok
  

  const felhId = req.body.felhId
  var sql = `SELECT Users.Nev,
              COUNT(DISTINCT Feladatok.id) AS FeladatDB,
              COUNT(DISTINCT Kozzetett.id) AS KozzetettDB,
              COUNT(DISTINCT Megosztott.id) AS MegosztottDB
              FROM Users
                LEFT JOIN Feladatok ON Feladatok.Tanar = Users.id
                LEFT JOIN Kozzetett ON Kozzetett.Tanar = Users.id
                LEFT JOIN Megosztott ON Megosztott.FeladoId = Users.id
              WHERE Users.id = ${felhId}` 
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/generalFeladatokData error=${err.message}`
      });
    }
  
      if(results == null) res.send(JSON.stringify({"results":{}} ))
      else res.send(JSON.stringify({"FeladatDB":results[0]["FeladatDB"], "KozzetettDB":results[0]["KozzetettDB"], "MegosztottDB":results[0]["MegosztottDB"]} ))
      res.end();
    })
})

app.post("/averageNehezsegData", (req, res) =>{ //RD, statok
  const felhId = req.body.felhId
  var sql = `SELECT kurzusNev, ROUND((SUM(Nehezseg)/COUNT(Nehezseg)), 2) AS atlagNehezseg
              FROM Feladatok INNER JOIN Kozzetett ON Kozzetett.FeladatId = Feladatok.id
              WHERE Feladatok.Tanar = ${felhId}
              GROUP BY Kozzetett.kurzusNev, Kozzetett.kurzusId`
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/averageNehezsegData error=${err.message}`
      });
    }
  
      if(results == null) res.send(JSON.stringify({"results":{}} ))
      else res.send(JSON.stringify({"results":results} ))
      res.end();
    })
})

app.post("/evfolyamArchivaltData", (req, res) =>{ //RD, statok
  const felhId = req.body.felhId
  var sql = `SELECT Evfolyam,
                SUM(CASE WHEN Archivalva = 1 THEN 1 ELSE 0 END) AS ArchDB,
                SUM(CASE WHEN Archivalva = 0 THEN 1 ELSE 0 END) AS SimaDB
              FROM Feladatok
              WHERE Tanar = ${felhId}
              GROUP BY Evfolyam
              ORDER BY Evfolyam`
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/evfolyamArchivaltData error=${err.message}`
      });
    }
      if(results == null) res.send(JSON.stringify({"results":{}} ))
      else res.send(JSON.stringify({"results":results} ))
      res.end();
    })
    
})

app.post("/topHaromTanarData", (req, res) =>{ //RD, statok
  const intezmeny = req.session.intezmenyId 
  var sql = `SELECT Users.Nev, COUNT(Feladatok.id) AS FeladatDb
              FROM Feladatok RIGHT JOIN Users ON Users.id = Feladatok.Tanar
              WHERE Users.IntezmenyId = ${intezmeny}
              GROUP BY Users.id, Users.Nev
              ORDER BY FeladatDb DESC
              LIMIT 3`
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/topHaromTanarData error=${err.message}`
      });
    }

      if(results == null) res.send(JSON.stringify({"results":{}} ))
      else res.send(JSON.stringify({"results":results} ))
      res.end();
    })
})


app.post("/SendUsers", (req, res) =>{ //RD //felhasználók kiszedése(frontenden megjelenítjük)
  
  
  const limit = req.body.limit
  const offset = req.body.offset
  const userId = req.session.userId
  const intezmeny = req.session.intezmenyId
  const kereso = req.body.kereso
  var limitoffset = ` LIMIT ${limit} OFFSET ${offset}`
  var where = ""
  if (kereso != "") where = ` HAVING LOWER(Users.Nev) COLLATE utf8mb4_bin LIKE '%${kereso}%'`
  var sql = `SELECT Users.id, Users.Nev, Users.Email, Users.Jogosultsag, Users.HatterSzin
              FROM Users
              WHERE NOT Jogosultsag = 'Mailsender' and not Jogosultsag = 'Főadmin' ${userId != '2' ? `AND IntezmenyId = ${intezmeny}` : ''} 
              GROUP BY Users.id, Users.Nev ${where}${limitoffset}`
              
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/SendUsers error=${err.message}`
      });
    }

    logger.log({
      level: 'info',
      message: logFormat("All user data extracterd for display", "POST", req.ip),
    })
  
      if(results == null) res.send(JSON.stringify({"results":{}} ))
      else res.send(JSON.stringify({"results":results} ))
      res.end();
    })
})

//Feladatok küldése homepage.html-nek
app.post("/SendFeladatok", (req, res) =>{ //RD, BBB, PR
  var sql;
  const tanarId = req.body.tanarId
  const oldal   = req.body.oldal ? parseInt(req.body.oldal) : 0; // alapból csak az archiválatlan feladatokat kéri le

  const evfolyamSz = req.body.evfolyam ?? ''
  const tantargySz = req.body.tantargy ?? ''
  const nehezsegSz = req.body.nehezseg ?? ''
  const tanarSz    = req.body.tanar    ?? ''
  const keresoSz   = req.body.kereso   ?? ''

  const rendezesTema = req.body.tema  ?? ''
  const rendezesFajta = req.body.desc ?? ''

  const limit = req.body.limit
  const offset = req.body.offset
  

  var where = ""
  var order = ""
  var injection = []
  var limitSql = ` LIMIT ${limit}`
  var offsetSql = ` OFFSET ${offset}`

  if (rendezesTema != "" && rendezesFajta != ""){
    order += ` ORDER BY ${rendezesTema == 'id' ? 'Feladatok.id' : rendezesTema} ${rendezesFajta == 0 ? "" : "DESC"}`
  }
  if (evfolyamSz != ""){
    where += ` AND Evfolyam = ${evfolyamSz}`
  }
  if(tantargySz != ""){
    where += ` AND Tantargy = ?`
    injection.push(tantargySz)
  }
  if(nehezsegSz != ""){
    const nehezsegSzuroMin = (nehezsegSz == "konnyu" ? 1 : nehezsegSz == "kozepes" ? 4 : 8)
    const nehezsegSzuroMax = (nehezsegSz == "konnyu" ? 3 : nehezsegSz == "kozepes" ? 7 : 10)
    where += ` AND Nehezseg >= ${nehezsegSzuroMin} AND Nehezseg <= ${nehezsegSzuroMax}`
  }
  if (tanarSz != ''){
    where += ' AND Megosztott.FeladoId = '+ tanarSz
  }

  if (keresoSz != ''){
    where += ` AND LOWER(Feladatok.Nev) COLLATE utf8mb4_bin LIKE ?`
    injection.push(`%${keresoSz}%`)
  }


  if (!isPositiveInt(tanarId) && !isPositiveInt(oldal)) {
    return res.send(JSON.stringify({ error: 'invalid input' }));
  }

  sql = "SELECT Feladatok.id as id, Feladatok.Nev, Feladatok.Leiras, Feladatok.Evfolyam, Feladatok.Tantargy, Feladatok.Tema, Feladatok.Nehezseg, (SELECT COUNT(Alfeladat.id) FROM Alfeladat WHERE FeladatId = Feladatok.id) AS alfDb"

  if(oldal == 2 || oldal == 3){// Megosztott (velem vagy általam)
    sql += ` , Users.Nev AS Felhasznalo, Users.HatterSzin AS FelhasznaloColor
              FROM Megosztott 
              INNER JOIN Feladatok ON Feladatok.id = Megosztott.FeladatId
              INNER JOIN Users ON Megosztott.${oldal == 2 ? 'FeladoId' : 'VevoId'} = Users.id
              WHERE Megosztott.${oldal == 2 ? 'VevoId' : 'FeladoId'} = ?${where}${order}${limitSql}${offsetSql}`
      injection.unshift(tanarId)
  }
  else{ // Saját (archivált vagy nem archivált)
      sql += ` FROM Feladatok WHERE Archivalva = ? AND Tanar = ?${where}${order}${limitSql}${offsetSql}`
      injection.unshift(tanarId)
      injection.unshift(oldal)
  }

  /*console.log(sql, injection)*/
  conn.query(sql, injection, (err, results) => {
  if(err){
    logger.log({
      level: 'error',
      message: `/SendFeladatok error=${err.message} clientId=${clientId}`
    });
  }
    /*logger.log({
      level: 'debug',
      message: `/SendFeladatok results=`
    });*/

    /*logger.log({ level: 'debug', message: results})*/

    if(results == null) res.send(JSON.stringify({"results":{}} ))
    else res.send(JSON.stringify({"results":results} ))
    res.end();
  })
})

async function fajlInfo(fajlId) { //BBB
  try {
    const results = await queryAsync("SELECT AlapNev, Meret, BackendNev FROM Fajl WHERE id = ?", [fajlId]);
    if (!results || results.length === 0) {
      logger.log({
        level: 'debug',
        message: `(/fajlInfo) nincs ilyen fájl id: ${fajlId}`
      });
      return null;
    }

    return {
      "nev": results[0]["AlapNev"],
      "meret": results[0]["Meret"],
      "link": "/letolt-fajl/" + fajlId,
      "identifier": fajlId
    };
  } catch (err) {
    logger.log({
      level: 'error',
      message: `(/fajlInfo) error=${err.message} fajlId=${fajlId}`
    });
    return null;
  }
}

app.post("/SendAlFeladatok",  (req, res) => {//RD, BBB

  var feladatId = req.body.feladatId ? parseInt(req.body.feladatId) : null;
  if (!isPositiveInt(feladatId)) {
    res.end(); return
  }
  
  var sql = `SELECT * FROM Alfeladat WHERE FeladatId = ${feladatId}`

  conn.query(sql, async (err, results) => {
    /*console.log(results)*/
    if(err || !results || results.length == 0){
      logger.log({
        level: 'error',
        message: `(/SendAlFeladatok) error=${err ? err : "no results"} feladatId=${feladatId}`
      });
      return res.status(404).end()
    }
      
      for (const alfeladat of results) {
        alfeladat["FajlInfo"] = await fajlInfo(alfeladat["FajlId"]); 
      };

      res.send(JSON.stringify({"results":results} ))
      res.end();
    })
})

//update user data
app.post("/updateUserdata", (req, res) => { //RD
  

  var usertoken = req.body.userToken
  var newNev = req.body.newNev
  var newEmail = req.body.newEmail

if (!isEmail(newEmail) || !isNonEmptyString(newNev)) {
    return res.send(JSON.stringify({ success: false, error: 'invalid input' }));
  }

  let sql = `UPDATE Users SET Nev = ?, Email = ? WHERE UserToken = '${usertoken}'`
  conn.query(sql, [newNev, newEmail], (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `(/updateUserdata) error=${err.message} userToken=${usertoken}`
      });
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }

    logger.log({
      level: 'info',
      message: logFormat("Userdata updated", "POST", req.ip),
    })
    res.send(JSON.stringify({ success: true }))
  })
})

app.post("/deleteUser", (req, res) => { //PR, BBB
  var tanarId = parseInt(req.body.id); 
  let sql = "SELECT id FROM Feladatok WHERE Tanar=?";

  conn.query(sql, [tanarId], (err, results) => {
    if (err){
      logger.log({
        level: 'error',
        message: `(/deleteUser) error=${err.message} tanarId=${tanarId}`
      });
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }
    
    adat = {"ids":results};

    adat["ids"].forEach((id, _) => {
      conn.query("DELETE FROM Megosztott WHERE FeladatId=?", [id["id"]])
      conn.query("DELETE FROM Alfeladat WHERE FeladatId=?", [id["id"]])
      conn.query("DELETE FROM Feladatok WHERE id=?", [id["id"]])
    })

    conn.query("DELETE FROM Users WHERE id=?", [tanarId])
    
    logger.log({
      level: 'info',
      message: logFormat(`User (id=${tanarId}) and their tasks were successfully deleted`, "POST", req.ip),
    })

    res.send(JSON.stringify({ success: true }))
  })
})

app.post("/feladatTorol", (req, res) => { //BBB

  const id = req.body.id
  conn.query("DELETE FROM Megosztott WHERE FeladatId=?", [id])
  conn.query("DELETE FROM Alfeladat WHERE FeladatId=?", [id])
  conn.query("DELETE FROM Feladatok WHERE id=?", [id])
  res.end();
})

app.post("/get-last-id", (req, res) => {// BBB
  res.send({ "id": feladat_utolso_id }).end()
})

app.post("/ment-fajl", upload.single('fajl'), async (req, res) => { // BBB 
  const file = req.file;

  let sql = "INSERT INTO Fajl (Meret, BackendNev, AlapNev) VALUES (?, ?, ?)"

  conn.query(sql, [file.size, file.filename, file.originalname], (err, results) => {
    if (err) {
      logger.log({
        level: 'error',
        message: `(/ment-fajl) error=${err.message}`
      });

      throw err;
    }

    /*console.log(results)*/
    let id = results.insertId;
    res.json({ id }).end();
  });  
});

app.post("/ment-feladat", (req, res) => { //BBB
    // full json alapú, azt mondta a tanár és a chatgpt is hogy így jobb
    const adat = req.body
    const isInsert = adat["isInsert"]
    let sql = "";
    if(isInsert == 1){
      sql += `INSERT INTO Feladatok(Nev, Leiras, Evfolyam, Tantargy, Tema, Nehezseg, Tanar, Archivalva)
              VALUES(?, ?, ?, ?, ?, ?, ?, 0)`
    }
    else{
      sql += `UPDATE Feladatok SET Nev = ?, Leiras = ?, Evfolyam = ?, Tantargy = ?, Tema = ?, Nehezseg = ?, Tanar = ?
              WHERE id = ${adat["id"]}`
    }
    conn.query(sql, [adat["Nev"], adat["Leiras"], adat["Evfolyam"], adat["Tantargy"], adat["Tema"], adat["Nehezseg"], adat["tanarId"]], (err, results) => {
      if (err) { 
        logger.log({
          level: 'error',
          message: `(/ment-feladat) error=${err.message}`
        });
        vanEHiba = true;
        throw err; 
      }

      feladat_utolso_id = results.insertId
    });

    
    adat["alfeladatok"].forEach(alfeladat => {
      let fajlId = alfeladat["fajlId"]; 

      let insert = !alfeladat["alfId"] // na nem kaptunk id-t akkor ez egy új alfeladat
      let delte = alfeladat["isDelete"] == true
      /*console.log(adat["id"])*/
      /*console.log(feladat_utolso_id + 1)*/

      let sql = "";
      if      (insert)           sql = `INSERT INTO Alfeladat (Leiras, FeladatId, FajlId, Pont) VALUES(?, ?, ?, ?)`
      else if (delte)            sql = `DELETE FROM Alfeladat WHERE id=${alfeladat["alfId"]}`
      else                                    sql = `UPDATE Alfeladat SET Leiras = ?, FeladatId = ?, FajlId = ?, Pont = ?
                                                      WHERE id = ${alfeladat["alfId"]}`
          
      conn.query(sql, !delte ? [alfeladat["leiras"],  (adat["id"] ? adat["id"] : (feladat_utolso_id + 1)),
                      fajlId, alfeladat["pontszam"]] : [], (err, results) => { 
        if (err) { 
          logger.log({
            level: 'error',
            message: `(/ment-feladat) error=${err.message}`
          });
          vanEHiba = true;
          throw err;  
        }
      });
    });
    res.send({ "id": feladat_utolso_id }).status(200).end()
});



//classroom feladat közzététel
var classroom;

async function classroomGetCourses(userid){ //PR, RD, classroom kurzusok kiszedése
  var results = await getUserDataFromSessionId(userid)
  
  var AccessToken= results.AccessToken;
  var RefreshToken= results.RefreshToken; 
  var AccessEletTartam= new Date(results.AccessEletTartam).getTime()

  const user = {
    id: userid,
    AccessToken: AccessToken,
    RefreshToken: RefreshToken,
    AccessEletTartam: AccessEletTartam
  }
  var temp = await refreshAccessTokenIfNeeded(user)
  
  AccessToken = temp.access_token;
  AccessEletTartam = temp.expiry_date;
  
  const client = createClientUsingCredentials(AccessToken, RefreshToken, AccessEletTartam)
  
  classroom = await google.classroom({ version:"v1", auth: client}); 
  drive = await google.drive({ version: 'v3', auth: client });// create authenticated drive client
  const courses = await classroom.courses.list({ teacherId: "me"}); //nincs token frissitve
  
  return courses.data.courses
}

app.post("/sendClassroomCourses", async (req, res) =>{ //RD, kiszedett kurzusok átküldése

  var userid = req.session.userId
  try {
    const courses = await classroomGetCourses(userid);
    
    const idk = []
    const nevek = []
    const hasznalhatok = courses ? courses.filter(a => a.courseState != 'ARCHIVED') : ""
    if(hasznalhatok.length > 0) {
      for (const alma of hasznalhatok) {
        nevek.push(alma.name)
        idk.push(alma.id)
      }

      logger.log({
          level: 'debug',
          message: `Courses extracted (userid=${userid})`
        });
      res.set('Content-Type', 'application/json', 'charset=utf-8');
      res.send(JSON.stringify({ "nevek":nevek, "idk":idk } ))
    } 
    else {
      logger.log({
        level: 'debug',
        message: `No usable courses found (userid=${userid})`
      });
      res.send(JSON.stringify({  }));
    }
    res.end();
  }
  catch (e) {
    logger.log({
      level: 'error',
      message: `/sendClassroomCourses error=${e.message} userid=${userid}`
    });
    res.end()
  }

})

async function fajlFeltoltClassroom (fajlId) {//BBB?

  let ext, asd;
  let dbres = await queryAsync("SELECT BackendNev, AlapNev FROM Fajl WHERE id = ?", [fajlId]);
  
  const fileMetadata = {
    name: dbres[0]["AlapNev"],
  };

  ext = path.extname(dbres[0]["AlapNev"]);
  asd = path.join(__dirname, "uploads", dbres[0]["BackendNev"]);
  
  const media = {
    mimeType: mime.lookup(ext) || 'application/octet-stream',
    body: fs.createReadStream(asd),
  }

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  })

  return res.data.id;
}

app.post("/saveClassroomFeladatKozzetett", (req, res) =>{ //RD adatbázisba a közzétett feladatok tárolása(csak naplózásra szolgál)

  const feladatId = req.body.feladatid
  const kurzusNev = req.body.kurzusNev
  const kurzusId = req.body.kurzusId
  const kurzusFeladatId = req.body.kurzusFeladatId
  const Tanar = req.session.userId
  var sql = `INSERT INTO Kozzetett (FeladatId, Tanar, kurzusNev, kurzusId, kurzusFeladatId) VALUES(?, ?, ?, ?, ?)`
  conn.query(sql, [feladatId, Tanar, kurzusNev, kurzusId, kurzusFeladatId], (err, results) => {
    if (err) { 
      logger.log({
        level: 'error',
        message: `(/saveClassroomFeladatKozzetett) error=${err.message}`
      });
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }
    res.send(JSON.stringify({ success: true }))
  });
})

app.post("/postClassroomFeladat", async (req, res) =>{ //RD, PR classroom feladat létrehozása adott kurzusba(összeállítása)
  

  kurzusId = req.body.kurzusid
  feladatId = req.body.feladatid
  dueDate = req.body.dueDate
  dueTime = req.body.dueTime
  tanulok = req.body.tanulok
  let sql = `SELECT Feladatok.Nev, Feladatok.Leiras AS feladatLeiras, Feladatok.Tema, Feladatok.Nehezseg, 
              (SELECT sum(Pont) FROM Alfeladat WHERE FeladatId = ${feladatId}) AS maxPont, 
              Alfeladat.id, Alfeladat.Leiras, Alfeladat.Pont, Alfeladat.FajlId
            FROM Feladatok left JOIN Alfeladat ON Feladatok.id = Alfeladat.FeladatId 
            WHERE Feladatok.id = ${feladatId}`; 
  conn.query(sql, async (err, results) => {
    if (err){
      logger.log({
        level: 'error',
        message: `(/postClassroomFeladat) error=${err.message}`
      });
      throw err;
    }

    var nev = results[0]["Nev"];
    var feladatLeiras = results[0]["feladatLeiras"];
    var tema = results[0]["Tema"];
    var nehezseg = results[0]["Nehezseg"];
    var maxPont = results[0]["maxPont"]
    //var title = `${tema} - ${nev}`;
    var description =  `Téma: ${tema}
                        Feladat: ${nev}
                        Nehézség: ${nehezseg}/10
                        Max pont: ${maxPont}\n
                        
                        Leírás: \n${feladatLeiras}\n\n`
    var year =    dueDate == '' ? null : dueDate.split("-")[0];
    var month =   dueDate == '' ? null : dueDate.split("-")[1];
    var day =     dueDate == '' ? null : dueDate.split("-")[2];
    var hours =   dueTime == '' ? null : parseInt(dueTime.split(":")[0]) - 1; //időzóna
    var minutes = dueTime == '' ? null : dueTime.split(":")[1];
    
    fajlIds = []
    
    for (let i = 0; i < results.length; i++) {
      var leiras = results[i]["Leiras"];
      var pont = results[i]["Pont"];
      if (results[i]["FajlId"]){
        var id = await fajlFeltoltClassroom(results[i]["FajlId"])
        fajlIds.push(id);
      }
      if(pont != null && leiras != null)
        if (!description.includes('Alfeladatok:')) description += "Alfeladatok:\n"
        description += `${i+1}) (${pont} pont) ${leiras}\n\n`
    }
    
    var temp = await createClassroomTask(nev, description, maxPont, year, month, day, hours, minutes, kurzusId, fajlIds, tanulok)
    res.send(JSON.stringify({ "courseWorkId":temp } ))
    res.end();
  });
})

async function biztosFileShare(fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone" 
    }
  });
}

async function createClassroomTask(title, description, maxPoints, year, month, day, hours, minutes, courseid, fajlIds, tanulok){ //RD, classroom feladat létrehozása adott kurzusba(feltöltése)
 
  const materials = fajlIds.map(fajlId => ({
    driveFile: {
      driveFile: {
        id: fajlId
      },
      shareMode: "VIEW"
    }
  }));
  tanulok = String(tanulok || "")
  .split(",")
  .map(s => s.trim())
  .filter(s => s.length > 0);
  var tobbTanulo = tanulok.length > 0 && tanulok.lenght != undefined
  
  feladatData ={
    title,
    description,
    workType: "ASSIGNMENT",
    state: "PUBLISHED",
    maxPoints,
     ...(tobbTanulo
        ? { assigneeMode: "INDIVIDUAL_STUDENTS", individualStudentsOptions: { studentIds: tanulok } }
        : { assigneeMode: "ALL_STUDENTS" }),
    ... (materials ? {materials} : { }),
    ...(year != null ? { dueDate: { year, month, day } } : {}),
    ...(hours != null ? { dueTime: { hours, minutes } } : {}),
  }
  
  
  try {
    const res = await classroom.courses.courseWork.create({
      courseId: courseid, //kurzus id teszt
      requestBody: feladatData
    });
    const courseWorkId = res.data.id
    logger.log({
      level: 'debug',
      message: `createClassroomTask: feladat közzétéve courseId=${courseid} courseWorkId=${res.data.id}`
    })

    return courseWorkId;
  }
  catch (error){
    logger.log({
      level: 'error',
      message: `createClassroomTask error=${error.message} courseId=${courseid}`
    })

    throw error;
  }
}

app.post("/removeClassroomFeladat", async (req, res) =>{ //RD, eltávolítás(nem használjuk, túl sok lehetőség user error-ra)

  const kurzusId = req.body.kurzusId
  const kurzusFeladatId = req.body.kurzusFeladatId

  await classroom.courses.courseWork.delete({
    courseId: kurzusId,
    id: kurzusFeladatId
  });

  let sql = `DELETE FROM Kozzetett WHERE kurzusFeladatId = ${kurzusFeladatId}`
  conn.query(sql, (err, results) => {
    if (err){
      logger.log({
        level: 'error',
        message: `(/removeClassroomFeladat) error=${err.message}`
      });
      logger.log({
        level: 'info',
        message: logFormat("Task removed from classroom", "POST", req.ip),
      })
      throw err;
    }
    res.end()
  })
})

app.post("/feladatArchivalas", (req, res) =>{ //PR

  var id = req.body.id;
  var state = req.body.state;
  console.log(`archivalt feladat id${id}`)
  console.log(`archivalt state${state}}`)
  let sql = `UPDATE Feladatok SET Archivalva = ${state} WHERE id = `+id ;
  conn.query(sql, (err, results) => {
    if (err){
      logger.log({
        level: 'error',
        message: `(/feladatArchivalas) error=${err.message} id=${id}`
      });
      throw err;
    }

    res.end()
  })
})

app.post("/autocompleteArrayTolt", (req, res) =>{ //RD, a suggestion alapú inputok adatai

  const userId = req.session.userId
  const intezmeny = req.session.intezmenyId
  let sql = `SELECT Nev, Email FROM Users WHERE (Jogosultsag = 'Tanár' OR Jogosultsag = 'Admin') AND NOT id = ${userId} AND IntezmenyId = ${intezmeny}`
  conn.query(sql, (err, results) =>{
    if(err){
      logger.log({
        level: 'error',
        message: `(/autocompleteArrayTolt) error=${err.message} userId=${userId}`
      })

      throw err;
    }
    res.send(JSON.stringify({ "results":results } ))
    res.end();
  })
})

async function MegosztottFeladatAlreadyExists(cimzett, feladatId, felado){
  let sql = `SELECT COUNT(id) AS db FROM Megosztott WHERE FeladoID = ${felado} AND FeladatId = ${feladatId} AND (SELECT id FROM Users WHERE Email = '${cimzett}' OR Nev = '${cimzett}')`
  var c = await queryAsync(sql)
  console.log(c)
  console.log(c[0].db)
  return c[0].db

}

app.post("/FeladatMegosztasaTanarral", async (req, res) =>{ //RD, tanárok közötti feladat megosztás 

  const cimzett = req.body.cimzett
  const feladatId = req.body.feladatId
  const felado = req.session.userId
  var dbszam = await MegosztottFeladatAlreadyExists(cimzett, feladatId, felado)
  console.log("db létező feladat: " + dbszam)
  if (dbszam > 0){
    res.status(404)
    res.end()
    return
  }

  let sql = `INSERT INTO Megosztott(FeladatId, FeladoId, VevoId)
            VALUES(?, ?, (SELECT id FROM Users WHERE Email = ? OR Nev = ?))`

  conn.query(sql, [feladatId, felado, cimzett, cimzett], (err, results) => {
    if (err) { 
      logger.log({
        level: 'error',
        message: `(/FeladatMegosztasaTanarral) error=${err.message} feladatId=${feladatId} felado=${felado} cimzett=${cimzett}`
      })
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }
    
    logger.log({
      level: 'debug',
      message: `(/FeladatMegosztasaTanarral) Feladat megosztva feladatId=${feladatId} felado=${felado} cimzett=${cimzett}`
    });

    res.send(JSON.stringify({ success: true }));
  });
})

app.post("/getTantargyForAuto", (req, res) =>{//RD, autocomplete/suggestion cucc

  /*SELECT Tantargy FROM Megosztott INNER JOIN Feladatok ON Feladatok.id = Megosztott.FeladatId
WHERE Megosztott.VevoId = 164
GROUP BY Tantargy*/
  const userId = req.session.userId
  const megosztott = req.body.megosztott
  var tabla = megosztott ? `FROM Megosztott INNER JOIN Feladatok ON Feladatok.id = Megosztott.FeladatId
    WHERE Megosztott.VevoId = ${userId}` : `FROM Feladatok WHERE Tanar = ${userId}`
  
  let sql = `SELECT Tantargy ${tabla} GROUP BY Tantargy`
  
  conn.query(sql, (err, results) => {
    if (err) { 
      logger.log({
        level: 'error',
        message: `(/getTantargyForAuto) error=${err.message} userId=${userId}`
      })
      throw err;  
    }
   
    res.send(JSON.stringify({ "results":results } ))
    res.end()
  });
})

app.post('/megosztasVisszavon', (req, res) => {
  const feladatId = req.body.id
  const vevo = req.body.vevo

  let sql = `DELETE FROM Megosztott where id 
            IN(select Megosztott.id FROM Megosztott INNER JOIN Users ON Megosztott.VevoId = Users.id
            WHERE	Users.Nev = ? AND Megosztott.FeladatId = ?)`

  queryAsync(sql, [vevo, feladatId])
  res.send(JSON.stringify({ success: true }))
})

app.post("/getTanarForAuto", (req, res) =>{//RD, autocomplete/suggestion cucc

  const userId = req.session.userId
  const vevo = req.body.vevoId
  
  let sql = `SELECT Users.id, Users.Nev
              FROM Megosztott 
              INNER JOIN Users ON Megosztott.FeladoId = Users.id WHERE VevoId = ${vevo}
              GROUP BY Users.id`

  /*console.log(sql)*/
  conn.query(sql, (err, results) => {
    if (err) { 
      logger.log({
        level: 'error',
        message: `(/getTanarForAuto) error=${err.message} userId=${userId}`
      })
      throw err;  
    }
   
    res.send(JSON.stringify({ "results":results } ))
    res.end()
  });
})

app.post("/getFeladatNumber", (req, res) =>{//RD limit, offset miatt kell, a feladatok számát adja meg

  var sql;
  const vevoId = req.session.userId
  
  const userId = req.body.tanarId
  const oldal   = req.body.oldal ? parseInt(req.body.oldal) : 0; // alapból csak az archiválatlan feladatokat kéri le

  const evfolyamSz = req.body.evfolyam ?? ''
  const tantargySz = req.body.tantargy ?? ''
  const nehezsegSz = req.body.nehezseg ?? ''
  const tanarSz    = req.body.tanar    ?? ''
  const keresoSz   = req.body.kereso   ?? ''


  var where = ""
  var injection = []

  if (evfolyamSz != ""){
    where += ` AND Evfolyam = ${evfolyamSz}`
  }
  if(tantargySz != ""){
    where += ` AND Tantargy = ?`
    injection.push(tantargySz)
  }
  if(nehezsegSz != ""){
    const nehezsegSzuroMin = (nehezsegSz == "konnyu" ? 1 : nehezsegSz == "kozepes" ? 4 : 8)
    const nehezsegSzuroMax = (nehezsegSz == "konnyu" ? 3 : nehezsegSz == "kozepes" ? 7 : 10)
    where += ` AND Nehezseg >= ${nehezsegSzuroMin} AND Nehezseg <= ${nehezsegSzuroMax}`
  }
  if (tanarSz != ''){
    where += ' AND Megosztott.FeladoId = ?'
    injection.push(tanarSz)
  }

  if (keresoSz != ''){
    where += ` AND LOWER(Feladatok.Nev) COLLATE utf8mb4_bin LIKE  ?`
    injection.push(`%${keresoSz}%`)
  }


  if (!isPositiveInt(userId) && !isPositiveInt(oldal)) {
    return res.send(JSON.stringify({ error: 'invalid input' }));
  }


  try{

    if(oldal == 2 || oldal == 3){ //  Megosztott
        sql = `SELECT count(Megosztott.id) as db FROM Feladatok INNER JOIN Megosztott ON Megosztott.FeladatId = Feladatok.id WHERE ${oldal == 2 ? 'VevoId' : 'FeladoId'} = ? ${where}`
        injection.unshift(userId)
    }
      else{ // Saját 
        sql = `SELECT count(id) as db FROM Feladatok WHERE Archivalva = ? AND Tanar = ?${where}`
        injection.unshift(userId)
        injection.unshift(oldal)
    }
 /*console.log(sql, injection)*/
    conn.query(sql, injection, (err, results) => {
      if (err) { 
        logger.log({
          level: 'error',
          message: `(/getFeladatNumber) error=${err.message} userId=${userId} clientId=${clientId}`
        })
        throw err;  
      }
  
      res.send(JSON.stringify({ "db":results[0]["db"] } ))
      res.end()
    })
  }
  catch(err){
    /*console.log("tsundere kód "+err)*/
  }
  
})

app.post("/getStudentList", async (req, res) =>{ //RD a classroom kurzusokban szereplő tanulók listája, lehetőség hogy a tanárok külön diákoknak tegyenek közzé feladatokat
  
  var kurzusId = req.body.kurzusId
  var userId = req.session.userId
  results = await getUserDataFromSessionId(userId)
  var AccessToken= results["AccessToken"];
  var RefreshToken= results["RefreshToken"]; 
  var AccessEletTartam= new Date(results["AccessEletTartam"]).getTime()

  const user = {
    id: userId,
    AccessToken: AccessToken,
    RefreshToken: RefreshToken,
    AccessEletTartam: AccessEletTartam
  }
  var temp = await refreshAccessTokenIfNeeded(user)
  
  AccessToken = temp.access_token;
  AccessEletTartam = temp.expiry_date;
  
  const client = createClientUsingCredentials(AccessToken, RefreshToken, AccessEletTartam)
  classroom = await google.classroom({ version:"v1", auth: client})
  var diakok = await classroom.courses.students.list({
    courseId: kurzusId
  })
  res.send(JSON.stringify({"diakok":diakok.data.students} ))
  res.end()
})

app.get("/logs", async (req, res) => {
  //if (req.session.jogosultsag !== "Admin") {
  //  return res.status(403).send("Nincs jogosultságod ehhez az oldalhoz.").end();
  //}
  // iskolai projekt, nem hiszem hogy bárki is feltöri
  // persze ha production lenne akkor ki kell kommentelni
  // vagy akár secretekkel védeni

  try {
    const fajlok = await fs.promises.readdir(path.join(__dirname, 'logs', 'info'));
    if (fajlok.length === 0) {
      return res.send("<h1>Nincsenek logok</h1>");
    }

    const utolso = fajlok.sort().reverse()[0];
    const teljes = await fs.promises.readFile(path.join(__dirname, 'logs', 'info', utolso), 'utf-8');

    res.send(convert.toHtml(teljes));
  } catch (err) {
    logger.log({
      level: 'error',
      message: `(/logs) error=${err.message}`
    });
    console.error(err);
    res.status(500).send("Szerver hiba.");
  }
})

app.post("/MentIntezmeny", (req, res) =>{//RD, Új intézmény hozzáadása utáni mentés
  const intezmeny = req.body.intezmeny
  var sql = `INSERT INTO Intezmenyek (IntezmenyNev)
            SELECT '${intezmeny}'
            WHERE NOT EXISTS (
                SELECT 1 FROM Intezmenyek
                WHERE IntezmenyNev = '${intezmeny}'
            )`
  conn.query(sql, (err, results) => {
    if (err) { 
      logger.log({
        level: 'error',
        message: `(/MentIntezmeny) error=${err.message}`
      })
      throw err;  
    }
    res.end()
  })
})

app.post("/SendIntezmeny", (req, res) =>{//RD, intézmények küldése frontendre
  var sql = `SELECT id, IntezmenyNev
              FROM Intezmenyek`
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/SendIntezmeny error=${err.message}`
      });
    }
      if(results == null) res.send(JSON.stringify({"results":{}} ))
      else res.send(JSON.stringify({"results":results} ))
      res.end();
    })
})

app.post("/modositIntezmeny", (req, res) =>{//RD, intézmény módosítása
  const kellId = req.body.id
  const intezmeny = req.body.intezmeny
  var sql = `UPDATE Intezmenyek
              SET IntezmenyNev = '${intezmeny}'
              WHERE id = ${kellId}`
  conn.query(sql, (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/SendIntezmeny error=${err.message}`
      });
    }
      res.end();
    })
})

app.post("/customSql", (req, res) => {//??? -RD
  const sql = req.body.sql;
  if ((!sql) || (sql === "")) {
    res.send(JSON.stringify({ error: "Üres lekérdezés" }));
    return;
  }

  conn.query(sql, (err, results) => {
    if (err) {
      res.send(JSON.stringify({ error: err.message }));
      return;
    }

    res.send(JSON.stringify({ error: "", results }));
  });
})

app.post("/VanIntezmeny", (req, res) =>{//RD, Van-e a usernek Intézménye, mindenképpen kell lennie
  const userId = req.session.userId
  var sql = `SELECT
              CASE
                WHEN Users.Jogosultsag = 'Főadmin' THEN 1
                ELSE COUNT(Intezmenyek.id)
              END AS Db
              FROM Users LEFT JOIN Intezmenyek ON Users.IntezmenyId = Intezmenyek.id
              WHERE Users.id = ${userId}`
  conn.query(sql, (err, results) => {
    if (err) {
      res.status(500).send(JSON.stringify({ error: err.message }));
      return;
    }

    res.send(JSON.stringify({ "results":results }));
    res.end()
  });
})

app.post("/updateUserIntezmeny", (req, res) =>{//RD
  const userId = req.session.userId
  const intezmenyId = req.body.ujIntezmId
  req.session.intezmenyId = intezmenyId
  sql = `UPDATE Users SET IntezmenyId = ${intezmenyId} WHERE id = ${userId}`
  conn.query(sql, (err, results) => {
    if (err) {
      res.status(500).send(JSON.stringify({ error: err.message }));
      return;
    }
    res.end()
  });
})

app.post("/torolintezmeny", (req, res) =>{//RD, intézmény eltávolítása, az érintett usereknek új intézményt kell választaniuk következő bejelentkezéskor
  const intezmId = req.body.id
  var sql = `DELETE FROM Intezmenyek WHERE id = ${intezmId}`
  conn.query(sql, (err, results) => {
    if (err) {
      res.status(500).send(JSON.stringify({ error: err.message }));
      return;
    }
    res.end()
  });
})

app.post("/get-reports", (req, res) => { // BBB
  const javitott = req.body.javitott;
  /*console.log("get-reports" , javitott)*/

  conn.query(
    ` SELECT id, Email AS email, Nev AS nev, Ido AS ido, Message AS message
	    FROM Hibajelentes
	    WHERE Hibajelentes.Javitva = ?`,
    [javitott],
    (err, results) => {
      if(err) {
        res.status(500).send(JSON.stringify({ error: "Nem sikerült a hibák listáját megszerezni." }));
        return;
      } else {
        //console.log(`get-reports\n${results}`);
        res.send(JSON.stringify({ results: results }))
      }
    }
  );
});

app.post("/send-report", (req, res) => { // BBB
  /*console.log("/send-report", req.body.email, req.body.nev)*/

  conn.query(
    ` INSERT INTO Hibajelentes 
      (Email, Nev, Ido, Message, Javitva)
      VALUES (?, ?, ?, ?, 0)`,
    [
      req.body.email,
      req.body.nev || "nincs megadva",
      req.body.ido,
      req.body.message,
    ],
    (err, results) => {
      if(err) {
        res.status(500).send(JSON.stringify({ error: "Nem sikerült a hibajelentést elküldeni." }))
        /*console.log("send-report", err)*/
        return;
      } else {
        res.end();
      }
    }
  )
})

app.post("/update-report", (req, res) => { // BBB
  const action = req.body.action;
  const reportId = req.body.id;
  let sql;

  if (action === "correct") {
    sql = `
      UPDATE Hibajelentes
      SET Javitva = 1
      WHERE Hibajelentes.id = ?
    `;
  } else if (action === "delete") {
    sql = `
      DELETE FROM Hibajelentes
      WHERE Hibajelentes.id = ?
    `;
  }

  /*console.log(`/update-report ${action}`);*/

  conn.query(
    sql, [reportId], (err, results) => {
      if(err) {
        res.status(500).send(JSON.stringify({ error: "Nem sikerült frissíteni a hibajelentés státuszát."}))
        /*console.log("update-report", err);*/  
      } else {
        res.end();
      }
    }
  )
})

async function backup() {//BBB, PR, RD, sql backup készítése backups mappába(max 6db) 
  const backups = path.join(__dirname, "backups");
  const fajlNevek = await fajlNevLista(backups)
  if(fajlNevek.length >= 5){
    /*console.log(fajlNevek[0])*/
    var toBeDeleted = fajlNevek[0]
    const filePath = path.join(__dirname, "backups", toBeDeleted)
    /*console.log(filePath)*/    
    try{
      await fs.access(filePath)
      await fs.unlink(filePath)
      /*console.log(`${toBeDeleted} obliterálva lett`)*/
    }
    catch(err){
      /*console.log(`${toBeDeleted} törlése siketrtelen volt: ${err}`)*/
    }
  }
  const dbUser = config.database.user;
  const dbPsw = config.database.password;
  const dbName = config.database.name;

  let dir = fs.readdirSync(backups).sort((a, b) => {
    return fs.statSync(path.join(backups, a)).mtimeMs - 
           fs.statSync(path.join(backups, b)).mtimeMs;
  });

  while (dir.length > 5) {
    const f = dir.shift(); 
    fs.unlinkSync(path.join(backups, f));
  }
  
  var date = new Date().toISOString().replace(/[:]/g, '-');
  date = date.replace("T", "_")
  date = date.split(".")[0]

  const fn = `backup-${date}.sql`
  const backupCel = path.join(backups, fn);

  const cmd = `"C:\\Program Files\\MariaDB 10.6\\bin\\mysqldump.exe" --single-transaction --skip-lock-tables -h ${config.database.host} -P ${config.database.port} -u ${dbUser} -p"${dbPsw}" ${dbName} > "${backupCel}"`
  exec(cmd, (error, stdout, stderr) =>{
    if(error){
      /*console.log("Valami szörnyű dolog történt")*/
      /*console.log(error)*/
      return
    }
    /*console.log(stdout)*/
    /*console.log("Minden jó")*/
  })
}

function restore(fajlNev){/*BBB, RD, sql biztonsági mentés visszatöltése, CSAK AKKOR HA 1 session van életben, tehát akkor ha CSAK AZ ADMIN van bejelentkezve
                            note: a session 1 óráig "él", ha egy user nem jelentkezik ki, hanem csak bezárja a böngésző ablakát akkor meg kell várni hogy a session véget érjen.
                            !!! Ez a funkció arra készült, hogy az adatbázist vissza lehessen állítani korrábi állapotába ha valamilyen módon adatok vesztek el,
                            használata akkor javasolt ha nagy mennyiségű adat veszett el.
                            !!! Az adatbázis vissza fog állni a biztonsági mentéskor készített állapotába ami azt jelenti, hogy a biztonsági mentés utáni adatok TÖRLŐDNI FOGNAK !!!*/
  const dbUser = config.database.user;
  const dbPsw = config.database.password;
  const dbName = config.database.name;
  const backupHely = path.join(__dirname, "backups", fajlNev);

  const cmd = `"C:\\Program Files\\MariaDB 10.6\\bin\\mysql.exe" -h ${config.database.host} -P ${config.database.port} -u ${dbUser} -p${dbPsw} ${dbName} < ${backupHely}`

  exec(cmd, (error, stdout, stderr) =>{
    if(error){
      /*console.log("Valami szörnyű dolog történt")*/
      /*console.log(error)*/
      return
    }
    /*console.log(stdout)*/
    /*console.log("Minden jó")*/
  })
}

async function fajlNevLista(hely){
  const fajlok = await fspromise.readdir(hely, {withFileTypes:true})
  return fajlok.filter(a => a.isFile()).map(a => a.name)
} 

async function selectUpdate(){
  const backups = path.join(__dirname, "backups");
  return await fajlNevLista(backups)
}

app.post("/backupTolt", async (req, res) =>{
  res.send(JSON.stringify({"fajlok": await selectUpdate()}));
  res.end()
})

app.post("/MentBackup", async (req, res) =>{
  var cucc = await selectUpdate()
  /*console.log(cucc)*/
  res.send(JSON.stringify({"fajlok": cucc}))
  res.end()
})

app.post("/RestoreBackup", (req, res) =>{
  const fajlNev = req.body.dumpNev
  var szamlalo = sessionCounter()
  if(szamlalo <= 1){
    restore(fajlNev)
    res.send(JSON.stringify({"str":"Sikeres visszaállítás"}))
  }
  else{
    res.send(JSON.stringify({"str":`Jelenleg vannak bejelentkezett felhasználók (${szamlalo} db), kérjük próbálja újra később`}))
  }
  res.end()
})

cron.schedule('0 18 * * 7', async () => { //BBB minden héten vasárnap biztonsági mentés készül, tesztelésre szorul 
  await backup();
})

app.post("/AthelyezUser", (req, res) =>{//RD, felhasználó áthelyezése(intézmény)
  const hova = req.body.hova
  const userId = req.body.userId

  var sql = `UPDATE Users 
              SET IntezmenyId = ${hova}
              WHERE Users.id = ${userId}`
  /*console.log(sql)*/
  conn.query(sql, (err, results) => {
    if (err) {
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }
    res.send(JSON.stringify({ success: true }))
  });
})

app.post("/getUserIntezmeny", (req, res)=>{
  var userId = req.body.uid
  /*console.log(userId)*/
  var sql = `SELECT DISTINCT Intezmenyek.id, intezmenyNev, Users.id
              FROM Intezmenyek INNER JOIN Users ON Users.IntezmenyId = Intezmenyek.id
              GROUP BY Intezmenyek.id
              HAVING not Users.id = ${userId}`
  conn.query(sql, (err, results) => {
    /*console.log(results)*/
    if (err) {
      res.status(500).send(JSON.stringify({ error: err.message }));
      return;
    }

    res.send(JSON.stringify({ "results":results }));
    res.end()
  });
})

/*app.post("/sendFeedback", (req, res) => {
  logger.log({
    level: 'info',
    message: logFormat("/feedback", "POST", req.ip),
  })

  const feedbackReszlet = req.body.details || "Mi a lőcs?";
  //const userName = req.body.user || "Something is not right";

  logger.log({
    level: 'debug',
    message: `Feedback: ${feedbackReszlet}`
  });

  conn.query(
    "INSERT INTO Hibajelentes (Felado, Ido, Message) VALUES (?, NOW(), ?)",
    [req.session.id, feedbackReszlet],
    (err, results) => {
      if (err) {
        logger.log({
          level: 'error',
          message: `(/feedback) error=${err.message} userId=${req.session.userId}`
        });
        throw err;
      }
      res.end();
    }
  )
})*/

app.post("/wss", (req, res) => {
  let wssToken = crypto.randomBytes(32).toString("hex");
  terminal_wss_tokens.push(wssToken)

  res.send({ "wss": wssToken });
})

const server = app.listen(config.server.port, () => {
  logger.log({
    level: 'info',
    message: `Fut a szerver`,
  });
  
  /*console.log(server.address().address, server.address().port);*/
  //startWss(server);
});