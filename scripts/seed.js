#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data', 'zaad.db'));

// Seed initial data
const surahs = [
  { id: 1, name: 'الفاتحة', type: 'مكية', verses: 7, juz: 1 },
  { id: 2, name: 'البقرة', type: 'مدنية', verses: 286, juz: 1 },
  { id: 3, name: 'آل عمران', type: 'مدنية', verses: 200, juz: 3 },
  { id: 4, name: 'النساء', type: 'مدنية', verses: 176, juz: 4 },
  { id: 5, name: 'المائدة', type: 'مدنية', verses: 120, juz: 6 },
  { id: 18, name: 'الكهف', type: 'مكية', verses: 110, juz: 15 },
  { id: 36, name: 'يس', type: 'مكية', verses: 83, juz: 22 },
  { id: 55, name: 'الرحمن', type: 'مدنية', verses: 78, juz: 27 },
  { id: 67, name: 'الملك', type: 'مكية', verses: 30, juz: 29 },
  { id: 112, name: 'الإخلاص', type: 'مكية', verses: 4, juz: 30 }
];

const athkar = [
  { category: 'morning', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 3, source: 'سنن ابن ماجه' },
  { category: 'morning', text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ', count: 1, source: 'سنن الترمذي' },
  { category: 'evening', text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ', count: 1, source: 'سنن الترمذي' },
  { category: 'evening', text: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ', count: 3, source: 'صحيح مسلم' },
  { category: 'sleep', text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي', count: 1, source: 'صحيح البخاري' },
  { category: 'prayer', text: 'أَسْتَغْفِرُ اللَّهَ', count: 3, source: 'سنن أبي داود' },
  { category: 'prayer', text: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ', count: 1, source: 'صحيح مسلم' }
];

const hadith = [
  { title: 'بني الإسلام على خمس', text: 'بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ', source: 'متفق عليه' },
  { title: 'من حسن إسلام المرء', text: 'حُسْنُ الإِسْلَامِ: ترك ما لا يعنيه', source: 'رواه الترمذي' },
  { title: 'الرحمة', text: 'مَنْ لَا يَرْحَمْ النَّاسَ لَا يَرْحَمْهُ اللَّهُ', source: 'صحيح البخاري' },
  { title: 'العدل', text: 'العدل أساس الملك', source: 'سنن ابن ماجه' },
  { title: 'طلب العلم', text: 'من يرد الله به خيراً يفقهه في الدين', source: 'صحيح البخاري' }
];

const adminUser = {
  username: 'admin',
  email: 'admin@zaad.local',
  password: bcrypt.hashSync('admin123', 10),
  role: 'admin'
};

db.serialize(() => {
  // Insert surahs
  const surahStmt = db.prepare('INSERT OR REPLACE INTO surahs (id, name, type, verses, juz, status) VALUES (?, ?, ?, ?, ?, ?)');
  surahs.forEach(s => {
    surahStmt.run(s.id, s.name, s.type, s.verses, s.juz, 'verified');
  });
  surahStmt.finalize();

  // Insert athkar
  const athkarStmt = db.prepare('INSERT INTO athkar (category, text, count, source, status) VALUES (?, ?, ?, ?, ?)');
  athkar.forEach(a => {
    athkarStmt.run(a.category, a.text, a.count, a.source, 'verified');
  });
  athkarStmt.finalize();

  // Insert hadith
  const hadithStmt = db.prepare('INSERT INTO hadith (title, text, source, status) VALUES (?, ?, ?, ?)');
  hadith.forEach(h => {
    hadithStmt.run(h.title, h.text, h.source, 'verified');
  });
  hadithStmt.finalize();

  // Insert admin user
  db.run(
    'INSERT OR REPLACE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [adminUser.username, adminUser.email, adminUser.password, adminUser.role],
    function(err) {
      if (err) console.error('Error inserting admin:', err);
      else console.log('✓ Database seeded successfully');
      db.close();
    }
  );
});
