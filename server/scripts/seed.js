require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db');

async function seed() {
  const hash = await bcrypt.hash('Sweety123!', 12);
  const user = (await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id', ['Demo Patient', 'demo@sweety.app', hash])).rows[0];
  await pool.query('DELETE FROM readings WHERE user_id = $1', [user.id]);
  const samples = [
    ['2026-10-01', 'morning', 112], ['2026-10-01', 'after_lunch', 148],
    ['2026-10-02', 'morning', 105], ['2026-10-02', 'after_dinner', 132],
    ['2026-10-03', 'morning', 98], ['2026-10-03', 'after_breakfast', 126],
    ['2026-10-04', 'morning', 101], ['2026-10-04', 'after_lunch', 139]
  ];
  for (const sample of samples) await pool.query('INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)', [user.id, ...sample]);
  console.log('Seeded demo@sweety.app / Sweety123!');
  await pool.end();
}
seed().catch((error) => { console.error(error); pool.end().then(() => process.exit(1)); });
