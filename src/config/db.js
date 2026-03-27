const { Pool } = require('pg');
const path = require('path');

// Try loading .env file (won't exist on Render/Docker — env vars set via dashboard)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Log missing critical env vars to help debug deployment issues
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.error('Set these in Render Dashboard > Environment > Environment Variables');
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ''),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
  // Do NOT call process.exit() here — it crashes the entire server on Render
});

// Startup connection test
pool.query('SELECT NOW()')
  .then(res => console.log(`✅ DB connection verified at ${res.rows[0].now}`))
  .catch(err => console.error(`❌ DB connection failed: ${err.message}`));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
