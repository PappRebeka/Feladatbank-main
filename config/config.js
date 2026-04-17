const fs = require('fs');

/*
    The purpose of this code is to load different versions of the server configuration file based off of 
    which file actually exists. Since we aren't actually committing server-config-test.json because of
    sensitive data, a server-config-prod.json is loaded instead, which actually exists in the Github
    repository.
*/

let config;

try {
    config = JSON.parse(
        fs.readFileSync("server-config-test.json", "utf-8")
    );
} catch {
    config = JSON.parse(
        fs.readFileSync("server-config-prod.json", "utf-8")
    );
}

module.exports = config;