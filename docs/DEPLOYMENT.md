# التثبيت والنشر - زاد المسلم

## المتطلبات
- Node.js >= 14
- npm أو yarn

## التشغيل المحلي

```bash
npm install
cp .env.example .env
npm start
```

سيفتح على `http://localhost:3000`

## النشر على Heroku

```bash
heroku create zaad-almuslim
heroku config:set JWT_SECRET=your_secret_key
git push heroku main
```

## النشر على Vercel

```bash
vercel
```

تأكد من تعيين متغيرات البيئة في الإعدادات.

## نسخ احتياطي من قاعدة البيانات

```bash
cp ./data/zaad.db ./data/zaad.backup.db
```

## الأمان

- غيّر `JWT_SECRET` في الإنتاج
- استخدم HTTPS
- فعّل CORS بشكل محدد
- لا تضع مفاتيح سرية في الـ git
