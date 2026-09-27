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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database initialization
const db = new sqlite3.Database(process.env.DB_PATH || './data/zaad.db');

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS surahs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    verses INTEGER NOT NULL,
    juz INTEGER NOT NULL,
    status TEXT DEFAULT 'verified'
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS athkar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    text TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    source TEXT NOT NULL,
    status TEXT DEFAULT 'review',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS hadith (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT DEFAULT 'review',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    prayer_fajr BOOLEAN DEFAULT 0,
    prayer_dhuhr BOOLEAN DEFAULT 0,
    prayer_asr BOOLEAN DEFAULT 0,
    prayer_maghrib BOOLEAN DEFAULT 0,
    prayer_isha BOOLEAN DEFAULT 0,
    athkar_morning BOOLEAN DEFAULT 0,
    athkar_evening BOOLEAN DEFAULT 0,
    quran_read BOOLEAN DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS tasbeeh_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    count INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, date)
  )
`);

// Utility: Token generation
function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware: Verify JWT
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

// Endpoints: Authentication
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'البيانات المطلوبة ناقصة' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username, email, hashedPassword, 'user'],
    function(err) {
      if (err) return res.status(400).json({ error: 'المستخدم موجود بالفعل' });
      const token = generateToken(this.lastID, 'user');
      res.json({ token, userId: this.lastID, role: 'user' });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'البيانات المطلوبة ناقصة' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'بيانات دخول غير صحيحة' });
    }
    const token = generateToken(user.id, user.role);
    res.json({ token, userId: user.id, role: user.role });
  });
});

// Endpoints: Content (Public Read)
app.get('/api/content/surahs', (req, res) => {
  db.all('SELECT * FROM surahs WHERE status = ? ORDER BY id', ['verified'], (err, rows) => {
    if (err) return res.status(500).json({ error: 'خطأ قاعدة البيانات' });
    res.json(rows || []);
  });
});

app.get('/api/content/athkar', (req, res) => {
  const category = req.query.category || 'all';
  const query = category === 'all' 
    ? 'SELECT * FROM athkar WHERE status = ? ORDER BY category, id'
    : 'SELECT * FROM athkar WHERE category = ? AND status = ? ORDER BY id';
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

// Endpoints: Search
app.get('/api/search', (req, res) => {
  const term = `%${req.query.q || ''}%`;
  const results = {};
  
  db.all('SELECT id, name, type, verses FROM surahs WHERE name LIKE ? AND status = ?', [term, 'verified'], (err, surahs) => {
    results.surahs = surahs || [];
    db.all('SELECT id, text, category, source FROM athkar WHERE text LIKE ? AND status = ?', [term, 'verified'], (err, athkar) => {
      results.athkar = athkar || [];
      db.all('SELECT id, title, source FROM hadith WHERE title LIKE ? OR text LIKE ? AND status = ?', [term, term, 'verified'], (err, hadith) => {
        results.hadith = hadith || [];
        res.json(results);
      });
    });
  });
});

// Endpoints: User Progress
app.post('/api/progress/save', verifyToken, (req, res) => {
  const { date, data } = req.body;
  db.run(
    `INSERT OR REPLACE INTO user_progress 
     (user_id, date, prayer_fajr, prayer_dhuhr, prayer_asr, prayer_maghrib, prayer_isha, athkar_morning, athkar_evening, quran_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.userId, date, 
     data.prayer_fajr || 0, data.prayer_dhuhr || 0, data.prayer_asr || 0, data.prayer_maghrib || 0, data.prayer_isha || 0,
     data.athkar_morning || 0, data.athkar_evening || 0, data.quran_read || 0],
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

// Endpoints: Admin (Protected)
app.post('/api/admin/content/athkar', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({ error: 'لا توجد صلاحيات' });
  }
  const { category, text, count, source } = req.body;
  db.run(
    'INSERT INTO athkar (category, text, count, source, status) VALUES (?, ?, ?, ?, ?)',
    [category, text, count, source, 'review'],
    function(err) {
      if (err) return res.status(500).json({ error: 'خطأ في الإنشاء' });
      res.json({ id: this.lastID, status: 'review', message: 'قيد المراجعة' });
    }
  );
});

app.put('/api/admin/content/athkar/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'reviewer') {
    return res.status(403).json({ error: 'لا توجد صلاحيات' });
  }
  const { status } = req.body;
  db.run('UPDATE athkar SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'خطأ التحديث' });
    res.json({ success: true, status });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
