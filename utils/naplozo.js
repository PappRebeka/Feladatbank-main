const { connMegszerez } = require("../config/db")

const conn = connMegszerez();

/**  Write a log entry into the Naplo table.
 * @param {string} msg - message to log
 * @param {number} [tipus=0] - 0 for info, non‑zero for error
 */
function naplozz(msg, tipus = 0) { //RD

    const tipus_text = tipus === 0 ? "INFO" : "ERROR";
    const ido = new Date().toISOString().slice(0, 19).replace("T", " ");
    const sql = `INSERT INTO Naplo (Tipus, TimeStamp, Message) VALUES (?, ?, ?)`;
    conn.query(sql, [tipus_text, ido, msg], err => {
        if (err) console.error("naplozz error:", err);
    });
}

module.exports = { naplozz };