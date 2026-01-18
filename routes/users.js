module.exports = function (oauth2Client) {
    const express = require("express");
    const router = express.Router();

    router.get("/me", (req, res) => {
        connectToDatabase();
        conn = connMegszerez();
        if(req.session.userId == undefined) {req.session.userId = (await queryAsync('select id from Users where UserToken = ?', [req.query.UserToken]))[0].id;}

        logger.log({
            level: 'debug',
            message: `/GetUserData userId=${req.session.userId} clientId=${clientId}`
        });
      
        const results = await getUserDataFromSessionId(req.session.userId)
      
        logger.log({
            level: 'debug',
            message: `/GetUserData results=`
        });
      
        logger.log({ level: 'debug', message: results})
        res.set('Content-Type', 'application/json', 'charset=utf-8');
        res.send(JSON.stringify({ "dataset":results } ))
        res.end();
    });

    router.put("/me", (req, res) => {
        var usertoken = req.query.userToken
        var newNev = req.query.newNev
        var newEmail = req.query.newEmail

        if (!isEmail(newEmail) || !isNonEmptyString(newNev)) {
            return res.send(JSON.stringify({ error: 'invalid input' }));
        }

        // Check if new username already exists (excluding current user)
        let checkUsernameSql = `SELECT id FROM Users WHERE Nev = ? AND UserToken != ?`;
        conn.query(checkUsernameSql, [newNev, usertoken], (err, existingUsers) => {
            if (err) {
                logger.log({
                    level: 'error',
                    message: `(/updateUserdata) username check error=${err.message} userToken=${usertoken}`
                });
                return res.send(JSON.stringify({ error: 'database_error' }));
            }

            if (existingUsers && existingUsers.length > 0) {
                return res.send(JSON.stringify({ error: 'username_exists' }));
            }

            let sql = `UPDATE Users SET Nev = ?, Email = ? WHERE UserToken = '${usertoken}'`
            conn.query(sql, [newNev, newEmail], (err, results) => {
                if(err){
                    logger.log({
                        level: 'error',
                        message: `(/updateUserdata) error=${err.message} userToken=${usertoken}`
                    });
                }
              
                logger.log({
                    level: 'debug',
                    message: `(/updateUserdata) results=`
                });
              
                logger.log({ level: 'debug', message: results})
              
                res.end()
            })
        })
    });

    router.delete("/me", (req, res) => {
        var tanarId = parseInt(req.query.id);
        logger.log({
            level: 'debug',
            message: `(/deleteUser) tanarId=${tanarId} clientId=${clientId}`
        });

        let sql = "SELECT id FROM Feladatok WHERE Tanar=?";
    
        conn.query(sql, [tanarId], (err, results) => {
            if (err){
                logger.log({
                    level: 'error',
                    message: `(/deleteUser) error=${err.message} tanarId=${tanarId} clientId=${clientId}`
                });
            }
          
            logger.log({
                level: 'debug',
                message: `(/deleteUser) results=`
            });
          
            logger.log({ level: 'debug', message: results})
          
            adat = {"ids":results};
          
            adat["ids"].forEach((id, _) => {
                conn.query("DELETE FROM Megosztott WHERE FeladatId=?", [id["id"]])
                conn.query("DELETE FROM Alfeladat WHERE FeladatId=?", [id["id"]])
                conn.query("DELETE FROM Feladatok WHERE id=?", [id["id"]])

                logger.log({
                    level: 'debug',
                    message: `feladat törölve ezzel az id-vel: ${id["id"]}`
                })
            })
          
            conn.query("DELETE FROM Users WHERE id=?", [tanarId])

            logger.log({
                level: 'debug',
                message: `(/deleteUser) user deleted tanarId=${tanarId} clientId=${clientId}`
            });
          
            res.end()
        });
    });

    return router;
};



