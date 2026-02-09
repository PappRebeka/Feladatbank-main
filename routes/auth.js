module.exports = function (oauth2Client, logger) {
    const express = require("express");
    const router = express.Router();

    const { createOAuthClient }  = require("./config/google")
    const crypto = require('crypto');
    const { google } = require("googleapis");
    const { connMegszerez } = require("./config/db");
    const { naplozz } = require("./utils/naplozo");
    const { randomHatterszin, randomFajlNev, isPositiveInt, isEmail, isNonEmptyString, queryAsync } = require("./utils/helpers");
    const { SCOPES }  = require("./config/google")

    const conn = connMegszerez();

    router.get("/redirect", (req, res) => { // GET /auth/redirect // PR, RD
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

            logger.log({
                level: 'debug',
                message: `login redirect 1`
            });
    
            res.redirect(authUrl); // autómatikusan átirányít a Google login oldalra
        } catch (error) {
            res.status(400).end()
            logger.log({
                level: 'error',
                message: `login redirect error error=${error.message}`
            });
        }
    });

    router.get("/register", async (req, res) => { // GET /auth/register // PR, RD
        try {
            const returnedState = req.query.state || null //daddy google küldte vissza (token)
            const pendingState = req.session.oauthState || null//mi tároltuk el a sessionbe (token)
            
            // ha nincs returnState(google nem küld vissza semmit) vagy nincs pendingState(mi nem tárolunk semmit) vagy nem matchelnek a tokenek 
            if(!returnedState || !pendingState || returnedState !== pendingState){
                logger.log({
                    level: 'error',
                    message: `valamelyik session-token hiányzik, vagy nem egyeznek a tokenek`
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
            const felhNev = userInfo.data.name;

            naplozz(`login_redirect_2 clientId=${clientId} email=${email}`, 0);
            res.redirect(`/?name=${felhNev}&email=${encodeURIComponent(email)}`);
        } catch(err) {
            console.error(err);
            res.redirect("hiba.html");
        }
    });

    router.post("/register", async (req, res) => { // POST /auth/register
        try {
            const username = req.query.username
            const email = req.query.email
            const passwd = req.query.password
    
            if (!isEmail(email) || !isNonEmptyString(passwd) || !isNonEmptyString(username)) {//mezőellenőrzés
                return res.send(JSON.stringify({ error: 'invalid input' }));
            }

            // új user felvétele, adatok tárolása, a jelszó MD5-ös hashelése, FROM_UNIXTIME - másodpercről datetimera alakít, hozzá kell adni 2 órát(7200000 ms) mert a kurva token expiry date más időzónát számít augh
            let sql = `INSERT INTO Users(Nev, Email, Jelszo, Jogosultsag, AccessToken, RefreshToken, UserToken, AccessEletTartam, Hatterszin) 
                    VALUES(?, ?, MD5(?), 'Tanár', ?, ?, MD5(?), FROM_UNIXTIME((? + 7200000) / 1000), '${randomHatterszin()}')`; 
    
    
            const insertSql = await queryAsync(sql, [username, email, passwd, req.session.access_token, req.session.refresh_token, req.session.userToken, req.session.expiry_date]) //insert végrehajtása
            const ujId = insertSql.insertId //user idjének kiszedése
    
            req.session.userId = ujId //tulajdonképpen meg lesz jelölve bejelentkezettként a user // id eltárolása a sessionbe

            delete req.session.pendingUserId // nincs szükség rá, ott van a usreId a sessionbe, ha van a usernek userIdje a sessionbe akkor van bejelentkezve
            delete req.session.oauthState     //useless ezután  //useless??? u mean.. // invisible
            delete req.session.access_token   //MUDA
            delete req.session.refresh_token  //MUDA
            delete req.session.expiry_date    //MUDA

            logger.log({
                level: 'debug',
                message: `registerdata userId=${ujId} email=${email}`
            });

            res.send(JSON.stringify({"userToken":req.session.userToken}))
    
            delete req.session.userToken
        } catch(err) {
            logger.log({
                level: 'error',
                message: `registerdata error=${err.message}`
            });
            res.status(500).send(JSON.stringify({error:'Registration failed'}));
        }
  res.end()
    });

    router.post("/check-registration", (req, res) => { // POST /auth/check-registration
        var email = req.query.email;
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
            res.set('Content-Type', 'text/html', 'charset=utf-8');
            res.send(results[0]['count(*)'] > 0 ? 'true' : 'false'); 
            res.end();
        });
    });

    router.post("/login", (req, res) => { // POST /auth/login
        var user = req.query.user;                                        //login adatok ellenőrzése, az email és a felhasználónév is elfogadott,
        var passwd = req.query.passwd;                                   //pontosabban a helyes bejelentekzési adatokkal rendelkező userek megszámolása, 
        var user_token = req.query.userToken                            //ha tobb mint 0 akkor bejelentkeztetjük
  
        if ( user_token == "" && (!isNonEmptyString(passwd) || !isNonEmptyString(user))) {
            return res.send(JSON.stringify({ error: 'invalid input' }));
        }

        let sql = `SELECT COUNT(id), id, UserToken
                   FROM Users 
                   WHERE (${isEmail(user) ? "Email = ?" : "Nev = ?" } AND Jelszo = MD5(?)) 
                   OR UserToken = ?`;

        conn.query(sql, [user, passwd, user_token], async (err, results) => {
            if(err) { 
                logger.log({
                    level: 'error',
                    message: `loginUser error=${err.message} user=${user}`
                });
            }
    
            if(results[0]['COUNT(id)'] > 0) {
                req.session.userId = results[0]['id'];
            }
            res.set('Content-Type', 'application/json', 'charset=utf-8');
            res.send(JSON.stringify({ 'db': results[0]['COUNT(id)'], 'UserToken':results[0]["UserToken"]}));
            res.end();
        })
    });

    router.put("/password", (req, res) => { // PUT /auth/password
        var email = req.query.email;
        var newPasswd = req.query.password;

        if (!isEmail(email) || !isNonEmptyString(newPasswd)) {
            return res.send(JSON.stringify({ error: 'invalid input' }));
        }

        let sql = `UPDATE Users SET Jelszo = MD5(?) WHERE Email = ?`;
        conn.query(sql, [newPasswd, email], (err, results) => {
            if(err){
                logger.log({
                    level: 'debug',
                    message: `update_password error=${err.message} email=${email}}`
                });
            }
            res.send(JSON.stringify({ "dataset":results } ))
            res.end();
        })

        naplozz(`update_password email=${email}`, 0)
    });

    return router;
};



