const crypto = require('crypto');
const util = require("util");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const conn = require("../config/db").connMegszerez();

const queryAsync = util.promisify(conn.query).bind(conn); //RD

/** Generate a random integer between `min` and `max` inclusive.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rnd(min, max) {//PR
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

/** Return a random rgb color string.
 * @returns {string}
 */
function randomHatterszin(){ //PR
    return `rgb(${rnd(0, 255)} ${rnd(0, 255)} ${rnd(0, 255)})`;
}

function randomFajlNev(length) {
    return crypto.randomBytes(Math.ceil(length / 2))
                 .toString('hex')
                 .slice(0, length);
}

/** Save base64-encoded image to a file and return generated filename.
 * @param {string} kep
 * @param {string} tipus
 * @returns {Promise<string|null>}
 */
async function base64Ment(kep, tipus) { //BBB
    if(kep) { // van kép
      const buffer = Buffer.from(kep, 'base64');
      fajlNev = `${randomFajlNev(16)}${tipus}`;
      const outputPath = path.join(process.cwd(), 'feladat_kepek', fajlNev);
  
      await sharp(buffer)
        .toFile(outputPath);
  
      return Promise.resolve(fajlNev);
    } else { // nincs kép
      return Promise.resolve(null)
    }
}

/** Load image file and return its base64 encoding.
 * @param {string|null} fajlNev
 * @returns {Promise<string|null>}
 */
async function base64Tolt(fajlNev) { //BBB
    if (fajlNev) { // van kép
      const eleresiUt = path.join(process.cwd(), 'feladat_kepek', fajlNev);
      const buffer = await fs.promises.readFile(eleresiUt);
      return buffer.toString('base64');
    } else { // nincs kép
      return null
    }
}

function isPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

function isEmail(v) {
  if (!v || typeof v !== 'string') return false;
  // small regex, good enough for validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isNonEmptyString(s, minLen = 3) {
  return typeof s === 'string' && s.trim().length >= minLen;
}

//User token generálása
const szam = "0123456789"
const betu = "abcdefghijklmnopqrstuvwxyz"
const betu_upper = betu.toUpperCase()
const jelek = ".-_"

/** Generate a random token and ensure it is unique in the Users table.
 * @returns {string}
 */
function userTokenCreate (){
  let user_token = "";
  while (user_token.length < 17){
    let rndszam = rnd(0, 9)
    if(rndszam <= 2) user_token += szam[rnd(0, szam.length - 1)] // 30% esélyel szám
    else if(rndszam <= 5) user_token += betu[rnd(0, betu.length - 1)] // 30% esélyel kisbetű
    else if(rndszam <= 8) user_token += betu_upper[rnd(0, betu_upper.length - 1)] // 30% esélyel nagybetű
    else user_token += jelek[rnd(0, jelek.length - 1)] //10% eséllyel írásjel
  }
  var sql = `SELECT COUNT(id) FROM Users WHERE UserToken = MD5(?)`
  conn.query(sql, [user_token], (err, results) => { 
    if(err){ throw err;}
    if (results[0]['COUNT(id)'] > 0){ // ha már van ilyen token akkor újrageneráljuk
      userTokenCreate();
    }
  })
  return user_token;
}

var classroom;
var drive;

/** Retrieve Google Classroom courses for a user by session id.
 * @param {string} userid
 * @returns {Promise<Array>}
 */
async function classroomGetCourses(userid){
  results = await getUserDataFromSessionId(userid)
  AccessToken= results["AccessToken"],
  RefreshToken= results["RefreshToken"], 
  AccessEletTartam= new Date(results["AccessEletTartam"]).getTime()
  const user = {
    id: userid,
    AccessToken: AccessToken,
    RefreshToken: RefreshToken,
    AccessEletTartam: AccessEletTartam
  }
  AccessToken, AccessEletTartam = await refreshAccessTokenIfNeeded(user)
  const client = createClientUsingCredentials(AccessToken, RefreshToken, AccessEletTartam)

  classroom = await google.classroom({ version:"v1", auth: client})
  drive = await google.drive({ version: 'v3', auth: client });
  const courses = await classroom.courses.list({ teacherId: "me", pageSize: 5 })
  return courses.data.courses
}

function getCroomDrive() {
  return classroom, drive
}

const config = require("../config/config.js");

/** Return SQL query to check if a table exists */
function tableExistsSql(tableName) {
  return `SELECT * FROM information_schema.tables
          WHERE table_schema = "${config.database.name}"
          AND TABLE_NAME = "${table_name}"`
}

//const queryAsync = util.promisify(conn.query).bind(conn);  // RÉCZEG DŰVID

module.exports = {
    rnd,
    randomHatterszin,
    randomFajlNev,
    base64Ment,
    base64Tolt,
    isPositiveInt,
    isEmail,
    isNonEmptyString,
    userTokenCreate,
    queryAsync,
    classroomGetCourses,
    getCroomDrive,
}