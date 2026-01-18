module.exports = function (oauth2Client) {
    const express = require("express");
    const router = express.Router();

    const { connMegszerez } = require("./config/db");

    const conn = connMegszerez();

    router.get("/download/:id", (req, res) => {
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

    router.post("/upload", upload.single('fajl'), (req, res) => {
        let sql = "INSERT INTO Fajl (Meret, BackendNev, AlapNev) VALUES (?, ?, ?)";

        conn.query(sql, [req.file.size, req.file.filename, req.file.originalname], (err, results) => {
            if (err) {
                logger.log({
                    level: 'error',
                    message: `(/ment-fajl) error=${err.message} clientId=${clientId}`
                });
              
                throw err;
            }
          
            logger.log({
                level: 'debug',
                message: `(/ment-fajl) results=`
            });
          
            logger.log({ level: 'debug', message: results})
          
            let id = results.insertId;
          
            logger.log({
                level: 'debug',
                message: `(/ment-fajl) insertId=${id} clientId=${clientId}`
            });
          
            res.json({ id }).end();
        });
    });

    return router;
};