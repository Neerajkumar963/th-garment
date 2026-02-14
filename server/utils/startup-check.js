const db = require('../config/database');
const logger = require('./logger');

const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const REQUIRED_TABLES = ['users', 'orders', 'processing', 'cutting_process', 'sales_history', 'emp_details'];

const runStartupCheck = async () => {
    logger.info('Running startup checks...');

    // 1. Env Vars
    const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
    if (missingEnv.length > 0) {
        logger.error(`Missing Environment Variables: ${missingEnv.join(', ')}`);
        process.exit(1);
    }

    // 2. DB Connection & Tables
    try {
        const connection = await db.getConnection();
        
        // Check tables
        const [rows] = await connection.query('SHOW TABLES');
        const existingTables = rows.map(r => Object.values(r)[0]);
        
        const missingTables = REQUIRED_TABLES.filter(t => !existingTables.includes(t));
        
        if (missingTables.length > 0) {
            logger.error(`Missing Critical Tables: ${missingTables.join(', ')}`);
            process.exit(1);
        }

        connection.release();
        logger.info('Database check passed.');

    } catch (error) {
        logger.error('Startup Check Failed (DB):', error.message);
        process.exit(1);
    }

    logger.info('All startup checks passed. Server healthy.');
};

module.exports = runStartupCheck;
