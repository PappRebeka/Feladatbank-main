module.exports = function (oauth2Client, logger) {
    const express = require("express");
    const router = express.Router();

    const { connMegszerez } = require("./config/db");

    const conn = connMegszerez();

    router.get("/teachers", (req, res) => {
        const userId = req.session.userId
        let sql = `SELECT Nev, Email FROM Users WHERE Jogosultsag = 'Tanár' AND NOT id = ${userId}`
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
    });

    router.get("/subjects", (req, res) => {
        const cimzett = req.query.cimzett
        const feladatId = req.query.feladatId
        const felado = req.session.userId

        let sql = `INSERT INTO Megosztott(FeladatId, FeladoId, VevoId)
                  VALUES(?, ?, (SELECT id FROM Users WHERE Email = ? OR Nev = ?))`

        conn.query(sql, [feladatId, felado, cimzett, cimzett], (err, results) => {
            if (err) { 
                logger.log({
                    level: 'error',
                    message: `(/FeladatMegosztasaTanarral) error=${err.message} feladatId=${feladatId} felado=${felado} cimzett=${cimzett}`
                })
                throw err;  
            }

            logger.log({
                level: 'debug',
                message: `(/FeladatMegosztasaTanarral) Feladat megosztva feladatId=${feladatId} felado=${felado} cimzett=${cimzett}`
            });
      
            res.end()
        });
    });

    return router;
};


