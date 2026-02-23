# راهنمای رفع مشکل Dependencies در Passenger

## مشکل

در Application Manager، خطای قرمز نمایش داده می‌شود:
```
The system couldn't ensure dependencies for your application.
npm: ❗ The process failed.
```

## علت

Dependencies (packages) پروژه نصب نشده‌اند یا نصب آن‌ها با خطا مواجه شده است.

## راه‌حل

### مرحله 1: نصب Dependencies از طریق Terminal

1. به Terminal هاست متصل شوید (SSH یا Terminal در cPanel)

2. دستورات زیر را اجرا کنید:

```bash
# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# رفتن به مسیر پروژه
cd /home/shop1111/Brun

# نصب dependencies
npm install
```

**یا اگر با خطا مواجه شدید:**

```bash
# نصب با legacy-peer-deps
npm install --legacy-peer-deps

# یا نصب در دایرکتوری محلی
NPM_CONFIG_PREFIX='' npm install --legacy-peer-deps
```

### مرحله 2: بررسی نصب

```bash
# بررسی وجود node_modules
ls -la node_modules/ | head -10

# بررسی وجود package-lock.json
ls -la package-lock.json
```

اگر `node_modules` ایجاد شد، نصب موفق بوده است.

### مرحله 3: Build پروژه

```bash
# Build پروژه
npm run build

# یا برای Linux
npm run build:linux
```

### مرحله 4: Restart Application در Passenger

#### روش 1: از طریق Application Manager

1. وارد cPanel شوید
2. به **Application Manager** بروید
3. روی Application "saded" کلیک کنید
4. روی **Restart** کلیک کنید

#### روش 2: از طریق Terminal

```bash
# ایجاد فایل restart برای Passenger
touch /home/shop1111/Brun/tmp/restart.txt
```

**نکته:** اگر پوشه `tmp` وجود ندارد، ابتدا آن را ایجاد کنید:

```bash
mkdir -p /home/shop1111/Brun/tmp
touch /home/shop1111/Brun/tmp/restart.txt
```

### مرحله 5: بررسی وضعیت Application

1. در Application Manager، بررسی کنید که Application **Enabled** است
2. چند دقیقه صبر کنید
3. سایت را در مرورگر باز کنید: `http://77191336.shop`

---

## عیب‌یابی

### مشکل 1: `npm install` با خطا مواجه می‌شود

**خطای "permission denied":**
```bash
# بررسی permissions
ls -la /home/shop1111/Brun

# اگر نیاز باشد، permissions را تغییر دهید
chmod -R 755 /home/shop1111/Brun
```

**خطای "ENOSPC" (فضای دیسک):**
```bash
# بررسی فضای دیسک
df -h

# اگر فضای کافی ندارید، با پشتیبانی هاست تماس بگیرید
```

**خطای "peer dependency":**
```bash
# استفاده از --legacy-peer-deps
npm install --legacy-peer-deps
```

### مشکل 2: بعد از نصب، Application شروع نمی‌شود

**بررسی لاگ‌ها:**
```bash
cd /home/shop1111/Brun
tail -f logs/passenger.log
```

یا در Application Manager، بخش **Logs** را بررسی کنید.

**بررسی Environment Variables:**
- در Application Manager، Application را باز کنید
- بخش **Environment Variables** را بررسی کنید
- مطمئن شوید که تمام متغیرهای لازم تنظیم شده‌اند

### مشکل 3: هنوز "Index of /" نمایش داده می‌شود

**بررسی Build:**
```bash
ls -la .next/BUILD_ID
```

اگر فایل `BUILD_ID` وجود ندارد، پروژه build نشده است:
```bash
npm run build
```

**بررسی Application Status:**
- در Application Manager، مطمئن شوید که Application **Enabled** است
- Application را **Restart** کنید
- چند دقیقه صبر کنید

**پاک کردن Cache:**
- Cache مرورگر را پاک کنید
- یا در حالت Incognito/Private باز کنید

---

## دستورات کامل (کپی-پیست)

```bash
# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# رفتن به مسیر پروژه
cd /home/shop1111/Brun

# نصب dependencies
npm install --legacy-peer-deps

# Build پروژه
npm run build:linux

# ایجاد پوشه tmp (اگر وجود ندارد)
mkdir -p tmp

# Restart Passenger application
touch tmp/restart.txt

# بررسی وضعیت
ls -la .next/BUILD_ID
ls -la node_modules/ | head -5
```

---

## نکات مهم

1. **Virtual Environment:** همیشه قبل از اجرای `npm install`، virtual environment را فعال کنید
2. **Build:** بعد از نصب dependencies، حتماً پروژه را build کنید
3. **Restart:** بعد از هر تغییر، Application را restart کنید
4. **صبر:** بعد از restart، چند دقیقه صبر کنید تا Application شروع شود

---

## اگر هنوز کار نمی‌کند

1. با پشتیبانی هاست تماس بگیرید
2. از آنها بخواهید که:
   - بررسی کنند که Passenger فعال است
   - بررسی کنند که Node.js version درست است
   - بررسی کنند که permissions درست هستند

