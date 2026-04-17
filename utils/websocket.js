const WebSocket = require('ws');
const sessions = new Map(); // user token -> time to live

const HEARTBEAT_MS = 2000;
const TOKEN_TTL_MS = 6000;

/** Current timestamp in milliseconds.
 * @returns {number}
 */
function now() { return Date.now() } //RD

/** Refresh the time‑to‑live for a websocket session token.
 * @param {string} userToken
 * @returns {boolean} true if the token was valid and refreshed, false if it expired
 */
function refreshTTL(userToken) { //PR
    if (sessions.has(userToken)) {
        let expiresAt = sessions.get(userToken);
        
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

/** Create a new websocket session for a given token, or reject if one is active.
 * @param {string} userToken
 * @returns {boolean} true if the session was created, false if a session already exists
 */
function createSession(userToken) { //RD
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

/** Periodically clean out expired sessions from the store. */
function cleanUpInterval() { //RD
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

/** Initialize a WebSocket server on port 9091 and handle auth/heartbeat messages.
 * @returns {WebSocket.Server}
 */
function createWebsocket() { //PR
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
    return wss;
}

/**
 * Return the internal map of active sessions.
 * @returns {Map<string,number>}
 */
function getSessions() { //PR
    return sessions;
}

module.exports = { createWebsocket, getSessions };