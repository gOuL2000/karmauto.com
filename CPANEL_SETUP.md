# راهنمای کامل استقرار پروژه در cPanel

این راهنما به صورت گام‌به‌گام شما را برای استقرار پروژه در cPanel راهنمایی می‌کند.

---

## 📋 فهرست مطالب

1. [مرحله 1: آماده‌سازی در سیستم محلی](#مرحله-1-آماده‌سازی-در-سیستم-محلی)
2. [مرحله 2: آپلود فایل‌ها به هاست](#مرحله-2-آپلود-فایل‌ها-به-هاست)
3. [مرحله 3: نصب Dependencies در هاست](#مرحله-3-نصب-dependencies-در-هاست)
4. [مرحله 4: تنظیم cPanel Node.js App Manager](#مرحله-4-تنظیم-cpanel-nodejs-app-manager)
5. [مرحله 5: راه‌اندازی Application](#مرحله-5-راه‌اندازی-application)
6. [عیب‌یابی](#عیب‌یابی)

---

## مرحله 1: آماده‌سازی در سیستم محلی

### 1.1 Build کردن پروژه

در سیستم محلی خود (Windows)، در پوشه پروژه دستور زیر را اجرا کنید:

```bash
npm run build
```

**نکته:** این دستور ممکن است چند دقیقه طول بکشد. منتظر بمانید تا build کامل شود.

### 1.2 بررسی فایل‌های Build

بعد از build، مطمئن شوید که پوشه `.next` ایجاد شده است:

```
.next/
  ├── server/
  ├── static/
  ├── BUILD_ID
  └── ...
```

### 1.3 لیست فایل‌هایی که باید آپلود شوند

فایل‌ها و پوشه‌های زیر را باید به هاست آپلود کنید:

**✅ باید آپلود شوند:**
- `.next/` (کل پوشه - مهم!)
- `app/`
- `components/`
- `lib/`
- `public/`
- `server.js`
- `package.json`
- `package-lock.json`
- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `postcss.config.js`
- `middleware.ts` (اگر وجود دارد)
- `env.production.template` (برای مرجع)

**❌ نباید آپلود شوند (در .cpanelignore هستند):**
- `node_modules/` (در هاست نصب می‌شود)
- `.env.local`
- `.git/`
- `__tests__/`
- `*.bat`, `*.ps1`
- `docs/` (اختیاری)

---

## مرحله 2: آپلود فایل‌ها به هاست

### 2.1 انتخاب روش آپلود

**روش 1: از طریق cPanel File Manager**
1. وارد cPanel شوید
2. به **File Manager** بروید
3. به مسیر `/home/shop1111/repositories/saded` بروید (یا مسیر دلخواه)
4. فایل‌ها را آپلود کنید

**روش 2: از طریق FTP**
- از نرم‌افزار FTP مانند FileZilla استفاده کنید
- به هاست متصل شوید
- فایل‌ها را آپلود کنید

### 2.2 نکات مهم آپلود

1. **پوشه `.next` را کامل آپلود کنید** - این پوشه بسیار مهم است
2. **فایل‌های مخفی را هم آپلود کنید** - در FileZilla: Server > Force show hidden files
3. **ساختار پوشه‌ها را حفظ کنید** - ساختار باید دقیقاً مانند سیستم محلی باشد

### 2.3 بررسی آپلود

بعد از آپلود، از طریق Terminal بررسی کنید:

```bash
cd /home/shop1111/Brun
ls -la
```

مطمئن شوید که فایل‌های زیر موجود هستند:
- `server.js`
- `package.json`
- `next.config.js`
- پوشه `.next/`

---

## مرحله 3: نصب Dependencies در هاست

### 3.1 اتصال به Terminal

از طریق cPanel Terminal یا SSH به هاست متصل شوید.

### 3.2 فعال‌سازی Virtual Environment

```bash
source /home/shop1111/nodevenv/repositories/saded/20/bin/activate
```

### 3.3 رفتن به مسیر پروژه

```bash
cd /home/shop1111/repositories/saded
```

### 3.4 نصب Dependencies

```bash
npm install
```

**نکته:** این دستور ممکن است چند دقیقه طول بکشد. منتظر بمانید.

### 3.5 بررسی نصب

```bash
ls node_modules/ | head -10
```

اگر پوشه `node_modules` ایجاد شد، نصب موفق بوده است.

---

## مرحله 4: تنظیم cPanel Node.js App Manager

### 4.1 ایجاد Application

1. وارد cPanel شوید
2. به بخش **Node.js App Manager** بروید
3. روی **Create Application** کلیک کنید

### 4.2 تنظیمات Application

**تنظیمات اصلی:**
- **Node.js Version**: `20.19.4` (یا آخرین نسخه LTS)
- **Application Mode**: `Production`
- **Application Root**: `/home/shop1111/Brun`
- **Application URL**: `77191336.shop` (یا دامنه شما)
- **Application Startup File**: `server.js`
- **Application Entry Point**: `server.js`

### 4.3 تنظیم متغیرهای محیطی

در بخش **Environment Variables**، متغیرهای زیر را اضافه کنید:

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

**نکته مهم:**
- `APP_PORT` به صورت خودکار توسط cPanel تنظیم می‌شود
- نیازی به تنظیم `PORT` نیست
- تمام مقادیر را دقیقاً وارد کنید

### 4.4 ذخیره Application

بعد از وارد کردن تمام اطلاعات، روی **Create** کلیک کنید.

---

## مرحله 5: راه‌اندازی Application

### 5.1 نصب Dependencies از طریق cPanel

1. در Node.js App Manager، روی Application کلیک کنید
2. روی دکمه **Run NPM Install** کلیک کنید
3. منتظر بمانید تا نصب کامل شود

### 5.2 راه‌اندازی Application

1. روی دکمه **Start App** کلیک کنید
2. چند ثانیه صبر کنید
3. وضعیت Application باید **Started** شود

### 5.3 بررسی وضعیت

- وضعیت Application باید **Started (v20.19.4)** باشد
- اگر **Stopped** یا **Crashed** است، به بخش عیب‌یابی مراجعه کنید

### 5.4 تست سایت

سایت خود را در مرورگر باز کنید:
```
http://77191336.shop
```

اگر سایت باز شد، استقرار موفق بوده است! 🎉

---

## عیب‌یابی

### مشکل 1: خطای 503 Service Unavailable

**علت احتمالی:**
- Application اجرا نشده است
- فایل‌های build موجود نیستند
- خطای در کد

**راه‌حل:**
1. Application را **Restart** کنید
2. بررسی کنید که پوشه `.next` موجود است:
   ```bash
   ls -la .next/
   ```
3. اگر `.next` موجود نیست، در سیستم محلی دوباره build کنید و آپلود کنید

### مشکل 2: خطای "Cannot find module"

**علت احتمالی:**
- Dependencies نصب نشده‌اند

**راه‌حل:**
```bash
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
npm install
```

### مشکل 3: خطای Database Connection

**علت احتمالی:**
- اطلاعات دیتابیس اشتباه است
- دیتابیس ایجاد نشده است

**راه‌حل:**
1. اطلاعات دیتابیس را در cPanel بررسی کنید
2. از طریق Terminal تست کنید:
   ```bash
   node scripts/test-mysql-connection.js
   ```

### مشکل 4: Application Crash می‌کند

**راه‌حل:**
1. Application را **Stop** کنید
2. از طریق Terminal بررسی کنید:
```bash
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
node server.js
```
3. خطاها را بررسی کنید و رفع کنید

### مشکل 5: فایل‌های Build موجود نیستند

**راه‌حل:**
1. در سیستم محلی:
   ```bash
   npm run build
   ```
2. پوشه `.next` را کامل آپلود کنید
3. Application را **Restart** کنید

---

## دستورات مفید

### بررسی وضعیت Application

```bash
source /home/shop1111/nodevenv/repositories/saded/20/bin/activate
cd /home/shop1111/repositories/saded
node scripts/health-check.js
```

### تست اتصال دیتابیس

```bash
node scripts/test-mysql-connection.js
```

### بررسی فایل‌های Build

```bash
ls -la .next/
ls -la .next/server/
```

### بررسی Dependencies

```bash
npm list --depth=0
```

### بررسی Logs (اگر وجود دارد)

```bash
cat logs/*.log 2>/dev/null || echo "No logs found"
```

---

## نکات مهم

1. **همیشه در سیستم محلی build کنید** - build در هاست ممکن است مشکل داشته باشد
2. **پوشه `.next` را کامل آپلود کنید** - این پوشه بسیار مهم است
3. **متغیرهای محیطی را در cPanel تنظیم کنید** - نه در فایل `.env`
4. **Application Root را درست تنظیم کنید** - باید دقیقاً مسیر پروژه باشد
5. **بعد از هر تغییر، Application را Restart کنید**

---

## پشتیبانی

اگر مشکل دارید:
1. این راهنما را دوباره بخوانید
2. بخش عیب‌یابی را بررسی کنید
3. با پشتیبانی هاست تماس بگیرید

---

**موفق باشید!** 🚀

