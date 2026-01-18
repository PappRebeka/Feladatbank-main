module.exports = function (oauth2Client) {
    const express = require("express");
    const router = express.Router();

    router.post("/send", (req, res) => {
        var email = req.query.email;
        if (!isEmail(email)) {
            return res.send(JSON.stringify({ error: 'invalid input' }));
        }

        sendMail(email);
        res.end();
    });

    return router;
};



