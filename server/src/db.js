const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Check Render environment variables.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Supabase PostgreSQL requires SSL.
  ssl: {
    rejectUnauthorized: false
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
