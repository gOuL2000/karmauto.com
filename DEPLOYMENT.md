# راهنمای استقرار پروژه در cPanel

این راهنما به شما کمک می‌کند تا پروژه Next.js را در هاست cPanel استقرار دهید.

## پیش‌نیازها

1. دسترسی به cPanel
2. Node.js App Manager در cPanel فعال باشد
3. دسترسی به MySQL Database
4. فایل‌های پروژه build شده (پوشه `.next`)

## مراحل استقرار

### مرحله 1: آپلود فایل‌ها

1. تمام فایل‌های پروژه را به پوشه `public_html` یا پوشه دلخواه خود در هاست آپلود کنید
2. مطمئن شوید که پوشه‌های زیر آپلود شده‌اند:
   - `.next` (پوشه build شده)
   - `node_modules` (یا بعداً نصب کنید)
   - `app`
   - `components`
   - `lib`
   - `public`
   - `server.js`
   - `package.json`
   - `next.config.js`
   - سایر فایل‌های ضروری

### مرحله 2: نصب وابستگی‌ها

از طریق SSH یا Terminal در cPanel:

```bash
cd /home/username/public_html/your-project-folder
npm install --production
```

**نکته:** اگر دسترسی SSH ندارید، می‌توانید از طریق cPanel File Manager و Terminal استفاده کنید.

### مرحله 3: ایجاد فایل `.env.production`

1. فایل `env.production.template` را کپی کنید و نام آن را به `.env.production` تغییر دهید
2. یا مستقیماً فایل `.env.production` را ایجاد کنید
3. مقادیر را با اطلاعات واقعی هاست خود پر کنید:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_SSL=false

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_URL=https://yourdomain.com

# NextAuth (اگر استفاده می‌کنید)
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-here

# JWT Secret (اگر استفاده می‌کنید)
JWT_SECRET=your-jwt-secret-key

