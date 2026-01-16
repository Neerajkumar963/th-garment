import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Enable multiple statements for SQL files
  };

  let connection;

  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL');

    // Read Schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    console.log('Running schema.sql...');
    await connection.query(schemaSql);
    console.log('✅ Schema executed successfully');

    // Read Seed
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSql = await fs.readFile(seedPath, 'utf8');

    console.log('Running seed.sql...');
    await connection.query(seedSql);
    console.log('✅ Seed data executed successfully');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
