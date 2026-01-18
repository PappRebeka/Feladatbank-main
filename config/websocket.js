const WebSocket = require('ws');


function startWebsocket(tokens, server) {
    try {
        const wss = new WebSocket.Server({ server: server });
        // csatlakoznak a websocketen
        wss.on("connection", function(ws) {
            ws.assignedToken = null;
            ws.authenticated = false;

            ws.on("message", (message) => {
                const msgStr = message.toString(); 
                handleMsg(tokens, ws, msgStr);
            })
        })

        return wss;
    } catch (error) {
        console.error("WebSocket hiba:", error);
    }
}

function handleMsg(tokens, ws, message) {
    if (message.startsWith("auth") && ws.authenticated === false) {
        let token = message.split(" ")[1]?.trim();
        if (tokens.includes(token)) {
            ws.assignedToken = token;
            ws.authenticated = true;

            let index = tokens.indexOf(token);
            tokens.splice(index, 1);
        } else { ws.close(); }
    } else { ws.close(); }
    // csak auth, a usernek semmi mást nem kéne küldenie
}

function sendMsg(wss, adat) {
    try {
        wss.clients.forEach(client => {
            // csak azoknak küldjük a terminál adatait akik bejelentkeztek
            //if (client.readyState == WebSocket.OPEN && client.authenticated) {
                client.send(adat);
            //}
        });
    } catch (error) {
        //console.error("hiba:", error);
    }
}

module.exports = { startWebsocket, sendMsg };