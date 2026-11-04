import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

const API = import.meta.env.VITE_API_URL;
const slots = [
  { value: 'morning', label: 'Morning', hint: 'Fasting' },
  { value: 'after_breakfast', label: 'After breakfast', hint: '' },
  { value: 'after_lunch', label: 'After lunch', hint: '' },
  { value: 'after_dinner', label: 'After dinner', hint: '' }
];
const today = new Date().toISOString().slice(0, 10);
const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

async function request(path, options = {}) {
  const token = localStorage.getItem('sweety_token');
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const data = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) }); localStorage.setItem('sweety_token', data.token); onLogin(data.user); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card"><div className="brand"><span className="brand-mark">✦</span><span>Sweety</span></div><p className="eyebrow">YOUR GENTLE GLUCOSE COMPANION</p><h1>{mode === 'login' ? 'Welcome back.' : 'Start your journey.'}</h1><p className="muted">{mode === 'login' ? 'A calmer way to understand your numbers.' : 'Keep your health story in one simple place.'}</p><form onSubmit={submit}>{mode === 'register' && <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}<label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label><label>Password<input required minLength="8" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>{error && <div className="alert">{error}</div>}<button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button></form><button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'New to Sweety? Create an account' : 'Already have an account? Log in'}</button></section></main>;
}

function Stat({ label, value, unit }) { return <div className="stat"><span>{label}</span><strong>{value ?? '—'}{value !== null && value !== undefined && <small>{unit}</small>}</strong></div>; }

function ReadingForm({ selectedDate, editing, onSaved, onCancel }) {
  const [form, setForm] = useState(editing || { date: selectedDate, slot: 'morning', value: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => setForm(editing || { date: selectedDate, slot: 'morning', value: '' }), [editing, selectedDate]);
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { await request(editing ? `/readings/${editing.id}` : '/readings', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ ...form, value: Number(form.value) }) }); onSaved(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <form className="reading-form" onSubmit={submit}><div className="form-heading"><div><p className="eyebrow">{editing ? 'UPDATE READING' : 'NEW READING'}</p><h2>{editing ? 'Edit your reading' : 'How are you feeling?'}</h2></div>{editing && <button type="button" className="icon-button" onClick={onCancel}>×</button>}</div><label>Date<input type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Time slot<select value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>{slots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}{slot.hint ? ` (${slot.hint})` : ''}</option>)}</select></label><label>Glucose value <span className="unit">mg/dl</span><input type="number" min="40" max="600" step="1" required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. 105" /></label>{error && <div className="alert">{error}</div>}<button className="primary full" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add reading'}</button></form>;
}

function App() {
  const [user, setUser] = useState(null); const [selectedDate, setSelectedDate] = useState(today); const [readings, setReadings] = useState([]); const [report, setReport] = useState(null); const [period, setPeriod] = useState('daily'); const [editing, setEditing] = useState(null); const [toast, setToast] = useState('');
  useEffect(() => { if (localStorage.getItem('sweety_token')) request('/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem('sweety_token')); }, []);
  async function load() { const [list, summary] = await Promise.all([request(`/readings?date=${selectedDate}`), request(`/reports/${period}?date=${selectedDate}`)]); setReadings(list.readings); setReport(summary); }
  useEffect(() => { if (user) load().catch((e) => setToast(e.message)); }, [user, selectedDate, period]);
  const chartData = useMemo(() => (report?.readings || []).map((r) => ({ date: r.date.slice(5), value: Number(r.value) })), [report]);
  async function remove(id) { if (!window.confirm('Delete this reading?')) return; try { await request(`/readings/${id}`, { method: 'DELETE' }); setToast('Reading deleted.'); load(); } catch (e) { setToast(e.message); } }
  if (!user) return <Auth onLogin={setUser} />;
  return <div className="app-shell"><header><div className="brand"><span className="brand-mark">✦</span><span>Sweety</span></div><div className="header-user"><span>Hi, {user.name.split(' ')[0]}</span><button className="text-button" onClick={() => { localStorage.removeItem('sweety_token'); setUser(null); }}>Log out</button></div></header><main className="dashboard"><section className="welcome"><div><p className="eyebrow">YOUR HEALTH, YOUR RHYTHM</p><h1>Good morning, {user.name.split(' ')[0]} <span>✦</span></h1><p className="muted">Small steps, steady progress. You’re doing great.</p></div><label className="date-picker">Viewing <input type="date" max={today} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></label></section><div className="dashboard-grid"><div className="left-column"><section className="panel report-panel"><div className="panel-head"><div><p className="eyebrow">GLUCOSE OVERVIEW</p><h2>{period === 'daily' ? formatDate(selectedDate) : report?.label}</h2></div><select className="period-select" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="daily">Daily report</option><option value="month-to-date">Month to date</option><option value="monthly">Previous month</option></select></div><div className="stats"><Stat label="Highest" value={report?.summary.highest} unit=" mg/dl" /><Stat label="Lowest" value={report?.summary.lowest} unit=" mg/dl" /><Stat label="Average" value={report?.summary.average} unit=" mg/dl" /><Stat label="Readings" value={report?.summary.count} /></div>{chartData.length > 1 && <div className="chart"><ResponsiveContainer width="100%" height={190}><AreaChart data={chartData}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f08c76" stopOpacity=".35" /><stop offset="100%" stopColor="#f08c76" stopOpacity="0" /></linearGradient></defs><XAxis dataKey="date" axisLine={false} tickLine={false} /><YAxis hide domain={['dataMin - 20', 'dataMax + 20']} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#e77862" strokeWidth={3} fill="url(#fill)" /></AreaChart></ResponsiveContainer></div>}</section><section className="panel"><div className="panel-head"><div><p className="eyebrow">DAILY LOG</p><h2>{formatDate(selectedDate)}</h2></div><span className="count-pill">{readings.length}/4 readings</span></div>{readings.length ? <div className="reading-list">{readings.map((reading) => <div className="reading-row" key={reading.id}><span className={`slot-dot ${reading.slot}`} /><div className="reading-name"><strong>{slots.find((s) => s.value === reading.slot)?.label}</strong><small>{reading.slot === 'morning' ? 'Fasting' : 'Recorded for this day'}</small></div><strong className="reading-value">{reading.value} <small>mg/dl</small></strong><button className="row-action" onClick={() => setEditing(reading)}>Edit</button><button className="row-action danger" onClick={() => remove(reading.id)}>Delete</button></div>)}</div> : <div className="empty"><span>☼</span><h3>No readings yet</h3><p>Your first reading will appear here. You’ve got this!</p></div>}</section></div><aside><ReadingForm selectedDate={selectedDate} editing={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setToast('Reading saved.'); load(); }} /><div className="tip"><span>♡</span><div><strong>A gentle reminder</strong><p>Try to measure around the same times each day for the clearest picture.</p></div></div></aside></div></main>{toast && <button className="toast" onClick={() => setToast('')}>{toast} <b>×</b></button>}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
