# API Documentation

## التهيئة

```bash
cp .env.example .env
npm install
npm run seed
npm start
```

## المصادقة

### POST /api/auth/register
```json
{
  "username": "user1",
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### GET /api/auth/me
Header:
```http
Authorization: Bearer <token>
```

## المحتوى العام

### GET /api/content/surahs
- `limit` (اختياري)
- `offset` (اختياري)

### GET /api/content/athkar
### GET /api/content/hadith
### GET /api/content/lectures
### GET /api/content/fiqh
### GET /api/content/courses

## البحث

### GET /api/search?q=الفاتحة
```json
{
  "results": [
    {
      "type": "surahs",
      "title": "الفاتحة",
      "meta": "مكية"
    }
  ],
  "total": 1
}
```

## التقدم

### POST /api/progress/save
Header:
```http
Authorization: Bearer <token>
```

```json
{
  "date": "2026-09-27",
  "data": {
    "quran": 2,
    "athkar": 3
  }
}
```

### GET /api/progress/:date
Header:
```http
Authorization: Bearer <token>
```

## الإدارة

### GET /api/admin/review
Header:
```http
Authorization: Bearer <token>
```

### POST /api/admin/content/athkar
Header:
```http
Authorization: Bearer <token>
```

```json
{
  "category": "morning",
  "text": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
  "count": 3,
  "source": "مراجعة داخلية"
}
```

### PUT /api/admin/content/athkar/:id
```json
{
  "status": "verified"
}
```

## الصحة

### GET /api/health
Returns:
```json
{
  "status": "ok",
  "database": "ok",
  "timestamp": "2026-09-27T00:00:00.000Z"
}
```

## ملاحظات الأمان

- لا تستخدم `JWT_SECRET` ضعيفًا في الإنتاج.
- لا تستخدم كلمة مرور المدير الافتراضية في البيئة الحقيقية.
- استخدم HTTPS وCORS محدودًا.
- لا تنشر أي محتوى ديني إلا بعد مراجعة علمية ومصدر موثوق.

