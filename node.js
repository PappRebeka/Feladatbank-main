// #region Dependencies
const express    = require("express");
const { google } = require("googleapis");
const mysql      = require("mysql");
const mime       = require('mime-types');
const cron       = require('node-cron');


const crypto     = require('crypto');
const fs         = require('fs'); 
const fspromise  = require('fs').promises; 
const path       = require("path");
const { exec }   = require("child_process");
const util       = require("util");
const ansiToHtml = require('ansi-to-html');
const WebSocket = require('ws');

const multer = require('multer')
const upload = multer({
  fileFilter: function(req, file, callback) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('UTF-8');
    callback(null, true);
  },
  dest: 'uploads/' 
});

const app = express();
const convert = new ansiToHtml();
app.use(express.json());
app.use(express.static("public"));
app.use('/help', express.static(path.join(__dirname, 'help')));
var md5 = require('js-md5');

const config = require("./config/config.js");
//require('dotenv').config();
const session = require('express-session');

const { rnd, randomHatterszin, randomFajlNev, base64Ment, base64Tolt, isPositiveInt, isEmail, isNonEmptyString, userTokenCreate } = require("./utils/helpers");
const { naplozz } = require("./utils/naplozo");
const conn = require("./config/db").connMegszerez();
const { createOAuthClient, createClientUsingCredentials, SCOPES, baseUrl, clientId } = require("./config/google")
const { sendMail } = require("./services/emailsend")
const { loggerConfig, getLogger, terminal_wss_tokens, startWss } = require("./config/logging");
const { log } = require("console");
const { isNumber } = require("util");


const pad = (s, n) => s.padEnd(n);
const activeSessions = new Set()

var wss;

function startWsServer() {
  wss = new WebSocket.Server({ port: 9091 });

  wss.on("connection", (ws) =>{
    console.log("Új kliens csatlakozott")
    ws.userToken = null;

    ws.on("message", async (data) => {
      //console.log("jött message")
      let jsonData = JSON.parse(data);
      //console.log(jsonData);

      switch (jsonData["event"]) {
        case "authentication":
          ws.userToken = jsonData["userToken"];
          break;
        case "heartbeat":
          if (ws.userToken) {
            let now = Date.now();
            await queryAsync("UPDATE Users SET UtolsoPing = ? WHERE UserToken = ?", [now, ws.userToken]);
          }
          break;
        default:
          console.log("mi a fasz");
          ws.close();
          break;
      }
    })

    ws.on("close", () => {
      console.log("megdoglott");
    })
  })
}



MSG_PAD = 30;
METHOD_PAD = 16;
IP_PAD = 16;

function logFormat(msg, method, ip) {
  return `${msg.padEnd(MSG_PAD)} method=${method.padEnd(METHOD_PAD)} ip=${ip.padEnd(IP_PAD)}`;
}

loggerConfig('debug', false);
var logger = getLogger();

var mariadb_dump_exists = false;


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
    if (!code) return res.redirect("index.html");
    req.session.code = code;

    const client = createOAuthClient(); //új kliens a sessionhoz -> nem dob be más user accountjába
    const {tokens: uj_tokenek} = await client.getToken(req.query.code) // uj_tokenek tartalmazza: access_token, refresh_token, expiry_date

    const expiryDateMs = uj_tokenek.expiry_date || Date.now() + (3600 * 1000) //vagy a lejárati idő a tokenekből ha nincs akkor most + 2 óra(időzóna difference)
    req.session.access_token = uj_tokenek.access_token;
    req.session.refresh_token = uj_tokenek.refresh_token;
    req.session.expiry_date = expiryDateMs;

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
              VALUES(?, ?, MD5(?), 'Tanár', ?, ?, MD5(?), FROM_UNIXTIME((? + 7200000) / 1000), ?, NULL)`; 
    
    
    const insertSql = await queryAsync(sql, [username, email, passwd, req.session.access_token, req.session.refresh_token, req.session.userToken, req.session.expiry_date, randomHatterszin()]) //insert végrehajtása
    const letrejottId = insertSql.insertId //user idjének kiszedése

    
    req.session.userId = letrejottId //tulajdonképpen meg lesz jelölve bejelentkezettként a user // id eltárolása a sessionbe
    req.session.Jog = 'Tanár'
    
    activeSessions.add(req.sessionID)
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

    res.send(JSON.stringify({"userToken":md5(req.session.userToken)}))
    
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
    logger.log({
      level: 'error',
      message: err
    })
    res.end()
  }
})

async function checkLoggedIn(id) {
  try {
    const pingResults = await queryAsync("SELECT UtolsoPing FROM Users WHERE id = ?", [id]);
    const lastPing = parseInt(String(pingResults?.[0]?.UtolsoPing), 10);
    if (lastPing) {

      const now = Date.now();
      const diff = now - lastPing;
      if (diff < (1000)) {
        return { error: "ALREADY_LOGGED_IN", waitUntil: diff };
      }
    } else {
      return null;
    }
  } catch (e) {
    logger.log({ level: 'error', message: `ping check failed: ${e.message}` });
  }

  return null;
}

app.post("/loginUser", async (req, res) => { //RD, PR
  var user = req.body.user;                // login adatok ellenőrzése, az email és a felhasználónév is elfogadott,
  var passwd = req.body.passwd;           // pontosabban a helyes bejelentekzési adatokkal rendelkező userek megszámolása, 
  var user_token = req.body.userToken    // ha tobb mint 0 akkor bejelentkeztetjük
  var mail = req.body.mail
  const noMail = !Boolean(mail)
  
  
  if (noMail) {
    if ( (user_token == "" && (!isNonEmptyString(passwd) || !isNonEmptyString(user)))) {
      return res.send(JSON.stringify({ error: 'invalid input' }));
    }
  }
  let sql = `SELECT COUNT(id), id, Jogosultsag, UserToken, IntezmenyId
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
      // lets hope this works
      let loginCheck = await checkLoggedIn(results[0]['id']);
      if(loginCheck) {
        return res.status(200).send(loginCheck);
      }

      req.session.userId = results[0]['id'];
      req.session.Jog = results[0]['Jogosultsag']
      req.session.intezmenyId = results[0]['IntezmenyId']
      activeSessions.add(req.sessionID)
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
  var type = req.body.type || 'request'
   if (!isEmail(email)) {
    return res.send(JSON.stringify({ error: 'invalid input' }));
  }

  logger.log({
    level: 'info',
    message: "Sending mail to "+email,
  })
    sendMail(email, type);
    res.end();
})
//#endregion




