# راهنمای استفاده از PM2 برای Next.js

## مقدمه

PM2 یک process manager برای Node.js است که برای مدیریت و اجرای application ها استفاده می‌شود.

---

## مرحله 1: نصب PM2 (اگر نصب نشده است)

```bash
# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# نصب PM2 به صورت global
npm install -g pm2
```

---

## مرحله 2: توقف Application های قبلی

### اگر از Passenger استفاده می‌کردید:

1. وارد cPanel شوید
2. به بخش **Application Manager** بروید
3. Application "saded" را **Unregister** کنید

### اگر از Node.js App Manager استفاده می‌کردید:

1. وارد cPanel شوید
2. به بخش **Node.js App Manager** بروید
3. Application را **Stop** و **Destroy** کنید

---

## مرحله 3: راه‌اندازی با PM2

```bash
# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# رفتن به مسیر پروژه
cd /home/shop1111/Brun

# بررسی Build
ls -la .next/BUILD_ID

# راه‌اندازی با PM2
pm2 start ecosystem.config.js

# ذخیره configuration برای restart بعد از reboot
pm2 save

# بررسی وضعیت
pm2 status

# بررسی لاگ‌ها
pm2 logs saded --lines 50
```

---

## مرحله 4: تنظیم Proxy در .htaccess

برای اینکه درخواست‌ها به PM2 application (پورت 3001) proxy شوند، فایل `.htaccess` را بررسی کنید:

```bash
# بررسی فایل .htaccess
cat .htaccess
```

مطمئن شوید که پورت در `.htaccess` به `3001` اشاره می‌کند.

---

## مرحله 5: تست سایت

سایت را در مرورگر باز کنید:
```
http://77191336.shop
```

---

## دستورات مفید PM2

### بررسی وضعیت:
```bash
pm2 status
```

### مشاهده لاگ‌ها:
```bash
pm2 logs saded
pm2 logs saded --lines 100
```

### Restart Application:
```bash
pm2 restart saded
```

### Stop Application:
```bash
pm2 stop saded
```

### Delete Application:
```bash
pm2 delete saded
```

### Reload Application (بدون downtime):
```bash
pm2 reload saded
```

### بررسی اطلاعات Application:
```bash
pm2 describe saded
```

### Monitoring:
```bash
pm2 monit
```

---

## عیب‌یابی

### مشکل 1: Application شروع نمی‌شود

**بررسی لاگ‌ها:**
```bash
pm2 logs saded --lines 100
```

**بررسی Build:**
```bash
ls -la .next/BUILD_ID
```

اگر `BUILD_ID` وجود ندارد، build کنید:
```bash
npm run build:linux
```

### مشکل 2: خطای "Port already in use"

**بررسی پورت:**
```bash
netstat -tulpn | grep 3001
```

**توقف process قبلی:**
```bash
pm2 stop saded
pm2 delete saded
pm2 start ecosystem.config.js
```

### مشکل 3: هنوز "Index of /" نمایش داده می‌شود

**بررسی .htaccess:**
```bash
cat .htaccess
```

مطمئن شوید که proxy به پورت 3001 تنظیم شده است.

**بررسی PM2:**
```bash
pm2 status
pm2 logs saded --lines 50
```

**Restart Application:**
```bash
pm2 restart saded
```

---

## نکات مهم

1. **PM2 و Passenger/Node.js App Manager:** اگر از PM2 استفاده می‌کنید، **نباید** از Passenger یا Node.js App Manager استفاده کنید. فقط یکی را انتخاب کنید.

2. **Auto-restart:** PM2 به صورت خودکار application را restart می‌کند اگر crash کند.

3. **Logs:** لاگ‌ها در `logs/pm2-*.log` ذخیره می‌شوند.

4. **Port:** مطمئن شوید که پورت در `ecosystem.config.js` و `.htaccess` یکسان است.

---

## خلاصه دستورات

```bash
# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# رفتن به مسیر پروژه
cd /home/shop1111/Brun

# راه‌اندازی با PM2
pm2 start ecosystem.config.js

# ذخیره configuration
pm2 save

# بررسی وضعیت
pm2 status

# بررسی لاگ‌ها
pm2 logs saded --lines 50
```

---

**موفق باشید!** 🚀
