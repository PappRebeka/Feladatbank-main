const mysql = require("mysql");
const config = require("./config.js");

const pool = mysql.createPool({
    charset: "utf8mb4",
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    connectionLimit: config.database.connectionLimit || 10,
    waitForConnections: config.database.waitForConnections || true,

    // these are here to fix connection issues
    acquireTimeout: 10000,
    connectTimeout: 10000,
    queueLimit: 0,
});

pool.on("error", err => {
    console.error("MySQL pool error:", err);
});

function connMegszerez() {
    return pool;
}

module.exports = { connMegszerez };
