const mysql = require("mysql");
const config = require("./config.js");

const pool = mysql.createPool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    connectionLimit: config.database.connectionLimit || 10,
    waitForConnections: config.database.waitForConnections || true,
});

pool.on("error", err => {
    console.error("MySQL pool error:", err);
});

function connMegszerez() {
    return pool;
}

module.exports = { connMegszerez };
