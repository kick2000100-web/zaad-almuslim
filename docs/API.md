# APIs - زاد المسلم

## المصادقة

### POST /api/auth/register
```json
{
  "username": "username",
  "email": "user@example.com",
  "password": "password123"
}
```
الاستجابة: `{"token": "jwt_token", "userId": 1, "role": "user"}`

### POST /api/auth/login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## المحتوى

### GET /api/content/surahs
السور المتحققة منها. لا تتضمن نص قرآني.

### GET /api/content/athkar?category=morning
الأذكار المتحققة منها. الفئات: `all`, `morning`, `evening`, `sleep`, `prayer`

### GET /api/content/hadith
الأحاديث المتحققة منها.

## البحث

### GET /api/search?q=keyword
بحث موحد في السور والأذكار والأحاديث.

## متابعة المستخدم (مطلوب Token)

### POST /api/progress/save
```json
{
  "date": "2026-09-27",
  "data": {
    "prayer_fajr": 1,
    "prayer_dhuhr": 0,
    "athkar_morning": 1,
    "quran_read": 1
  }
}
```

### GET /api/progress/2026-09-27
استرجاع نشاط اليوم المحفوظ.

## الإدارة (مطلوب Role: admin أو editor)

### POST /api/admin/content/athkar
```json
{
  "category": "morning",
  "text": "سُبْحَانَ اللَّهِ",
  "count": 3,
  "source": "صحيح البخاري"
}
```

### PUT /api/admin/content/athkar/:id
```json
{
  "status": "verified"
}
```
الحالات: `review`, `verified`, `rejected`

## الصحة

### GET /api/health
التحقق من حالة الخادم.