/* -------------------------------------- - homepage.html - ---------------------------------------- */



async function refreshAccessTokenIfNeeded(user) {//RD, ha lej�rt az accesstoken akkor egy �j k�sz�l
  const client = createOAuthClient();
  if (!user.RefreshToken) {
    return {
      access_token: user.AccessToken,
      expiry_date: user.AccessEletTartam,
      requiresReauth: true,
      error: "missing_refresh_token"
    };
  }

  client.setCredentials({
    access_token: user.AccessToken,
    refresh_token: user.RefreshToken,
    expiry_date: user.AccessEletTartam,
  });
  // token frissit�se automatikusan (1 perc buffer)
  if (Date.now() >= (user.AccessEletTartam - 60 * 1000)) {
    try {
      const newTokens = await client.refreshAccessToken();
      const { access_token, refresh_token, expiry_date } = newTokens.credentials;

      // adatb�zis friss�t�s
      await queryAsync(
        `UPDATE Users SET AccessToken=?, RefreshToken=COALESCE(?, RefreshToken), AccessEletTartam=FROM_UNIXTIME((? + 3600000)/1000) WHERE id=?`, //id�z�na cucc
        [access_token, refresh_token || null, expiry_date, user.id]
      );

      return { access_token: access_token, expiry_date: expiry_date };
    } catch (err) {
      const isInvalidGrant = err?.response?.data?.error === "invalid_grant" || err?.message?.includes("invalid_grant");
      if (isInvalidGrant) {
        await queryAsync(
          `UPDATE Users SET AccessToken=NULL, RefreshToken=NULL, AccessEletTartam=NULL WHERE id=?`,
          [user.id]
        );
        return {
          access_token: null,
          expiry_date: null,
          requiresReauth: true,
          error: "invalid_grant"
        };
      }
      throw err;
    }
  }

  return { access_token: user.AccessToken, expiry_date: user.AccessEletTartam };
}


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

  if ((!isEmail(email) && req.session.Jog != 'Főadmin') || !isNonEmptyString(newPasswd)) {
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
  var userId = req.session.userId
  var userToken = req.body.UserToken
  try{
    let sql = `select id, Jogosultsag, IntezmenyId from Users where UserToken = '${userToken}'`;
    //if(req.session.Jog == undefined && req.session.userId == undefined && req.session.intezmenyId == undefined){
      var sessionValues = await queryAsync(sql)
      //let loginCheck = await checkLoggedIn(req.session.userId);
      req.session.Jog = sessionValues[0].Jogosultsag;
      req.session.userId = sessionValues[0].id;
      req.session.intezmenyId = sessionValues[0].IntezmenyId;
    }
  catch(err){
    logger.log({
      level:'error',
      message: 'GetUserData '+err
    })
    res.send(500).end()
    return;
  }
  

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
  var sql = `UPDATE Users SET Jogosultsag = ? WHERE id = ?`
  conn.query(sql, [mire.toString().trim(), id], (err, results) => {
    
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
  
  if(!['Admin', 'Főadmin'].includes(req.session.Jog)){
    return res.status(403).end();
  }
  var injection = []
  const intezmeny = req.session.intezmenyId
  const kereso = req.body.kereso
  var and = ""
  if (req.session.Jog != 'Főadmin'){
    and =' AND IntezmenyId = ?'
    injection.push(intezmeny)
  }
  if (kereso != "") {
    and += ` AND LOWER(Users.Nev) COLLATE utf8mb4_bin LIKE ?`
    injection.push('%'+kereso+'%')
  }
  
  var sql = `SELECT COUNT(Users.id) AS tanarDb
              FROM Users
              WHERE NOT Jogosultsag = 'Mailsender' and not Jogosultsag = 'Főadmin' ${and}`
              
  conn.query(sql, injection, (err, results) => {
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
              WHERE Megosztott.FeladoId = ?
              GROUP BY Users.id, Users.Nev
              ORDER BY 2`

  conn.query(sql, [felhId], (err, results) => {
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
              WHERE Users.id = ?
              GROUP BY Kozzetett.kurzusNev, Kozzetett.kurzusId
              ORDER BY 2`

  conn.query(sql, [felhId], (err, results) => {
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
              WHERE Users.id = ?` 
  conn.query(sql, [felhId], (err, results) => {
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
              WHERE Feladatok.Tanar = ?
              GROUP BY Kozzetett.kurzusNev, Kozzetett.kurzusId`
  conn.query(sql, [felhId], (err, results) => {
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
              WHERE Tanar = ?
              GROUP BY Evfolyam
              ORDER BY Evfolyam`
  conn.query(sql, [felhId], (err, results) => {
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
              WHERE Users.IntezmenyId = ?
              GROUP BY Users.id, Users.Nev
              ORDER BY FeladatDb DESC
              LIMIT 3`
  conn.query(sql, [intezmeny], (err, results) => {
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
  
  if(!['Admin', 'Főadmin'].includes(req.session.Jog)){
    return res.status(403).end();
  }
  
  const limit = req.body.limit
  const offset = req.body.offset
  const userId = req.session.userId
  const intezmeny = req.session.intezmenyId
  const kereso = req.body.kereso
  var limitoffset = ` LIMIT ${limit} OFFSET ${offset}`
  var injection = [limit, offset]
  var where = ""
  if (kereso != ""){
    injection.unshift(`%${kereso}%`)
    where = ` HAVING LOWER(Users.Nev) COLLATE utf8mb4_bin LIKE ?`
  } 
  if(req.session.Jog != "Főadmin"){
    injection.unshift(intezmeny)
  } 
  var sql = `SELECT Users.id, Users.Nev, Users.Email, Users.Jogosultsag, Users.HatterSzin
    FROM Users
    WHERE NOT Jogosultsag = 'Mailsender' and not Jogosultsag = 'Főadmin' ${userId != '2' ? `AND IntezmenyId = ?` : ''} 
    GROUP BY Users.id, Users.Nev ${where}${limitoffset}`
              
  conn.query(sql, injection, (err, results) => {
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

  const rendezesTema  = req.body.tema  ?? ''
  const rendezesFajta = req.body.desc

  const limit = req.body.limit
  const offset = req.body.offset
  
  var where = ""
  var order = ""
  var injection = []
  var limitSql = ` LIMIT ${limit}`
  var offsetSql = ` OFFSET ${offset}`

  if (rendezesTema != ""){
    order += ` ORDER BY ${rendezesTema == 'id' ? oldal <= 2 ? 'Feladatok.id' : "Megosztott.id" : rendezesTema} ${rendezesFajta == 0 ? "" : "DESC"}`
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
  
  if(oldal == 3 || oldal == 4){// Megosztott (velem vagy általam)
    sql += `, ${oldal == 3 ? 'Megosztott.Csillagozva' : 'Feladatok.Csillagozva'} , Users.Nev AS Felhasznalo, Users.HatterSzin AS FelhasznaloColor
              FROM Megosztott 
              INNER JOIN Feladatok ON Feladatok.id = Megosztott.FeladatId
              INNER JOIN Users ON Megosztott.${oldal == 3 ? 'FeladoId' : 'VevoId'} = Users.id
              WHERE Megosztott.${oldal == 3 ? 'VevoId' : 'FeladoId'} = ?${where}${order}${limitSql}${offsetSql}`
      injection.unshift(tanarId)
  }
  else if (oldal == 1){
    sql += `, 1 as Csillagozva 
            FROM Feladatok 
            LEFT JOIN Megosztott ON Megosztott.FeladatId = Feladatok.id
            WHERE ((Tanar = ? AND Feladatok.Csillagozva = 1) OR (VevoId = ? AND Megosztott.Csillagozva = 1))${where}
            GROUP BY Feladatok.id
            ${order}${limitSql}${offsetSql}`
    injection.unshift(tanarId, tanarId)
  }
  else{ // Saját (archivált vagy nem archivált)
      sql += `, Feladatok.Csillagozva FROM Feladatok WHERE Archivalva = ? AND Tanar = ?${where}${order}${limitSql}${offsetSql}`
      injection.unshift(tanarId)
      injection.unshift(oldal == 2 ? 1 : 0)
  }

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

app.get("/letolt-fajl/:id", async (req, res) => { // BBB
  try {
    conn.query("SELECT BackendNev, AlapNev FROM Fajl WHERE id = ?", [req.params.id], async (err, results) => {
      if (err) {
        logger.log({
          level: 'error',
          message: `(/letolt-fajl/:id) error=${err.message} id=${req.params.id} clientId=${clientId}`
        });
      }

      if (!results || results.length === 0) { // fajl nem létezik
        res.status(404).end();
      }

      const fileUt = path.join(__dirname, "uploads", results[0]["BackendNev"]);
      res.download(fileUt, results[0]["AlapNev"], (err) => {
        if (err) {
          logger.log({
            level: 'error',
            message: `(/letolt-fajl/:id) download error=${err.message} id=${req.params.id} clientId=${clientId}`
          });
        }
      });
    });
  } catch (err) {
    logger.log({
      level: 'error',
      message: `(/letolt-fajl/:id) error=${err.message} id=${req.params.id} clientId=${clientId}`
    });
    res.status(500).end();
  }
});

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
  
  var sql = `SELECT * FROM Alfeladat WHERE FeladatId = ?`

  conn.query(sql, [feladatId], async (err, results) => {
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

function checkIfUniqueUserName(newNev) { // BBB
  conn.query( // not case sensitive
    `SELECT COUNT(*) AS userCount 
      FROM Users as user
      WHERE user.Nev = ?`,
    [newNev],
    (err, results) => {
      if(err) {
        logger.log({
          level: "error",
          message: `Unique username check failed ${err}`
        })

        return false; // just in case
      } else {
        return results[0].userCount > 0;
      }
    }
  )
}

//update user data
app.post("/updateUserdata", (req, res) => { //RD
  var usertoken = req.body.userToken
  var newNev = req.body.newNev
  var newEmail = req.body.newEmail

  if ((!isEmail(newEmail) && req.session.Jog != 'Főadmin') || !isNonEmptyString(newNev)) {
    return res.send(JSON.stringify({ 
      success: false, 
      error: 'invalid_input' 
    }));
  }

  if (checkIfUniqueUserName(newNev)) {
    return res.send(JSON.stringify({
      success: false,
      error: "username_exists"
    }));
  }

  let sql = `UPDATE Users SET Nev = ?, Email = ? WHERE UserToken = ?`
  conn.query(sql, [newNev, newEmail, usertoken], (err, results) => {
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

  conn.query(sql, [tanarId], async (err, results) => {
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

    const userToken = await queryAsync("SELECT UserToken FROM Users WHERE id = ?", [tanarId])

    wss.clients.forEach((client) => {
      if (client.userToken === userToken[0]["UserToken"]) {
        client.send(JSON.stringify({ "event": "userDelete" }))
      }
    })
    

    conn.query("DELETE FROM Users WHERE id=?", [tanarId])

    
    logger.log({
      level: 'info',
      message: logFormat(`User (id=${tanarId}) and their tasks were successfully deleted`, "POST", req.ip),
    })

    res.send(JSON.stringify({ success: true }))
  })
})

async function isArchived(id){
  var result = await queryAsync('select Archivalva from Feladatok where id = ?', [id])
  return Boolean(result[0].Archivalva)
}

app.post("/feladatTorol", async (req, res) => { //BBB
  const id = req.body.id
  if(!await isArchived(id)){
    return res.status(409).end()
  }


  conn.query("DELETE FROM Megosztott WHERE FeladatId=?", [id])
  conn.query("DELETE FROM Alfeladat WHERE FeladatId=?", [id])
  conn.query("DELETE FROM Feladatok WHERE id=?", [id])
  res.end();
})

/*app.post("/get-last-id", (req, res) => {// BBB
  res.send({ "id": feladatId }).end()
})*/

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

    let id = results.insertId;
    res.json({ id }).end();
  });  
});

app.post("/ment-feladat", async (req, res) => { //BBB
    // full json alapú, azt mondta a tanár és a chatgpt is hogy így jobb
    const adat = req.body;
    const isInsert = adat["isInsert"]
    var feladatId
    let sql = "";
    var felInjection = [adat["Nev"], adat["Leiras"], adat["Evfolyam"], adat["Tantargy"], adat["Tema"], adat["Nehezseg"], adat["tanarId"]]
    
    if(Boolean(isInsert)){ // új feladat
      sql = `INSERT INTO Feladatok(Nev, Leiras, Evfolyam, Tantargy, Tema, Nehezseg, Tanar, Archivalva, Csillagozva)
              VALUES(?, ?, ?, ?, ?, ?, ?, 0, 0)`
    }
    else{
      sql = `UPDATE Feladatok SET Nev = ?, Leiras = ?, Evfolyam = ?, Tantargy = ?, Tema = ?, Nehezseg = ?, Tanar = ?
              WHERE id = ?`
      felInjection.push(adat["id"])
    }

    var feladat = await queryAsync(sql, felInjection)
    feladatId = Boolean(feladat.insertId) ? feladat.insertId : adat["id"]
    
    adat["alfeladatok"].forEach(async (alfeladat) => {
      let fajlId = alfeladat["fajlId"]; 

      let update = Boolean(alfeladat["alfId"]) // ha nem kaptunk id-t akkor ez egy új alfeladat
      let delte = alfeladat["isDelete"] == true
      let injection = []
            
      let sql = "";
      if (update && !delte){
        sql = `UPDATE Alfeladat SET Leiras = ?, FeladatId = ?, FajlId = ?, Pont = ?
                WHERE id = ${alfeladat["alfId"]}`
        injection.push(alfeladat['leiras'], feladatId, fajlId, alfeladat["pontszam"], alfeladat["alfId"])
      }     

      else if (delte){
        sql = `DELETE FROM Alfeladat WHERE id = ?`
        injection.push(alfeladat["alfId"])
      }  

      else {
        sql = `INSERT INTO Alfeladat (Leiras, FeladatId, FajlId, Pont) VALUES(?, ?, ?, ?)`
        injection.push(alfeladat['leiras'], feladatId, fajlId, alfeladat["pontszam"])
      }

      await queryAsync(sql, injection)
      /*conn.query(sql, injection, (err, results) => { 
        if (err) { 
          logger.log({
            level: 'error',
            message: `(/ment-feladat) error=${err.message}`
          });
          vanEHiba = true;
          throw err;  
        }
      });*/
    });
    res.send({ "id": feladatId }).status(200).end()
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

async function fajlFeltoltClassroom (fajlId) {//BBB

  let fileExtension, filePath;
  let dbResults = await queryAsync("SELECT BackendNev, AlapNev FROM Fajl WHERE id = ?", [fajlId]);
  
  const fileMetadata = {
    name: dbResults[0]["AlapNev"],
  };

  fileExtension = path.extname(dbResults[0]["AlapNev"]);
  filePath = path.join(__dirname, "uploads", dbResults[0]["BackendNev"]);
  
  const media = {
    mimeType: mime.lookup(fileExtension) || 'application/octet-stream',
    body: fs.createReadStream(filePath),
  }

  const driveResults = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id'
  });

  return driveResults?.data.id;
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
  feladatId = req.body.feladatid
  if(await isArchived(feladatId)){
    return res.status(409).end();
  }

  kurzusId = req.body.kurzusid
  dueDate = req.body.dueDate
  dueTime = req.body.dueTime
  tanulok = req.body.tanulok
  shareMode = req.body.shareMode
  let sql = `SELECT Feladatok.Nev, Feladatok.Leiras AS feladatLeiras, Feladatok.Tema, Feladatok.Nehezseg, 
              (SELECT sum(Pont) FROM Alfeladat WHERE FeladatId = ?) AS maxPont, 
              Alfeladat.id, Alfeladat.Leiras, Alfeladat.Pont, Alfeladat.FajlId
            FROM Feladatok left JOIN Alfeladat ON Feladatok.id = Alfeladat.FeladatId 
            WHERE Feladatok.id = ?`; 
  conn.query(sql, [feladatId, feladatId], async (err, results) => {
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
    var maxPont = results[0]["maxPont"] ?? 0
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
    
    let fajlIds = [];
    
    for (let i = 0; i < results.length; i++) {
      var leiras = results[i]["Leiras"];
      var pont = results[i]["Pont"];
      let classroomPromises = [];
      if (results[i]["FajlId"]){ 
        let uploadedFileId = await fajlFeltoltClassroom(results[i]["FajlId"]);
        fajlIds.push(uploadedFileId);
      }

      if(pont && leiras){
        if (!description.includes('Alfeladatok:')) description += "Alfeladatok:\n"
        description += `${i+1}) (${pont} pont) ${leiras}\n\n`
      }
    }
    var temp = await createClassroomTask(nev, description, maxPont, year, month, day, hours, minutes, kurzusId, fajlIds, tanulok, shareMode)
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

async function createClassroomTask(title, description, maxPoints, year, month, day, hours, minutes, courseid, fajlIds, tanulok, shareMode){ //RD, classroom feladat létrehozása adott kurzusba(feltöltése)
  /*
    shareMode:
        "UNKNOWN_SHARE_MODE"  => No sharing mode specified. This should never be returned.
        "VIEW"                => Students can view the shared file.
        "EDIT"                => Students can edit the shared file.
        "STUDENT_COPY"        => Students have a personal copy of the shared file.
  */
  const materials = fajlIds.map(fajlId => ({
    driveFile: {
      driveFile: {
        id: fajlId
      },
      shareMode: shareMode
    }
  }));

  //tanulok = String(tanulok || "").split(",").map(s => s.trim()).filter(s => s.length > 0);
  var selectedStudents = (Boolean(tanulok?.length))
  //if(tanulok.length > 0)
  
  feladatData ={
    title,
    description,
    workType: "ASSIGNMENT",
    state: "PUBLISHED",
    maxPoints,
     ...(selectedStudents
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

async function doesUserOwnsThisTask(tanarid, feladatid){
  let result = await queryAsync('select count(*) as db from Feladatok where Tanar = ? and id = ?', [tanarid, feladatid])
  return Boolean(result[0].db)
}

app.post("/feladatArchivalas", async(req, res) =>{ //PR
  var user = req.session.userId
  var id = req.body.id;
  if(await !doesUserOwnsThisTask(user, id)){
    return res.status(403).end();
  }
  
  var state = req.body.state;
   
  if(state == 1) { 
    await queryAsync('delete from Megosztott where FeladatId = ?', [id])
    await queryAsync('UPDATE Feladatok SET Csillagozva = 0 WHERE id = ?', [id])
  }
  let sql = `UPDATE Feladatok SET Archivalva = ? WHERE id = ?` ;
  

  conn.query(sql, [state, id], (err, results) => {
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
  let sql = `SELECT Nev, Email FROM Users WHERE (Jogosultsag = 'Tanár' OR Jogosultsag = 'Admin') AND NOT id = ? AND IntezmenyId = ?`
  conn.query(sql, [userId, intezmeny], (err, results) =>{
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

async function MegosztottFeladatAlreadyExists(injection){
  let sql = `SELECT COUNT(id) AS db FROM Megosztott WHERE FeladatId = ? AND FeladoID = ? AND VevoId = (SELECT id FROM Users WHERE Email = ? OR Nev = ? limit 1)`
  var c = await queryAsync(sql, injection)
  return c[0].db

}

app.post("/FeladatMegosztasaTanarral", async (req, res) =>{ //RD, tanárok közötti feladat megosztás 

  const cimzett = req.body.cimzett
  const feladatId = req.body.feladatId
  const felado = req.session.userId
  var injection = [feladatId, felado, cimzett, cimzett]
  var dbszam = await MegosztottFeladatAlreadyExists(injection)
  if (dbszam > 0){
    return res.status(406).end()
  }

  let sql = `INSERT INTO Megosztott(FeladatId, FeladoId, VevoId, Csillagozva)
            VALUES(?, ?, (SELECT id FROM Users WHERE Email = ? OR Nev = ? limit 1), 0)`

  conn.query(sql, injection, (err, results) => {
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

app.post('/megosztasVisszavon', async (req, res) => {
  const feladatId = req.body.id
  const vevo = req.body.vevo
  const user = req.session.userId;
  if(await isArchived(feladatId) || !await doesUserOwnsThisTask(user, feladatId)){
    return res.status(403).end();
  }

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
              INNER JOIN Users ON Megosztott.FeladoId = Users.id WHERE VevoId = ?
              GROUP BY Users.id`

  conn.query(sql, [vevo], (err, results) => {
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
    if(oldal == 3 || oldal == 4){ //  Megosztott
        sql = `SELECT count(Megosztott.id) as db FROM Feladatok INNER JOIN Megosztott ON Megosztott.FeladatId = Feladatok.id WHERE ${oldal == 3 ? 'VevoId' : 'FeladoId'} = ? ${where}`
        injection.unshift(userId)
    }
    else if (oldal == 1){
      sql = `SELECT count(distinct Feladatok.id) as db
            FROM Feladatok 
            LEFT JOIN Megosztott ON Megosztott.FeladatId = Feladatok.id
            WHERE ((Tanar = ? AND Feladatok.Csillagozva = 1) OR (VevoId = ? AND Megosztott.Csillagozva = 1))${where}`
      injection.unshift(userId, userId)
    }
    else{ // Saját (archivált vagy nem archivált)
      sql = `SELECT count(Feladatok.id) as db FROM Feladatok WHERE Archivalva = ? AND Tanar = ? ${where}`
      injection.unshift(userId)
      injection.unshift(oldal == 2 ? 1 : 0)
    }
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
    res.status(500).end();
    return
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
            SELECT ?
            WHERE NOT EXISTS (
                SELECT 1 FROM Intezmenyek
                WHERE IntezmenyNev = ?
            )`
  conn.query(sql, [intezmeny, intezmeny], (err, results) => {
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
  var sql = `SELECT id, IntezmenyNev FROM Intezmenyek`
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
              SET IntezmenyNev = ?
              WHERE id = ?`
  conn.query(sql, [intezmeny, kellId], (err, results) => {
    if(err){
      logger.log({
        level: 'error',
        message: `/SendIntezmeny error=${err.message}`
      });
    }
      res.end();
    })
})


app.post("/customSql", (req, res) => {//??? BBB
  const sql = req.body.sql;

  if(!['Főadmin'].includes(req.session.Jog)){
    return res.status(403).end();
  }
  
  if ((!sql) || (sql === "")) {
    return res.send(JSON.stringify({ error: "Üres lekérdezés" }));
  }
  
  conn.query(sql, (err, results) => {
    if (err) {
      return res.send(JSON.stringify({ error: err.message }));
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
              WHERE Users.id = ?`
  conn.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).send(JSON.stringify({ error: err.message }));
    }

    res.send(JSON.stringify({ "results":results }));
    res.end()
  });
})

app.post("/updateUserIntezmeny", (req, res) =>{//RD
  const userId = req.session.userId
  const intezmenyId = req.body.ujIntezmId
  req.session.intezmenyId = intezmenyId
  sql = `UPDATE Users SET IntezmenyId = ? WHERE id = ?`
  conn.query(sql, [intezmenyId, userId], (err, results) => {
    if (err) {
      return res.status(500).send(JSON.stringify({ error: err.message }));
    }
    res.end()
  });
})

app.post("/torolintezmeny", (req, res) =>{//RD, intézmény eltávolítása, az érintett usereknek új intézményt kell választaniuk következő bejelentkezéskor
  const intezmId = req.body.id
  var sql = `DELETE FROM Intezmenyek WHERE id = ?`
  conn.query(sql, [intezmId], (err, results) => {
    if (err) {
      return res.status(500).send(JSON.stringify({ error: err.message }));
    }
    res.end()
  });
})

app.post("/get-reports", (req, res) => { // BBB
  const javitott = req.body.javitott;

  conn.query(
    ` SELECT id, Email AS email, Nev AS nev, Ido AS ido, Message AS message
	    FROM Hibajelentes
	    WHERE Hibajelentes.Javitva = ?`,
    [javitott],
    (err, results) => {
      if(err) {
        return res.status(500).send(JSON.stringify({ error: "Nem sikerült a hibák listáját megszerezni." }));
      } else {
        res.send(JSON.stringify({ results: results }))
      }
    }
  );
});

app.post("/send-report", (req, res) => { // BBB

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
        return res.status(500).send(JSON.stringify({ error: "Nem sikerült a hibajelentést elküldeni." }))
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


  conn.query(
    sql, [reportId], (err, results) => {
      if(err) {
        res.status(500).send(JSON.stringify({ error: "Nem sikerült frissíteni a hibajelentés státuszát."}))
        
      } else {
        res.end();
      }
    }
  )
})

async function backupCreate(backups) {//BBB, PR, RD, sql backup készítése backups mappába(max 6db) 
  const dbUser = config.database.user;
  const dbPsw = config.database.password;
  const dbName = config.database.name;

  var date = new Date();
  date.setHours(date.getHours() + 1);
  date = date.toISOString().replace(/[:]/g, '-');
  
  date = date.replace("T", "_")
  date = date.split(".")[0]

  const fn = `backup-${date}.sql`
  const backupCel = path.join(backups, fn);

  if (mariadb_dump_exists) {
    await makeDump(
      config.database.host, 
      config.database.port, 
      dbUser, 
      dbPsw, 
      dbName, 
      backupCel)
  }

  return mariadb_dump_exists ? fn : "no_mariadb_dump"
}
async function makeDump(host, port, dbUser, dbPsw, dbName, backupCel){
  const cmd = `mariadb-dump --single-transaction --skip-lock-tables -h ${host} -P ${port} -u ${dbUser} -p"${dbPsw}" ${dbName} > "${backupCel}"`
  exec(cmd, (error, stdout, stderr) =>{
    if(error){
      return
    }
  })
}

function restore(backupLocation, fileName){/*BBB, RD, sql biztonsági mentés visszatöltése, CSAK AKKOR HA 1 session van életben, tehát akkor ha CSAK AZ ADMIN van bejelentkezve
                            note: a session 1 óráig "él", ha egy user nem jelentkezik ki, hanem csak bezárja a böngésző ablakát akkor meg kell várni hogy a session véget érjen.
                            !!! Ez a funkció arra készült, hogy az adatbázist vissza lehessen állítani korrábi állapotába ha valamilyen módon adatok vesztek el,
                            használata akkor javasolt ha nagy mennyiségű adat veszett el.
                            !!! Az adatbázis vissza fog állni a biztonsági mentéskor készített állapotába ami azt jelenti, hogy a biztonsági mentés utáni adatok TÖRLŐDNI FOGNAK !!!*/
  const dbUser = config.database.user;
  const dbPsw = config.database.password;
  const dbName = config.database.name;
  const backupHely = path.join(__dirname, backupLocation, fileName);

  

  const cmd = `mysql -h ${config.database.host} -P ${config.database.port} -u ${dbUser} -p${dbPsw} ${dbName} < ${backupHely}`

  exec(cmd, (error, stdout, stderr) =>{
    if(error){
      return
    }
  })
}

async function fajlNevLista(hely){
  const fajlok = await fspromise.readdir(hely, {withFileTypes:true})
  return fajlok.filter(a => a.isFile()).map(a => a.name)
} 

async function selectUpdate(newFile){
  const backups = path.join(__dirname, "backups");
  let fajlok = await fajlNevLista(backups);
  if(Boolean(newFile)) fajlok.push(newFile)
  return Array.from(fajlok).splice(1);
}

app.post("/backupTolt", async (req, res) =>{
  res.send(JSON.stringify({"fajlok": await selectUpdate(null)}));
  res.end()
})

async function getFileNameAndCreationDate(directory){
  try {
    const files = fs.readdirSync(directory);
    const result = await Promise.all(
      files.map(async file => {
        try {
          const fullPath = path.join(directory, file);
          const stats = await fspromise.stat(fullPath);
          
          return {
            name: file,
            fullPath: fullPath,
            creationDate: stats.birthtimeMs || stats.ctimeMs
          };
        } catch (err) {
          console.log(`Fájl statjainak olvasása sikertelen: ${err}`)
          return null;
        }
      })
    );

    if(result) return result;
    else {
      throw Error("baj van");
    }
  } catch (err) {
    console.log(`Elérési út olvasása sikertelen: ${err}`);
  }
}

// ilyen objektumokat szeret csak:
// { fullPath: string, creationDate: number }
function sortFilesByCreation(fileData){
  const FILES_TO_KEEP = 5;
  return fileData.sort((a, b) => b.creationDate - a.creationDate)
                 .slice(0, FILES_TO_KEEP);
}

app.post("/MentBackup", async (req, res) =>{
  if(!['Főadmin'].includes(req.session.Jog)){
    return res.status(403).end();
  }

  backupPath = path.join(__dirname, 'backups');
  let fileData = await getFileNameAndCreationDate(backupPath); //fájlnév, fájl path, creation(ms)
  let sortedFiles = sortFilesByCreation(fileData)

  const toBeDeleted = fileData.filter(f => !sortedFiles.map(s => s.fullPath)
                              .includes(f.fullPath));

  toBeDeleted.forEach(async (file) => {
    await fspromise.unlink(file.fullPath);
  })

  const newBackup = await backupCreate(backupPath)
  if (newBackup === "no_mariadb_dump") {
    res.send(JSON.stringify({
      "error": "Nincsen letöltve a helyes csomag a biztonsági mentés elvégzéséhez"
    })).end();
    return;
  }

  let result = sortedFiles.map((file) => file.name)
  result.push(newBackup);
  result.unshift();

  res.send(JSON.stringify({
    "fajlok": result
  }));
  res.end();
})

app.post("/RestoreBackup", (req, res) =>{
  const fajlNev = req.body.dumpNev
  var sessionSzamlalo = sessionCounter()
  if(sessionSzamlalo <= 1){
    restore("backups", fajlNev)
    res.send(JSON.stringify({"str":"Sikeres visszaállítás"}))
  }
  else{
    res.send(JSON.stringify({"str":`Jelenleg vannak bejelentkezett felhasználók (${sessionSzamlalo} db), kérjük próbálja újra később`}))
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
              SET IntezmenyId = ?
              WHERE Users.id = ?`
              
  conn.query(sql, [hova, userId], (err, results) => {
    if (err) {
      return res.send(JSON.stringify({ success: false, error: err.message }));
    }
    res.send(JSON.stringify({ success: true }))
  });
})

app.post("/getUserIntezmeny", (req, res)=>{
  var userId = req.body.uid

  var sql = `SELECT Intezmenyek.id, intezmenyNev
              FROM Intezmenyek LEFT JOIN Users ON Users.IntezmenyId = Intezmenyek.id
              WHERE not Intezmenyek.id = (SELECT IntezmenyId FROM Users WHERE Users.id = ?)
              GROUP BY Intezmenyek.id`
  conn.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).send(JSON.stringify({ error: err.message }));
    }
    res.send(JSON.stringify({ "results":results }));
    res.end()
  });
})

app.post("/wss", (req, res) => { // Ez mi?(RD)
  let wssToken = crypto.randomBytes(32).toString("hex");
  terminal_wss_tokens.push(wssToken)

  res.send({ "wss": wssToken });
})

/*
// explanation: client sends a "heartbeat" every let's say 30 seconds
// so that the server knows when the client discoonnects
app.post("/heartbeat", (req, res) => { 
  let userId = req.session.userId;
  let now = Date.now();

  if (!isPositiveInt(userId)) {
    // could be an admin without a userId
    // no problem, just ignore
    res.sendStatus(204);
    return res.end();
  }

  // problem: mysql server has timezone - 1 hour than our timezone
  queryAsync(
    "UPDATE Users SET UtolsoPing = ? WHERE id = ?",
    [now, userId]
  ).then(() => {
    res.sendStatus(204);
    res.end();
  })
})*/

const server = app.listen(config.server.port, () => {
  logger.log({
    level: 'info',
    message: `Fut a szerver`,
  });

  exec (`mariadb-dump --version`, (error, stdout, stderr) => {
    if (error) {
      mariadb_dump_exists = false;
      console.log("mariadb-dump package nincs installálva");
    } else {
      mariadb_dump_exists = true;
      console.log("mariadb-dump package installálva van");
    }
  })

  startWsServer();
  
  const tabla_lista = ["Alfeladat", "Fajl", "Feladatok", "Hibajelentes", "Intezmenyek", "Kozzetett", "Megosztott", "Naplo", "Users"];
  let loadBase = false;
  conn.query(
    "SHOW TABLES",
    (err, results) => {
      const tablaNevek = results.map(row => Object.values(row)[0]);
      
      tabla_lista.forEach(tablaNev => {
        if (!tablaNevek.includes(tablaNev)) {
          loadBase = true;
        }
      })
      console.log("fog futni a restore? " + loadBase)
      if(loadBase) restore(
        "utils",
        "base.sql"
      );
    }
  )

  function ExistsUser(){ //RD, ha egy user 2 lapon jelentkezik be
    const userId = req.session.userId
    let sql = "SELECT COUNT(id) AS db FROM Users WHERE Users.id = ?"
    var users = queryAsync(sql, [userId])
    return users.db > 0
  }

  async function IsFeladatSharedWithThisUser(feladatId, UserId){
    sql = "SELECT COUNT(id) AS db FROM Megosztott WHERE FeladatId = ? AND VevoId = ?"
    var feladatok = await queryAsync(sql, [feladatId, UserId])
    return feladatok[0].db > 0
  }

  app.post("/GetTantargyak", (req, res) =>{
    const UserId = req.session.userId
    const oldal = req.body.oldal
    var selectTable = ""
    var whereParameters = ""
    switch(parseInt(oldal)){
      case 1: //Csillagozva, injection: userid
        selectTable = "Feladatok"
        whereParameters = "Tanar = ? AND Csillagozva = 1"
      break;
      case 2: //Archivalva, injection: userid
        selectTable = "Feladatok"
        whereParameters = "Tanar = ? AND Archivalva = 1"
      break;
      case 3: //Velem megosztva, injection: userid
        selectTable = "Feladatok INNER JOIN Megosztott on Feladatok.id = Megosztott.FeladatId"
        whereParameters = "VevoId = ?"
      break;
      case 4: //Általam megosztott, injection: userid
        selectTable = "Feladatok INNER JOIN Megosztott on Feladatok.id = Megosztott.FeladatId"
        whereParameters = "FeladoId = ?"
      break;
      default: //Feladataim, injection: userid
        selectTable = "Feladatok"
        whereParameters = "Tanar = ?"
      break;
    }
    
    var sql = `SELECT Tantargy FROM ${selectTable} WHERE ${whereParameters} GROUP BY Tantargy`
    
    conn.query(sql, [UserId], (err, results) => {
      res.send(JSON.stringify({ "results":results }));
      res.end()
    })
  })

  app.post("/updateBookmarkedState", async (req, res) =>{ //RD
    const feladatId = req.body.feladatId
    const vevoId = req.session.userId
    const feladoNev = req.body.felado
    const oldal   = req.body.oldal ? parseInt(req.body.oldal) : 0 
    var tablaToUpdate = ""
    var whereParameters = ""
    var injection = []
    
    const sharedFeladat = await IsFeladatSharedWithThisUser(feladatId, vevoId)
    if(sharedFeladat){
      tablaToUpdate = "Megosztott"
      whereParameters = `FeladatId = ? AND VevoId = ?`
      injection.push(feladatId, vevoId)
    }
    else{
      tablaToUpdate = "Feladatok"
      whereParameters = "Feladatok.id = ?"
      injection.push(feladatId)
    }

    let sql = `UPDATE ${tablaToUpdate} SET
              Csillagozva =
                CASE
                    WHEN Csillagozva = 0 THEN 1
                    ELSE 0
                END	
              WHERE ${whereParameters}`;
    
    conn.query(sql, injection, (err, results) => {
      if (err) {
        return res.send(JSON.stringify({ 
          success: false, 
          error: err.message 
        }));
      }
      res.end()
    })
  })
});
