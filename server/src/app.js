const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { query } = require('./db');
const { authRequired, signToken } = require('./auth');
const { SLOTS, validateReading, summarizeReadings, isValidDate } = require('./validation');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const userQuery = (result) => result.rows[0];

app.get('/api/health', async (req, res, next) => {
  try {
    await query('SELECT 1');
    return res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ message: 'Name, email, and a password of at least 8 characters are required.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await query('INSERT INTO users (name, email, password_hash) VALUES ($1, LOWER($2), $3) RETURNING id, name, email', [name.trim(), email.trim(), hash]);
    const user = userQuery(result);
    return res.status(201).json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with that email already exists.' });
    return next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, password_hash FROM users WHERE email = LOWER($1)', [req.body.email || '']);
    const user = userQuery(result);
    if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/auth/me', authRequired, async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    if (!userQuery(result)) return res.status(401).json({ message: 'User account not found.' });
    return res.json({ user: publicUser(userQuery(result)) });
  } catch (error) { return next(error); }
});

app.get('/api/readings', authRequired, async (req, res, next) => {
  try {
    const params = [req.user.id];
    let sql = 'SELECT id, reading_date AS date, slot, value FROM readings WHERE user_id = $1';
    if (req.query.date) { params.push(req.query.date); sql += ` AND reading_date = $${params.length}`; }
    sql += ' ORDER BY reading_date DESC, slot_order ASC';
    const result = await query(sql, params);
    return res.json({ readings: result.rows });
  } catch (error) { return next(error); }
});

app.post('/api/readings', authRequired, async (req, res, next) => {
  try {
    const errors = validateReading(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: Object.values(errors)[0], errors });
    const countResult = await query('SELECT COUNT(*)::int AS count FROM readings WHERE user_id = $1 AND reading_date = $2', [req.user.id, req.body.date]);
    if (countResult.rows[0].count >= 4) return res.status(409).json({ message: 'You can add only 4 readings per day.' });
    try {
      const result = await query('INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4) RETURNING id, reading_date AS date, slot, value', [req.user.id, req.body.date, req.body.slot, Number(req.body.value)]);
      return res.status(201).json({ reading: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ message: `You already have an ${req.body.slot.replace('_', ' ')} reading for this date.` });
      throw error;
    }
  } catch (error) { return next(error); }
});

app.put('/api/readings/:id', authRequired, async (req, res, next) => {
  try {
    const errors = validateReading(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ message: Object.values(errors)[0], errors });
    try {
      const result = await query('UPDATE readings SET reading_date = $1, slot = $2, value = $3 WHERE id = $4 AND user_id = $5 RETURNING id, reading_date AS date, slot, value', [req.body.date, req.body.slot, Number(req.body.value), req.params.id, req.user.id]);
      if (!result.rows[0]) return res.status(404).json({ message: 'Reading not found.' });
      return res.json({ reading: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ message: 'You already have a reading for this slot and date.' });
      throw error;
    }
  } catch (error) { return next(error); }
});

app.delete('/api/readings/:id', authRequired, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Reading not found.' });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

async function report(req, res, next, type) {
  try {
    const selected = req.query.date || new Date().toISOString().slice(0, 10);
    if (!isValidDate(selected)) return res.status(400).json({ message: 'Please choose a valid date.' });
    const date = new Date(`${selected}T00:00:00Z`);
    let from = selected; let to = selected; let label = selected;
    if (type === 'month-to-date') { from = `${selected.slice(0, 8)}01`; label = `${from} – ${selected}`; }
    if (type === 'monthly') {
      const previous = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
      from = previous.toISOString().slice(0, 10);
      to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0)).toISOString().slice(0, 10);
      label = `${from} – ${to}`;
    }
    const result = await query('SELECT id, reading_date AS date, slot, value FROM readings WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3 ORDER BY reading_date ASC, slot_order ASC', [req.user.id, from, to]);
    return res.json({ type, from, to, label, summary: summarizeReadings(result.rows), readings: result.rows });
  } catch (error) { return next(error); }
}
app.get('/api/reports/daily', authRequired, (req, res, next) => report(req, res, next, 'daily'));
app.get('/api/reports/month-to-date', authRequired, (req, res, next) => report(req, res, next, 'month-to-date'));
app.get('/api/reports/monthly', authRequired, (req, res, next) => report(req, res, next, 'monthly'));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = app;
