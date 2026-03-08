process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:uwQEXHPAconTjwGQmoJlnPKvQaNjJsSv@turntable.proxy.rlwy.net:41264/railway?sslmode=require',
});
pool.connect().then(() => console.log('SUCCESS')).catch(e => console.error('FAIL:', e.message)).finally(() => process.exit(0));