# Zarinpal (اگر استفاده می‌کنید)
ZARINPAL_MERCHANT_ID=your-merchant-id
```

### مرحله 4: تنظیم cPanel Node.js App Manager

1. وارد cPanel شوید
2. به بخش **Node.js App Manager** بروید
3. روی **Create Application** کلیک کنید
4. تنظیمات زیر را وارد کنید:

   - **Node.js Version**: آخرین نسخه LTS (مثلاً 18.x یا 20.x)
   - **Application Mode**: Production
   - **Application Root**: مسیر پروژه شما (مثلاً `public_html/saded`)
   - **Application URL**: دامنه یا subdomain شما
   - **Application Startup File**: `server.js`
   - **Application Entry Point**: `server.js`

5. در بخش **Environment Variables**، متغیرهای زیر را اضافه کنید:

   ```
   NODE_ENV=production
   HOSTNAME=0.0.0.0
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_SSL=false
   NEXT_PUBLIC_URL=https://yourdomain.com
   ```

   **نکته مهم:** 
   - `APP_PORT` به صورت خودکار توسط cPanel تنظیم می‌شود، نیازی به تنظیم دستی نیست
   - اگر فایل `.env.production` دارید، متغیرهای محیطی از آن فایل نیز لود می‌شوند
   - متغیرهای تنظیم شده در cPanel اولویت بالاتری دارند

6. روی **Create** کلیک کنید

### مرحله 5: راه‌اندازی Application

1. بعد از ایجاد Application، روی دکمه **Run NPM Install** کلیک کنید (اگر قبلاً نصب نکرده‌اید)
2. روی دکمه **Start App** کلیک کنید
3. منتظر بمانید تا Application شروع شود (چند ثانیه طول می‌کشد)

### مرحله 6: بررسی Logs

برای بررسی خطاها:

1. در Node.js App Manager، روی Application خود کلیک کنید
2. به بخش **Logs** بروید
3. **Error Log** و **Output Log** را بررسی کنید

اگر خطایی وجود دارد، در بخش Troubleshooting راهنمایی‌ها را ببینید.

## عیب‌یابی (Troubleshooting)

### خطای 503 Service Unavailable

این خطا معمولاً به دلایل زیر رخ می‌دهد:

#### 1. Application اجرا نشده است
- بررسی کنید که Application در Node.js App Manager در حال اجرا است
- روی **Start App** کلیک کنید

#### 2. پورت اشتباه
- `APP_PORT` باید به صورت خودکار توسط cPanel تنظیم شود
- بررسی کنید که در Logs خطای پورت وجود ندارد

#### 3. فایل‌های Build موجود نیستند
- مطمئن شوید که پوشه `.next` آپلود شده است
- اگر build نکرده‌اید، در سیستم محلی خود `npm run build` را اجرا کنید

#### 4. متغیرهای محیطی تنظیم نشده
- بررسی کنید که تمام متغیرهای ضروری در cPanel Node.js App Manager تنظیم شده‌اند
- فایل `.env.production` را بررسی کنید

#### 5. خطای Database Connection
- اطلاعات دیتابیس را بررسی کنید
- مطمئن شوید که دیتابیس ایجاد شده است
- از طریق Terminal تست کنید: `node scripts/test-mysql-connection.js`

#### 6. خطای Module Not Found
- مطمئن شوید که `npm install --production` را اجرا کرده‌اید
- پوشه `node_modules` باید موجود باشد

### بررسی وضعیت Application

برای بررسی وضعیت Application:

```bash
# از طریق SSH
cd /home/username/public_html/your-project-folder
node scripts/health-check.js
```

یا از طریق cPanel Terminal:

```bash
cd public_html/your-project-folder
node scripts/health-check.js
```

### بررسی Logs

برای بررسی خطاها:

1. **Error Logs در cPanel**: Node.js App Manager > Logs > Error Log
2. **Application Logs**: Node.js App Manager > Logs > Output Log
3. **Server Logs**: اگر دسترسی دارید، `/home/username/logs/` را بررسی کنید

### تست اتصال دیتابیس

```bash
cd /home/username/public_html/your-project-folder
node scripts/test-mysql-connection.js
```

### بررسی Build

مطمئن شوید که فایل‌های build موجود هستند:

```bash
ls -la .next
```

باید پوشه‌های زیر موجود باشند:
- `.next/server`
- `.next/static`
- `.next/BUILD_ID`

## نکات مهم

1. **Build در سیستم محلی**: همیشه در سیستم محلی خود build کنید و سپس فایل‌های `.next` را آپلود کنید
2. **متغیرهای محیطی**: در cPanel Node.js App Manager تنظیم کنید، نه در فایل `.env` (برای امنیت بیشتر)
3. **پورت**: `APP_PORT` به صورت خودکار تنظیم می‌شود، نیازی به تنظیم دستی نیست
4. **Node.js Version**: از نسخه LTS استفاده کنید (18.x یا 20.x)
5. **Memory Limit**: اگر خطای حافظه دارید، `NODE_OPTIONS=--max-old-space-size=4096` را اضافه کنید

## دستورات مفید

```bash
# بررسی وضعیت
node scripts/health-check.js

# تست دیتابیس
node scripts/test-mysql-connection.js

# بررسی استقرار
node scripts/check-deployment.js

# راه‌اندازی دیتابیس (اگر نیاز باشد)
node scripts/setup-mysql.js
```

## پشتیبانی

اگر مشکل دارید:

1. Logs را بررسی کنید
2. Health Check را اجرا کنید
3. متغیرهای محیطی را بررسی کنید
4. فایل‌های build را بررسی کنید

## به‌روزرسانی Application

برای به‌روزرسانی:

1. فایل‌های جدید را آپلود کنید
2. در Node.js App Manager روی **Stop App** کلیک کنید
3. اگر `package.json` تغییر کرده، **Run NPM Install** را اجرا کنید
4. روی **Start App** کلیک کنید

---

**موفق باشید!** 🚀

