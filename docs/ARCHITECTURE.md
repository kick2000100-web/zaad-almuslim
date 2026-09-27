# بنية المشروع - زاد المسلم

## الطبقات

### Frontend (Public/)
- `index.html`: نقطة الدخول
- `app.js`: منطق التطبيق الرئيسي
- `style.css`: الأنماط
- `manifest.webmanifest`: PWA metadata

### Backend (root)
- `server.js`: الخادم والـ endpoints
- `package.json`: المعتمديات

### قاعدة البيانات (SQLite)
- `users`: حسابات المستخدمين وأدوارهم
- `surahs`: بيانات السور (بدون نص)
- `athkar`: الأذكار مع المصادر والحالة
- `hadith`: الأحاديث مع المصادر والحالة
- `user_progress`: نشاط المستخدم اليومي
- `tasbeeh_log`: سجل التسبيح

## الأدوار

- **user**: مستخدم عادي يمكنه القراءة والمتابعة
- **editor**: يمكنه إضافة محتوى جديد (قيد المراجعة)
- **reviewer**: يمكنه المراجعة والموافقة على المحتوى
- **admin**: تحكم كامل

## التدفق

1. المستخدم يسجل/يدخل → يتلقى JWT token
2. يوفر التوكن في كل طلب `Authorization: Bearer <token>`
3. الخادم يتحقق من التوكن والصلاحيات
4. يسترجع البيانات من SQLite
5. يعيد JSON

## الأمان

- كلمات المرور مشفرة ب bcryptjs
- الجلسات تدار عبر JWT
- التحقق من الصلاحيات على كل endpoint
- SQL injection محمي via parameterized queries
