const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) console.warn('WARNING: Set a JWT_SECRET of at least 32 characters in production.');
const DB_PATH = path.resolve(process.env.DB_PATH || './data/zaad.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DB_PATH);
db.configure('busyTimeout', 5000);
const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { err ? reject(err) : resolve(this); }));
const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS surahs (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL, verses INTEGER NOT NULL, juz INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'verified')`,
  `CREATE TABLE IF NOT EXISTS athkar (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, text TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'review', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS hadith (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, text TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'review', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS lectures (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, speaker TEXT NOT NULL, category TEXT NOT NULL, description TEXT, audio_url TEXT, video_url TEXT, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'review', duration INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS interpretations (id INTEGER PRIMARY KEY AUTOINCREMENT, surah_id INTEGER NOT NULL, verse_start INTEGER NOT NULL, verse_end INTEGER NOT NULL, text TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'review', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS fiqh (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL, text TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'review', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, instructor TEXT NOT NULL, description TEXT, level TEXT, lessons_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'review', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', UNIQUE(user_id,date))`,
  `CREATE TABLE IF NOT EXISTS lecture_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lecture_id INTEGER NOT NULL, watched INTEGER NOT NULL DEFAULT 0, timestamp INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id,lecture_id))`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
];

function tokenFor(user) { return jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET || 'development-only-change-me', { expiresIn: '7d' }); }
function auth(req, res, next) { const raw = req.headers.authorization || ''; try { if (!raw.startsWith('Bearer ')) throw Error(); req.user = jwt.verify(raw.slice(7), JWT_SECRET || 'development-only-change-me'); next(); } catch { res.status(401).json({ error: 'جلسة غير صالحة' }); } }
function roles(...allowed) { return (req, res, next) => allowed.includes(req.user.role) ? next() : res.status(403).json({ error: 'لا توجد صلاحية لهذه العملية' }); }
function text(value, max = 5000) { return typeof value === 'string' && value.trim().length > 0 && value.length <= max; }
function page(req) { const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100); const offset = Math.max(Number(req.query.offset) || 0, 0); return { limit, offset }; }
function sendError(res, err) { console.error(err); res.status(500).json({ error: 'حدث خطأ داخلي' }); }

async function init() { for (const sql of schema) await run(sql); }

app.post('/api/auth/register', async (req, res) => { try { const { username, email, password } = req.body || {}; if (!text(username, 80) || !/^\S+@\S+\.\S+$/.test(email || '') || !text(password, 200) || password.length < 8) return res.status(400).json({ error: 'أدخل اسمًا وبريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل' }); const hash = await bcrypt.hash(password, 12); const result = await run('INSERT INTO users(username,email,password) VALUES(?,?,?)', [username.trim(), email.toLowerCase().trim(), hash]); const user = { id: result.lastID, role: 'user' }; res.status(201).json({ token: tokenFor(user), userId: user.id, role: user.role }); } catch (e) { res.status(409).json({ error: 'البريد أو اسم المستخدم مستخدم بالفعل' }); } });
app.post('/api/auth/login', async (req, res) => { try { const user = await get('SELECT * FROM users WHERE email = ?', [(req.body.email || '').toLowerCase().trim()]); if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' }); res.json({ token: tokenFor(user), userId: user.id, role: user.role, username: user.username }); } catch (e) { sendError(res, e); } });
app.get('/api/auth/me', auth, async (req, res) => { const user = await get('SELECT id,username,email,role,created_at FROM users WHERE id=?', [req.user.userId]); user ? res.json(user) : res.status(404).json({ error: 'المستخدم غير موجود' }); });

const contentConfig = { surahs: ['surahs', 'id,name,type,verses,juz'], athkar: ['athkar', '*'], hadith: ['hadith', '*'], lectures: ['lectures', '*'], fiqh: ['fiqh', '*'], courses: ['courses', '*'] };
app.get('/api/content/:type', async (req, res) => { try { const config = contentConfig[req.params.type]; if (!config) return res.status(404).json({ error: 'نوع محتوى غير معروف' }); const { limit, offset } = page(req); const filters = ['status = ?']; const params = ['verified']; if (req.query.category && ['athkar', 'lectures', 'fiqh'].includes(req.params.type)) { filters.push('category = ?'); params.push(req.query.category); } const order = req.params.type === 'surahs' ? 'id ASC' : 'created_at DESC'; const rows = await all(`SELECT ${config[1]} FROM ${config[0]} WHERE ${filters.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]); res.json(rows); } catch (e) { sendError(res, e); } });
app.get('/api/content/interpretations/:surahId', async (req, res) => { try { res.json(await all('SELECT * FROM interpretations WHERE surah_id=? AND status=? ORDER BY verse_start', [req.params.surahId, 'verified'])); } catch (e) { sendError(res, e); } });

app.get('/api/search', async (req, res) => { try { const q = String(req.query.q || '').trim(); if (q.length < 2) return res.json({ results: [], total: 0 }); const term = `%${q}%`; const { limit, offset } = page(req); const queries = [
  ['surahs', 'SELECT id,name AS title,type AS meta FROM surahs WHERE status=? AND name LIKE ?'],
  ['athkar', 'SELECT id,text AS title,source AS meta FROM athkar WHERE status=? AND (text LIKE ? OR source LIKE ?)'],
  ['hadith', 'SELECT id,title,source AS meta FROM hadith WHERE status=? AND (title LIKE ? OR text LIKE ?)'],
  ['lectures', 'SELECT id,title,speaker AS meta FROM lectures WHERE status=? AND (title LIKE ? OR speaker LIKE ? OR description LIKE ?)'],
  ['fiqh', 'SELECT id,title,source AS meta FROM fiqh WHERE status=? AND (title LIKE ? OR text LIKE ?)'],
  ['courses', 'SELECT id,title,instructor AS meta FROM courses WHERE status=? AND (title LIKE ? OR instructor LIKE ?)']
 ]; const results = []; for (const [type, sql] of queries) { const placeholders = (sql.match(/\?/g) || []).length - 1; results.push(...(await all(`${sql} LIMIT ? OFFSET ?`, ['verified', ...Array(placeholders).fill(term), limit, offset])).map(x => ({ ...x, type }))); } res.json({ results, total: results.length }); } catch (e) { sendError(res, e); } });

app.post('/api/progress/save', auth, async (req, res) => { try { const date = String(req.body.date || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !req.body.data || typeof req.body.data !== 'object') return res.status(400).json({ error: 'بيانات التقدم غير صالحة' }); await run('INSERT INTO user_progress(user_id,date,data) VALUES(?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET data=excluded.data', [req.user.userId, date, JSON.stringify(req.body.data)]); res.json({ success: true }); } catch (e) { sendError(res, e); } });
app.get('/api/progress/:date', auth, async (req, res) => { try { const row = await get('SELECT date,data FROM user_progress WHERE user_id=? AND date=?', [req.user.userId, req.params.date]); res.json(row ? { date: row.date, data: JSON.parse(row.data) } : { date: req.params.date, data: {} }); } catch (e) { sendError(res, e); } });
app.post('/api/lecture/watch', auth, async (req, res) => { try { const id = Number(req.body.lecture_id); const timestamp = Math.max(Number(req.body.timestamp) || 0, 0); if (!id) return res.status(400).json({ error: 'محاضرة غير صالحة' }); await run('INSERT INTO lecture_progress(user_id,lecture_id,watched,timestamp) VALUES(?,?,?,?) ON CONFLICT(user_id,lecture_id) DO UPDATE SET watched=excluded.watched,timestamp=excluded.timestamp', [req.user.userId, id, req.body.watched ? 1 : 0, timestamp]); res.json({ success: true }); } catch (e) { sendError(res, e); } });

const tables = { athkar: ['category,text,count,source', ['category','text','source']], lectures: ['title,speaker,category,description,audio_url,video_url,source,duration', ['title','speaker','category','source']], fiqh: ['title,category,text,source', ['title','category','text','source']], courses: ['title,instructor,description,level,lessons_count', ['title','instructor']] };
for (const [type, [columns, required]] of Object.entries(tables)) { app.post(`/api/admin/content/${type}`, auth, roles('admin','editor','content_manager'), async (req, res) => { try { if (required.some(k => !text(String(req.body[k] ?? ''), 10000))) return res.status(400).json({ error: 'حقول مطلوبة ناقصة' }); const values = columns.split(',').map(k => req.body[k] ?? ''); const result = await run(`INSERT INTO ${type}(${columns},status) VALUES(${values.map(() => '?').join(',')},?)`, [...values, 'review']); await run('INSERT INTO audit_logs(user_id,action,entity,entity_id) VALUES(?,?,?,?)', [req.user.userId, 'create', type, result.lastID]); res.status(201).json({ id: result.lastID, status: 'review' }); } catch (e) { sendError(res, e); } }); app.put(`/api/admin/content/${type}/:id`, auth, roles('admin','reviewer'), async (req, res) => { try { const allowed = ['review','verified','rejected','archived']; if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'حالة غير صالحة' }); await run(`UPDATE ${type} SET status=? WHERE id=?`, [req.body.status, req.params.id]); await run('INSERT INTO audit_logs(user_id,action,entity,entity_id) VALUES(?,?,?,?)', [req.user.userId, 'status', type, req.params.id]); res.json({ success: true, status: req.body.status }); } catch (e) { sendError(res, e); } }); }

app.get('/api/admin/review', auth, roles('admin','reviewer','content_manager'), async (req, res) => { try { const out = {}; for (const type of Object.keys(tables)) out[type] = await all(`SELECT * FROM ${type} WHERE status='review' ORDER BY created_at DESC LIMIT 100`); res.json(out); } catch (e) { sendError(res, e); } });
app.get('/api/health', async (req, res) => { try { await get('SELECT 1 AS ok'); res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() }); } catch { res.status(503).json({ status: 'error' }); } });
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
init().then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))).catch(err => { console.error(err); process.exit(1); });
