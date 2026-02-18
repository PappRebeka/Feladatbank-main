const WebSocket = require('ws');
const sessions = new Map(); // user token -> time to live

const HEARTBEAT_MS = 2000;
const TOKEN_TTL_MS = 6000;

function now() { return Date.now() }

// returns true if successful
// returns false if the ws connection needs to be dropped
function refreshTTL(userToken) {
    if (sessions.has(userToken)) {
        let expiresAt = sessions.get(userToken);

        // the value might be undefined, but may never be an issue
        // nevertheless it is handled here
        if (!expiresAt) return false; 

        // checks if the user token has expired
        // if yes, drop the connection now
        if (expiresAt < now()) {
            sessions.delete(userToken);
            return false;
        }

        // refreshes the user token expiration date
        sessions.set(userToken, now() + TOKEN_TTL_MS);

        return true;
    } else {
        return false;
    }
}

// returns true if successful
// returns false if not
function createSession(userToken) {
    // if the session already exists, that means that
    // we need to check if the session has expired or not
    if (sessions.has(userToken)) {
        let expiresAt = sessions.get(userToken);
        if(!expiresAt) return false;

        if (expiresAt > now()) {
            // session is still running, refuse connection
            return false;
        } 
        
        // clean the session up
        sessions.delete(userToken);
    } 

    // we create a new session
    sessions.set(userToken, now() + TOKEN_TTL_MS)
    return true;
}

// cleans up sessions that have expired and
// are not refreshed anymore every 10 seconds
function cleanUpInterval() {
    setInterval(() => {
        const currentTime = now();
        for (const [userToken, expiresAt] of sessions.entries()) {
            // if session is expired
            if (expiresAt < currentTime) {

                // delete session
                sessions.delete(expiresAt);
            }
        }
    }, 10000);
}

function createWebsocket() {
    wss = new WebSocket.Server({ port: 9091 });

    wss.on("connection", (ws) => {
        ws.on("message", (data) => {
            let message = JSON.parse(data);

            switch (message.event) { 
                case "authentication": // { "event": "authentication", "userToken": userToken }
                    var result = createSession(message.userToken);
            
                    if (result) {
                        ws.send("authenticationOk");
                        ws.userToken = message.userToken;
                    } else {
                        ws.send("authenticationBad");
                        ws.close(1000, "session creation was unsuccessful");
                    }

                    return;
                
                case "heartbeat": // { "event": "heartbeat", "userToken": userToken }
                    var result = refreshTTL(message.userToken);

                    if (result) {
                        ws.send("heartbeatOk");
                    } else {
                        ws.send("heartbeatBad");
                        ws.close(1000, "session expiration date refresh was unsuccessful");
                    }

                    return;
                
                default:
                    ws.close(1000, `Unknown websocket event ${message.event}`)

                    return;
            }
        });

        ws.on("close", () => {
            sessions.delete(ws.userToken);
        })
    })

    

    cleanUpInterval();
}

module.exports = { createWebsocket };