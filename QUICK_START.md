# راهنمای سریع استقرار در cPanel

این راهنمای سریع برای کسانی است که قبلاً پروژه را استقرار کرده‌اند.

## مراحل سریع

### 1. Build در سیستم محلی
```bash
npm run build
```

### 2. آپلود فایل‌ها
- پوشه `.next` (مهم!)
- تمام فایل‌های دیگر (به جز `node_modules`)

### 3. در هاست - نصب Dependencies
```bash
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
npm install
```

### 4. در cPanel - تنظیم Application

**Application Root:** `/home/shop1111/repositories/saded`
**Startup File:** `server.js`
**Mode:** `Production`

**Environment Variables:**
```
NODE_ENV=production
HOSTNAME=0.0.0.0
DB_HOST=localhost
DB_PORT=3306
DB_NAME=shop1111_Brun
DB_USER=shop1111_Brundb
DB_PASSWORD=goul77191336
DB_SSL=false
NEXT_PUBLIC_URL=http://77191336.shop
```

### 5. Start Application
- در Node.js App Manager روی **Start App** کلیک کنید

---

**برای راهنمای کامل، فایل `CPANEL_SETUP.md` را بخوانید.**

