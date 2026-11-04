require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

pool.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'))
  .then(() => { console.log('Database schema is ready.'); return pool.end(); })
  .catch((error) => { console.error(error); return pool.end().then(() => process.exit(1)); });
