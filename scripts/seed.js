#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data', 'zaad.db'));

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
  { category: 'prayer', text: 'أَسْتَغْفِرُ اللَّهَ', count: 3, source: 'سنن أبي داود' }
];

const hadith = [
  { title: 'بني الإسلام على خمس', text: 'بُنِيَ الإِسْلَامُ عَلَى خَمْسٍ', source: 'متفق عليه' },
  { title: 'من حسن إسلام المرء', text: 'حُسْنُ الإِسْلَامِ: ترك ما لا يعنيه', source: 'رواه الترمذي' },
  { title: 'الرحمة', text: 'مَنْ لَا يَرْحَمْ النَّاسَ لَا يَرْحَمْهُ اللَّهُ', source: 'صحيح البخاري' }
];

const lectures = [
  { title: 'شرح سورة الفاتحة', speaker: 'الشيخ محمد العريفي', category: 'quran', description: 'شرح تفصيلي لسورة الفاتحة', source: 'محاضرات منتقاة', duration: 45 },
  { title: 'أهمية الأذكار في الحياة', speaker: 'الشيخ نواف القنيعي', category: 'athkar', description: 'محاضرة عن فضل الأذكار اليومية', source: 'محاضرات منتقاة', duration: 30 },
  { title: 'مقدمة في الفقه الإسلامي', speaker: 'الدكتور محمود عكاشة', category: 'fiqh', description: 'مقدمة تاريخية في علم الفقه', source: 'محاضرات منتقاة', duration: 50 }
];

const interpretations = [
  { surah_id: 1, verse_start: 1, verse_end: 7, text: 'تفسير سورة الفاتحة كاملة', source: 'تفسير القرطبي' },
  { surah_id: 112, verse_start: 1, verse_end: 4, text: 'تفسير سورة الإخلاص', source: 'تفسير ابن كثير' }
];

const fiqh = [
  { title: 'الطهارة والوضوء', category: 'rituals', text: 'بحث شامل عن الطهارة والوضوء في الإسلام', source: 'مختصر الفقه الإسلامي' },
  { title: 'شروط الصلاة', category: 'rituals', text: 'شروط صحة الصلاة وأحكامها', source: 'الفقه الإسلامي وأدلته' },
  { title: 'أحكام الصيام', category: 'worship', text: 'أحكام الصيام وآدابه في رمضان', source: 'زاد المعاد' }
];

const courses = [
  { title: 'مبادئ القرآن الكريم', instructor: 'د. محمود عكاشة', description: 'دورة تعريفية في دراسة القرآن', level: 'beginner', lessons_count: 10 },
  { title: 'أصول الفقه', instructor: 'د. عبدالعزيز الطريفي', description: 'دراسة أصول الاستنباط الفقهي', level: 'intermediate', lessons_count: 15 },
  { title: 'السيرة النبوية المختصرة', instructor: 'الشيخ محمد العريفي', description: 'رحلة مختصرة مع السيرة النبوية', level: 'beginner', lessons_count: 20 }
];

const adminUser = {
  username: 'admin',
  email: 'admin@zaad.local',
  password: bcrypt.hashSync('admin123', 10),
  role: 'admin'
};

db.serialize(() => {
  const surahStmt = db.prepare('INSERT OR REPLACE INTO surahs (id, name, type, verses, juz, status) VALUES (?, ?, ?, ?, ?, ?)');
  surahs.forEach(s => surahStmt.run(s.id, s.name, s.type, s.verses, s.juz, 'verified'));
  surahStmt.finalize();

  const athkarStmt = db.prepare('INSERT INTO athkar (category, text, count, source, status) VALUES (?, ?, ?, ?, ?)');
  athkar.forEach(a => athkarStmt.run(a.category, a.text, a.count, a.source, 'verified'));
  athkarStmt.finalize();

  const hadithStmt = db.prepare('INSERT INTO hadith (title, text, source, status) VALUES (?, ?, ?, ?)');
  hadith.forEach(h => hadithStmt.run(h.title, h.text, h.source, 'verified'));
  hadithStmt.finalize();

  const lectureStmt = db.prepare('INSERT INTO lectures (title, speaker, category, description, source, status, duration) VALUES (?, ?, ?, ?, ?, ?, ?)');
  lectures.forEach(l => lectureStmt.run(l.title, l.speaker, l.category, l.description, l.source, 'verified', l.duration));
  lectureStmt.finalize();

  const interpretationStmt = db.prepare('INSERT INTO interpretations (surah_id, verse_start, verse_end, text, source, status) VALUES (?, ?, ?, ?, ?, ?)');
  interpretations.forEach(i => interpretationStmt.run(i.surah_id, i.verse_start, i.verse_end, i.text, i.source, 'verified'));
  interpretationStmt.finalize();

  const fiqhStmt = db.prepare('INSERT INTO fiqh (title, category, text, source, status) VALUES (?, ?, ?, ?, ?)');
  fiqh.forEach(f => fiqhStmt.run(f.title, f.category, f.text, f.source, 'verified'));
  fiqhStmt.finalize();

  const courseStmt = db.prepare('INSERT INTO courses (title, instructor, description, level, lessons_count, status) VALUES (?, ?, ?, ?, ?, ?)');
  courses.forEach(c => courseStmt.run(c.title, c.instructor, c.description, c.level, c.lessons_count, 'verified'));
  courseStmt.finalize();

  db.run('INSERT OR REPLACE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [adminUser.username, adminUser.email, adminUser.password, adminUser.role], function(err) {
    if (err) console.error('✗ Error:', err);
    else console.log('✓ Database seeded successfully with lectures, interpretations, fiqh, and courses');
    db.close();
  });
});
