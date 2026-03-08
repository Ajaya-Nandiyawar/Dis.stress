/**
 * migrate.js — Disaster-recovery migration script.
 * Reads schema.sql and executes each CREATE TABLE statement against the database.
 *
 * Usage:  node db/migrate.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    // Split on each CREATE TABLE statement so we can log them individually
    const statements = sql
        .split(/(?=CREATE TABLE)/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const client = await pool.connect();
    try {
        for (const stmt of statements) {
            // Extract table name for logging
            const match = stmt.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
            const tableName = match ? match[1] : '(unknown)';

            await client.query(stmt);
            console.log(`✔  Table "${tableName}" — created / verified`);
        }
        console.log('\nMigration complete — all tables ready.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
