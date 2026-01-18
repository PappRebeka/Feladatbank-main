const express = require("express");
const path = require("path");
//const { connectToDatabase } = require("./config/db");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const port = process.env.NODE_PORT
const baseUrl = process.env.NODE_BASE_URL

//connectToDatabase()

app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/feladatok", require("./routes/feladatok"));
app.use("/classroom", require("./routes/classroom"));
app.use("/email", require("./routes/email"));

const server = app.listen(process.env.NODE_PORT, () => {
  logger.log({
    level: 'info',
    message: `Fut a szerver: ${server.address().address}:${server.address().port}`,
  });
});