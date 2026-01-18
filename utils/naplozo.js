const { connMegszerez } = require("../config/db")

const conn = connMegszerez();

function naplozz(msg, tipus = 0) {
    const tipus_text = tipus === 0 ? "INFO" : "ERROR";
    const ido = new Date().toISOString().slice(0, 19).replace("T", " ");
    const sql = `INSERT INTO Naplo (Tipus, TimeStamp, Message) VALUES (?, ?, ?)`;
    conn.query(sql, [tipus_text, ido, msg], err => {
        if (err) console.error("naplozz error:", err);
    });
}

module.exports = { naplozz };