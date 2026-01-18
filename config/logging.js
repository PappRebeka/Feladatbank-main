const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, prettyPrint, colorize } = format;
const path = require('path');
const { startWebsocket, sendMsg } = require('./websocket');
const Convert = require('ansi-to-html');
const convert = new Convert();

var terminal_wss_tokens = [];
var wss = null;

function startWss(server) {
    wss = startWebsocket(terminal_wss_tokens, server);
}

//const Transport = require('winston-transport');

const kodPozicio = format((info) => {
    const stack = (new Error()).stack;
    if (stack) {
        const lines = stack.split('\n').map(l => l.trim()).filter(Boolean);
        const currentFile = path.basename(__filename);

        let userLine = lines.find(line =>
            !/^Error\b/.test(line) &&
            !line.includes('node_modules') &&
            !line.includes('(internal') &&
            !line.includes('createFormatWrap') &&
            !line.includes(currentFile)
        );

        if (!userLine) {
            userLine = lines.find(line => /([A-Za-z]:|\/).*:\d+:\d+/.test(line) && !line.includes(currentFile));
        }

        if (userLine) {
            let match = userLine.match(/\(([^)]+)\)/) || userLine.match(/at (.+:\d+:\d+)/);
            info.kodPozicio = match ? match[1] : userLine;
        } else {
            info.kodPozicio = 'unknown';
        }
    }
    return info;
});

const f = printf(({ level, message, label, timestamp, kodPozicio }) => {
  const msg = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
  if (level === 'error') {
    return `${timestamp} [${label}] ${level}: ${msg} \n\t -> ${kodPozicio || 'unknown'}`;
  } else {
    return `${timestamp} [${label}] ${level}: ${msg}`;
  }
});

let logger = null;

function loggerConfig(szint, loggolj) {
    wtf();
    const date = Date.now()
    logger = createLogger({
        level: szint, 
        transports: [
            new transports.Console({
              level: 'debug',
              format: combine(
                printf(info => {
                    let str = `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
                    try { 
                        //console.log("niggler", convert.toHtml(str + '\n'))
                        sendMsg(wss, convert.toHtml(str + '\n')); }
                    catch(e){}
                  /*if(info.level === 'debug')*/ return str;
                  
                })
              )
            }),
            new transports.File({ 
                filename: `logs/normal/${date}.log`
            }),
            new transports.File({ 
                filename: `logs/error/${date}.log`, 
                level: 'error' 
            }),
            new transports.File({ 
                filename: `logs/info/${date}.log`, 
                level: 'info' 
            }),
        ],
        format: combine(
            label({ label: 'feladatbank' }),
            colorize(),
            timestamp(),
            kodPozicio(),
            prettyPrint(),
            f
        ),
        exitOnError: false,
        silent: loggolj
    })
}

function wtf() {
    sendMsg(wss, Date.now().toLocaleString())
    setTimeout(wtf, 1000);
}

function getLogger() { return logger; }

module.exports = { loggerConfig, getLogger, terminal_wss_tokens, startWss };