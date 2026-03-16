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
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'FOUND' : 'MISSING');
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

        // --- CUSTOM MIGRATION: Resources table update ---
        console.log('Running custom migration for "resources" table...');
        await client.query(`
            ALTER TABLE resources
            DROP CONSTRAINT IF EXISTS resources_type_check
        `);
        await client.query(`
            ALTER TABLE resources
            ADD CONSTRAINT resources_type_check CHECK (type IN ('ambulance','fire','police','shelter','depot'))
        `);
        await client.query(`
            ALTER TABLE resources
            ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'ambulance',
            ADD COLUMN IF NOT EXISTS name VARCHAR(100)
        `);
        await client.query(`
            UPDATE resources SET resource_type = 'ambulance' WHERE resource_type IS NULL
        `);
        console.log('✔  Table "resources" — updated with new columns and constraints');

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
