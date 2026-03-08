const { Pool } = require('pg');

let dbUrl = 'postgresql://postgres:uwQEXHPAconTjwGQmoJlnPKvQaNjJsSv@turntable.proxy.rlwy.net:41264/railway?sslmode=require';
dbUrl = dbUrl.replace('?sslmode=require', '');

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});
pool.connect().then(() => console.log('SUCCESS')).catch(e => console.error('FAIL:', e.message)).finally(() => process.exit(0));
