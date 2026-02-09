module.exports = function (oauth2Client) {
    const express = require("express");
    const router = express.Router();

    router.get("/", (req, res) => {
        var sql2;
        const vevoId = req.session.userId
        const tanarId = req.query.tanarId
        const evfolyamSz = req.query.evfolyamSz
        const tantargySz = req.query.tantargySz
        const nehezsegSz = req.query.nehezsegSz
        const rendezesTema = req.query.rendezesTema
        const rendezesFajta = req.query.rendezesFajta
        const limit = req.query.limit
        const offset = req.query.offset
        const oldal = req.query.oldal ? parseInt(req.query.oldal) : 0; // alapból csak az archiválatlan feladatokat kéri le
        var where = ""
        var order = ""
        var injection = []
        var limitSql = ` LIMIT ${limit}`
        var offsetSql = ` OFFSET ${offset}`
        if (rendezesTema != "" && rendezesFajta != ""){
            order += ` ORDER BY ${rendezesTema} ${rendezesFajta == 0? "" : "DESC"}`
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
        if (!isPositiveInt(tanarId) && !isPositiveInt(oldal)) {
            return res.send(JSON.stringify({ error: 'invalid input' }));
        }

        if(oldal == 0 || oldal == 1){ //Feladataim & archívált
            sql2 = `SELECT Feladatok.id as FeladatIdje, Nev, Feladatok.Leiras, Evfolyam, Tantargy, Tema, Nehezseg,
            (SELECT COUNT(Alfeladat.id) FROM Alfeladat WHERE FeladatId = FeladatIdje) AS alfDb
            FROM Feladatok WHERE Archivalva = ${oldal} AND Tanar = ${tanarId}${where}${order}${limitSql}${offsetSql}`
        }
        else if(oldal == 2){ // Velemm megosztott
            sql2 =`SELECT Feladatok.id as FeladatIdje, Nev, Feladatok.Leiras, Evfolyam, Tantargy,
                  Tema, Nehezseg,
                  (SELECT COUNT(Alfeladat.id) FROM Alfeladat WHERE FeladatId = FeladatIdje) AS alfDb,
                  (SELECT Users.Nev FROM Users INNER JOIN Feladatok on Feladatok.Tanar = Users.id WHERE Feladatok.id =
                  (SELECT FeladatId From Megosztott WHERE VevoId = ${vevoId} LIMIT 1)) AS Felado
                  FROM Megosztott 
                  INNER JOIN Feladatok ON Feladatok.id = Megosztott.FeladatId
                  WHERE Megosztott.VevoId = ${vevoId}${where}${order}${limitSql}${offsetSql}`
        }
        else if(oldal == 3){ // Általam közzétett
            sql2 = `SELECT Feladatok.id AS FeladatIdje, Feladatok.Nev, Feladatok.Leiras, Feladatok.Evfolyam,
                    Feladatok.Tantargy, Feladatok.Tema, Feladatok.Nehezseg,
                    (SELECT COUNT(*) FROM Alfeladat WHERE Alfeladat.FeladatId = Feladatok.id) AS alfDb, Kozzetett.kurzusNev AS Kurzus,
                    Kozzetett.kurzusFeladatId AS kurzusFeladatId, Kozzetett.kurzusId AS kurzusId
                    FROM Feladatok RIGHT JOIN Kozzetett ON Kozzetett.FeladatId = Feladatok.id
                    WHERE Tanar = ${tanarId}${where}${order}${limitSql}${offsetSql}`
        }
    
        conn.query(sql2, [injection], (err, results) => {
            if(err){
                logger.log({
                    level: 'error',
                    message: `/SendFeladatok error=${err.message} clientId=${clientId}`
                });
            }
            logger.log({
                level: 'debug',
                message: `/SendFeladatok results=`
            });
        
            logger.log({ level: 'debug', message: results})
        
            if(results == null) res.send(JSON.stringify({"results":{}} ))
            else res.send(JSON.stringify({"results":results} ))
            res.end();
        })
    });

    router.post("/", (req, res) => {
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
        conn.query(sql, [adat["nev"], adat["leiras"], adat["evfolyam"], adat["tantargy"], adat["tema"], adat["nehezseg"], adat["tanarId"]], (err, results) => {
            if (err) { 
                logger.log({
                    level: 'error',
                    message: `(/ment-feladat) error=${err.message} clientId=${clientId}`
                });
                vanEHiba = true;
                throw err; 
            }

            feladat_utolso_id = results.insertId
        });

        logger.log({
            level: 'debug',
            message: `(/ment-feladat) adat=${JSON.stringify(adat)} clientId=${clientId}`
        });

        adat["alfeladatok"].forEach(alfeladat => {
            logger.log({
                level: 'debug',
                message: `(/ment-feladat) alfeladat=`
            });

            logger.log({ level: 'debug', message: alfeladat})

            let fajlId = alfeladat["fajlId"]; //.toArray().join(";");
            logger.log({
                level: 'debug',
                message: `(/ment-feladat) fajlId=${fajlId} clientId=${clientId}`
            });

            let sql = "";
            if      (!alfeladat["alfId"])           sql = `INSERT INTO Alfeladat (Leiras, FeladatId, FajlId, Pont) VALUES(?, ?, ?, ?)`
            else if (alfeladat["isDelete"] == true) sql = `DELETE FROM Alfeladat WHERE id=${alfeladat["alfId"]}`
            else                                    sql = `UPDATE Alfeladat SET Leiras = ?, FeladatId = ?, FajlId = ?, Pont = ?
                                                            WHERE id = ${alfeladat["alfId"]}`

            conn.query(sql, alfeladat["isDelete"] == false ? [alfeladat["leiras"], (!alfeladat["alfId"] ? feladat_utolso_id + 1 : adat["id"]), fajlId, alfeladat["pontszam"]] : [], (err, results) => {
                if (err) { 
                    logger.log({
                      level: 'error',
                      message: `(/ment-feladat) error=${err.message} clientId=${clientId}`
                    });
                    vanEHiba = true;
                    throw err;  
                }

                logger.log({
                  level: 'debug',
                  message: `(/ment-feladat) alfeladat results=`
                });

                logger.log({ level: 'debug', message: results})
            });
        });
        res.send({ "id": feladat_utolso_id }).status(200).end()
    });

    router.get("/subtasks", (req, res) => {
        var feladatId = req.query.feladatId ? parseInt(req.query.feladatId) : null;
        if (!isPositiveInt(feladatId)) {
            res.end(); return
        }
    
        var sql = `SELECT * FROM Alfeladat WHERE FeladatId = ${feladatId}`

        conn.query(sql, async (err, results) => {
            if(err || !results || results.length == 0){
                logger.log({
                    level: 'error',
                    message: `(/SendAlFeladatok) error=${err ? err.message : 'no results'} feladatId=${feladatId} clientId=${clientId}`
                });
            }

            for (const alfeladat of results) {
                alfeladat["FajlInfo"] = await fajlInfo(alfeladat["FajlId"]); 
            };
        
            logger.log({
                level: 'debug',
                message: `(/SendAlFeladatok) results=`
            });
        
            logger.log({ level: 'debug', message: results})
        
            res.send(JSON.stringify({"results":results} ))
            res.end();
        })
    });

    router.delete("/:id", (req, res) => {
        const id = req.params.id
        conn.query("DELETE FROM Megosztott WHERE FeladatId=?", [id])
        conn.query("DELETE FROM Alfeladat WHERE FeladatId=?", [id])
        conn.query("DELETE FROM Feladatok WHERE id=?", [id])
        res.end();
    });

    router.get("last-id", (req, res) => {
        res.send({ "id": feladat_utolso_id }).end()
    });

    router.put("/:id/archive", (req, res) => {
        var id = req.query.id;
        var state = req.query.state;
        let sql = `UPDATE Feladatok SET Archivalva = ${state} WHERE id = `+id;
        conn.query(sql, (err, results) => {
            if (err){
                logger.log({
                    level: 'error',
                    message: `(/feladatArchivalas) error=${err.message} id=${id} clientId=${clientId}`
                });
                throw err;
            }
          
            res.end()
        })
    });

    router.post("/:id/share/:teacher", (req, res) => {
        const cimzett = req.query.cimzett
        const feladatId = req.query.feladatId
        const felado = req.session.userId
            
        let sql = `INSERT INTO Megosztott(FeladatId, FeladoId, VevoId)
                  VALUES(?, ?, (SELECT id FROM Users WHERE Email = ? OR Nev = ?))`
            
        conn.query(sql, [feladatId, felado, cimzett, cimzett], (err, results) => {
            if (err) { 
                logger.log({
                    level: 'error',
                    message: `(/FeladatMegosztasaTanarral) error=${err.message} feladatId=${feladatId} felado=${felado} cimzett=${cimzett} clientId=${clientId}`
                })
                throw err;  
            }

            logger.log({
                level: 'debug',
                message: `(/FeladatMegosztasaTanarral) Feladat megosztva feladatId=${feladatId} felado=${felado} cimzett=${cimzett} clientId=${clientId}`
            });
          
            res.end()
        });
    });

    router.get("/count", (req, res) => {
        const userId = req.query.tanarId
        const oldal = req.query.oldal ? parseInt(req.query.oldal) : 0; // alapból csak az archiválatlan feladatokat kéri le
        const evfolyamSz = req.query.evfolyamSz
        const tantargySz = req.query.tantargySz
        const nehezsegSz = req.query.nehezsegSz
        let sql;
        var where = ""
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
        try{
            if(oldal == 0 || oldal == 1){
                  sql = `SELECT count(id) as db FROM Feladatok WHERE Tanar = ${userId} AND Archivalva = ${oldal}${where}`
            }
            else if(oldal == 2){
                  sql = `SELECT count(Megosztott.id) as db FROM Feladatok INNER JOIN Megosztott ON Megosztott.FeladatId = Feladatok.id WHERE VevoId = ${userId} ${where}`
            }
            else if(oldal == 3){
                  sql = `SELECT COUNT(Kozzetett.id) as db FROM Feladatok RIGHT JOIN Kozzetett ON Kozzetett.FeladatId = Feladatok.id
                          WHERE Tanar = ${userId}${where}`
            }
            
            conn.query(sql, (err, results) => {
                  if (err) { 
                      logger.log({
                          level: 'error',
                          message: `(/getFeladatNumber) error=${err.message} userId=${userId} clientId=${clientId}`
                      })
                      throw err;  
                  }
                  logger.log({
                      level: 'debug',
                      message: `(/getFeladatNumber) results=`
                  })
                  logger.log({ level: 'debug', message: results})
                
                  res.send(JSON.stringify({ "db":results[0]["db"] } ))
                  res.end()
            })
        }
        catch(err){
        }
    });

    return router;
};