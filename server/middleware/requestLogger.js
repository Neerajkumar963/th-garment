const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
    // Log Request
    logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);

    // Capture Response finish
    res.on('finish', () => {
        logger.info(`${req.method} ${req.url} - Status: ${res.statusCode}`);
    });

    next();
};

module.exports = requestLogger;
