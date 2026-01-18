const { google } = require("googleapis");
const config = require("./config.js");

// ha esetleg az alap url-je a weblapnak változni fog. 
// spoiler: fog is, mert a sulis serverre fogjuk publikusan feldobni.
// ez a konstans használva van a redirectURI konstans megadására.
const baseUrl = `${config.server.base_url}:${config.server.port}`;

const clientId = config.google.client_id;
const clientSecret = config.google.client_secret;
const redirectURI = `${baseUrl}/reg`;

function createOAuthClient(){//RD
  // Új kliens készítése egy sessionre
    return new google.auth.OAuth2(clientId, clientSecret, redirectURI);
}

function createClientUsingCredentials(accessToken, refreshToken, expiryDate) {//RD
  // Egy user credential adatai, nem globális, minden session-nél keletkezik egy kliens
  const client = createOAuthClient();
  const creds = {};
  if (accessToken) creds.access_token = accessToken;
  if (refreshToken) creds.refresh_token = refreshToken;
  if (expiryDate) creds.expiry_date = expiryDate;
  client.setCredentials(creds);
  
  return client;
}

const SCOPES = [
    "https://www.googleapis.com/auth/classroom.courseworkmaterials",
    "https://www.googleapis.com/auth/classroom.coursework.students",
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.rosters.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    //"https://www.googleapis.com/auth/drive", //this one is dangerous
    //"https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/drive.file"
];

module.exports = { createOAuthClient, createClientUsingCredentials,  SCOPES, baseUrl, clientId };