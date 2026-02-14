const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

const formatMessage = (level, message) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}\n`;
};

const logToFile = (message) => {
    fs.appendFile(LOG_FILE, message, (err) => {
        if (err) console.error('Failed to write log:', err);
    });
};

const logger = {
    info: (message) => {
        const msg = formatMessage('INFO', message);
        console.log(msg.trim());
        logToFile(msg);
    },
    error: (message, stack = '') => {
        const msg = formatMessage('ERROR', `${message} ${stack}`);
        console.error(msg.trim());
        logToFile(msg);
    },
    warn: (message) => {
        const msg = formatMessage('WARN', message);
        console.warn(msg.trim());
        logToFile(msg);
    }
};

module.exports = logger;
