const mysql = require('mysql2');
require('dotenv').config();

console.log('Testing DB Disconnection with config:');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Port:', process.env.DB_PORT);
console.log('SSL:', process.env.DB_SSL);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.promise().getConnection()
    .then(conn => {
        console.log('✅ Connection Successful!');
        return conn.query('SELECT 1 + 1 AS solution');
    })
    .then(([rows]) => {
        console.log('Query Result:', rows[0].solution);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection Failed:', err.message);
        console.error('Full Error:', err);
        process.exit(1);
    });
