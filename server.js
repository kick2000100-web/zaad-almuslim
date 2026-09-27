const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database(process.env.DB_PATH || './data/zaad.db');

// جداول قاعدة البيانات
db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
db.run(`CREATE TABLE IF NOT EXISTS surahs (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL, verses INTEGER NOT NULL, juz INTEGER NOT NULL, status TEXT DEFAULT 'verified')`);
db.run(`CREATE TABLE IF NOT EXISTS athkar (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, text TEXT NOT NULL, count INTEGER DEFAULT 1, source TEXT NOT NULL, status TEXT DEFAULT 'review', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
db.run(`CREATE TABLE IF NOT EXISTS hadith (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, text TEXT NOT NULL, source TEXT NOT NULL, status TEXT DEFAULT 'review', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
db.run(`CREATE TABLE IF NOT EXISTS lectures (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, speaker TEXT NOT NULL, category TEXT NOT NULL, description TEXT, audio_url TEXT, video_url TEXT, source TEXT NOT NULL, status TEXT DEFAULT 'review', duration INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
db.run(`CREATE TABLE IF NOT EXISTS interpretations (id INTEGER PRIMARY KEY AUTOINCREMENT, surah_id INTEGER NOT NULL, verse_start INTEGER, verse_end INTEGER, text TEXT NOT NULL, source TEXT NOT NULL, status TEXT DEFAULT 'review', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(surah_id) REFERENCES surahs(id))`);
db.run(`CREATE TABLE IF NOT EXISTS fiqh (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL, text TEXT NOT NULL, source TEXT NOT NULL, status TEXT DEFAULT 'review', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, instructor TEXT NOT NULL, description TEXT, level TEXT, lessons_count INTEGER, status TEXT DEFAULT 'review', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
db.run(`CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, prayer_fajr BOOLEAN DEFAULT 0, prayer_dhuhr BOOLEAN DEFAULT 0, prayer_asr BOOLEAN DEFAULT 0, prayer_maghrib BOOLEAN DEFAULT 0, prayer_isha BOOLEAN DEFAULT 0, athkar_morning BOOLEAN DEFAULT 0, athkar_evening BOOLEAN DEFAULT 0, quran_read BOOLEAN DEFAULT 0, FOREIGN KEY(user_id) REFERENCES users(id), UNIQUE(user_id, date))`);
db.run(`CREATE TABLE IF NOT EXISTS tasbeeh_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, count INTEGER DEFAULT 0, date TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id), UNIQUE(user_id, date))`);
db.run(`CREATE TABLE IF NOT EXISTS lecture_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, lecture_id INTEGER NOT NULL, watched BOOLEAN DEFAULT 0, timestamp INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(lecture_id) REFERENCES lectures(id), UNIQUE(user_id, lecture_id))`);

function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(403).json({ error: 'توكن غير صحيح' });
  }
}

// المصادقة
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'البيانات المطلوبة ناقصة' });
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, 'user'], function(err) {
    if (err) return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
    const token = generateToken(this.lastID, 'user');
    res.json({ token, userId: this.lastID, role: 'user' });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'البيانات المطلوبة ناقصة' });
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    const token = generateToken(user.id, user.role);
    res.json({ token, userId: user.id, role: user.role });
  });
});

