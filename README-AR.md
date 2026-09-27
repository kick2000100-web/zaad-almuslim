# زاد المسلم - منصة إسلامية رقمية

منصة مفتوحة المصدر لها رسالة إسلامية وعلمية حقيقية: جمع معارف إسلامية فى منصة رقمية موثوقة وآمنة ومرنة.

## الميزات

- ✅ بيانات السور العربية RTL
- ✅ أذكار موثقة مع مصادرها
- ✅ أحاديث مختارة موثقة
- ✅ متابعة تطبيقات العبادات
- ✅ سبحة إلكترونية ثيمة
- ✅ بحث موحد وسريع
- ✅ عمل بدون اتصال (PWA)
- ✅ حسابات آمنة مع تشفير كلمات مرور
- ✅ أدوار إدارة محتوى
- ✅ نظام وظائف وصلاحيات

## البدء السريع

### التثبيت

```bash
npm install
node scripts/seed.js
npm start
```

### الوصول

- **المره الرئيسية**: http://localhost:3000
- **العرض التجريبي**: البريد: `admin@zaad.local` | كلمة المرور: `admin123`

## البنية

```
zaad-almuslim/
├─ public/                  # Frontend (HTML, CSS, JS)
├─ scripts/
│  └─ seed.js               # بيانات أولية
├─ docs/                   # توثيقات
├─ data/                   # SQLite
├─ server.js               # الخادم
├─ package.json
├─ .env.example
└─ README.md
```

## API

### المصادقة

- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل دخول

### المحتوى العام

- `GET /api/content/surahs` - قائمة السور
- `GET /api/content/athkar?category=morning` - الأذكار
- `GET /api/content/hadith` - الأحاديث
- `GET /api/search?q=keyword` - بحث شامل

### المطلوب لا لو سجلت دخولا

- `POST /api/progress/save` - حفظ نشاط من مستخدم
- `GET /api/progress/:date` - بيانات يوم معين

### الإدارة (مطلوب Admin)

- `POST /api/admin/content/athkar` - إضافة ذكر جديد
- `PUT /api/admin/content/athkar/:id` - موافقة على محتوى

المزيد الفا [docs/API.md](./docs/API.md)

## البيئة

نسخ `.env.example` إلى `.env` وعدّل القيم:

```bash
cp .env.example .env
```

## النشر

- **Heroku**: [Deploy to Heroku](https://heroku.com/deploy)
- **Vercel**: `vercel`
- **GitHub Pages**: `npm run build`

ِاِطّلِع على [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## الرخصة

MIT – راجع [LICENSE](./LICENSE)

## المساهمة
بالرحببة مرحبا! إذا أردت المساهمة في مشروعنا العمل بذا الضمير.