// المحتوى العام
app.get('/api/content/surahs', (req, res) => {
  db.all('SELECT * FROM surahs WHERE status = ? ORDER BY id', ['verified'], (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/athkar', (req, res) => {
  const category = req.query.category || 'all';
  const query = category === 'all' ? 'SELECT * FROM athkar WHERE status = ? ORDER BY category, id' : 'SELECT * FROM athkar WHERE category = ? AND status = ? ORDER BY id';
  const params = category === 'all' ? ['verified'] : [category, 'verified'];
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/hadith', (req, res) => {
  db.all('SELECT * FROM hadith WHERE status = ? ORDER BY id LIMIT 100', ['verified'], (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/lectures', (req, res) => {
  const category = req.query.category ? `WHERE category = ?` : '';
  const params = req.query.category ? [req.query.category, 'verified'] : ['verified'];
  db.all(`SELECT * FROM lectures ${category} AND status = ? ORDER BY created_at DESC LIMIT 100`, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/interpretations/:surah_id', (req, res) => {
  db.all('SELECT * FROM interpretations WHERE surah_id = ? AND status = ? ORDER BY verse_start', [req.params.surah_id, 'verified'], (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/fiqh', (req, res) => {
  const category = req.query.category ? `WHERE category = ?` : '';
  const params = req.query.category ? [req.query.category, 'verified'] : ['verified'];
  db.all(`SELECT * FROM fiqh ${category} AND status = ? ORDER BY id LIMIT 100`, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/courses', (req, res) => {
  db.all('SELECT * FROM courses WHERE status = ? ORDER BY created_at DESC LIMIT 50', ['verified'], (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

// البحث الموحد
app.get('/api/search', (req, res) => {
  const term = `%${req.query.q || ''}%`;
  const results = {};
  db.all('SELECT id, name, type, verses FROM surahs WHERE name LIKE ? AND status = ?', [term, 'verified'], (err, surahs) => {
    results.surahs = surahs || [];
    db.all('SELECT id, text, category, source FROM athkar WHERE text LIKE ? AND status = ?', [term, 'verified'], (err, athkar) => {
      results.athkar = athkar || [];
      db.all('SELECT id, title, source FROM hadith WHERE title LIKE ? AND status = ? LIMIT 20', [term, 'verified'], (err, hadith) => {
        results.hadith = hadith || [];
        db.all('SELECT id, title, speaker FROM lectures WHERE title LIKE ? AND status = ? LIMIT 20', [term, 'verified'], (err, lectures) => {
          results.lectures = lectures || [];
          db.all('SELECT id, title FROM fiqh WHERE title LIKE ? AND status = ? LIMIT 20', [term, 'verified'], (err, fiqh) => {
            results.fiqh = fiqh || [];
            res.json(results);
          });
        });
      });
    });
  });
});

// متابعة المستخدم
app.post('/api/progress/save', verifyToken, (req, res) => {
  const { date, data } = req.body;
  db.run(
    `INSERT OR REPLACE INTO user_progress (user_id, date, prayer_fajr, prayer_dhuhr, prayer_asr, prayer_maghrib, prayer_isha, athkar_morning, athkar_evening, quran_read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.userId, date, data.prayer_fajr || 0, data.prayer_dhuhr || 0, data.prayer_asr || 0, data.prayer_maghrib || 0, data.prayer_isha || 0, data.athkar_morning || 0, data.athkar_evening || 0, data.quran_read || 0],
    (err) => {
      if (err) return res.status(500).json({ error: 'خطأ في الحفظ' });
      res.json({ success: true });
    }
  );
});

app.get('/api/progress/:date', verifyToken, (req, res) => {
  db.get('SELECT * FROM user_progress WHERE user_id = ? AND date = ?', [req.user.userId, req.params.date], (err, row) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(row || {});
  });
});

app.post('/api/lecture/watch', verifyToken, (req, res) => {
  const { lecture_id, timestamp } = req.body;
  db.run(
    'INSERT OR REPLACE INTO lecture_progress (user_id, lecture_id, watched, timestamp) VALUES (?, ?, 1, ?)',
    [req.user.userId, lecture_id, timestamp || 0],
    (err) => {
      if (err) return res.status(500).json({ error: 'خطأ في الحفظ' });
      res.json({ success: true });
    }
  );
});

// الإدارة
app.post('/api/admin/content/lectures', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.status(403).json({ error: 'لا توجد صلاحيات' });
  const { title, speaker, category, description, audio_url, video_url, source, duration } = req.body;
  db.run(
    'INSERT INTO lectures (title, speaker, category, description, audio_url, video_url, source, status, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, speaker, category, description, audio_url, video_url, source, 'review', duration || 0],
    function(err) {
      if (err) return res.status(500).json({ error: 'خطأ في الإنشاء' });
      res.json({ id: this.lastID, status: 'review', message: 'قيد المراجعة' });
    }
  );
});

app.put('/api/admin/content/lectures/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'reviewer') return res.status(403).json({ error: 'لا توجد صلاحيات' });
  const { status } = req.body;
  db.run('UPDATE lectures SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'خطأ التحديث' });
    res.json({ success: true, status });
  });
});

app.post('/api/admin/content/fiqh', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.status(403).json({ error: 'لا توجد صلاحيات' });
  const { title, category, text, source } = req.body;
  db.run(
    'INSERT INTO fiqh (title, category, text, source, status) VALUES (?, ?, ?, ?, ?)',
    [title, category, text, source, 'review'],
    function(err) {
      if (err) return res.status(500).json({ error: 'خطأ في الإنشاء' });
      res.json({ id: this.lastID, status: 'review', message: 'قيد المراجعة' });
    }
  );
});

app.put('/api/admin/content/fiqh/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'reviewer') return res.status(403).json({ error: 'لا توجد صلاحيات' });
  const { status } = req.body;
  db.run('UPDATE fiqh SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'خطأ التحديث' });
    res.json({ success: true, status });
  });
});

app.post('/api/admin/content/courses', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') return res.status(403).json({ error: 'لا توجد صلاحيات' });
  const { title, instructor, description, level, lessons_count } = req.body;
  db.run(
    'INSERT INTO courses (title, instructor, description, level, lessons_count, status) VALUES (?, ?, ?, ?, ?, ?)',
    [title, instructor, description, level, lessons_count, 'review'],
    function(err) {
      if (err) return res.status(500).json({ error: 'خطأ في الإنشاء' });
      res.json({ id: this.lastID, status: 'review', message: 'قيد المراجعة' });
    }
  );
});

app.put('/api/admin/content/courses/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'reviewer') return res.status(403).json({ error: 'لا توجد صلاحيات' });
  const { status } = req.body;
  db.run('UPDATE courses SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'خطأ التحديث' });
    res.json({ success: true, status });
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
