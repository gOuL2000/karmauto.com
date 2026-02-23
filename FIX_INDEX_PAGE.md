# راهنمای رفع مشکل "Index of /"

## مشکل
وقتی به سایت `77191336.shop` می‌روید، به جای نمایش سایت Next.js، صفحه "Index of /" (لیست دایرکتوری) نمایش داده می‌شود.

## علت
وب‌سرور LiteSpeed درخواست‌ها را به Node.js application که روی پورت 3001 اجرا می‌شود proxy نمی‌کند.

## راه‌حل

### مرحله 1: بررسی وضعیت Node.js Application

1. وارد cPanel شوید
2. به بخش **Node.js App Manager** بروید
3. بررسی کنید که Application **Started** است
4. اگر **Stopped** است، روی **Start App** کلیک کنید

### مرحله 2: بررسی پورت Application

در Node.js App Manager:
- Application را باز کنید
- در بخش **Environment Variables**، مقدار `APP_PORT` را بررسی کنید
- معمولاً این مقدار `3001` است

### مرحله 3: آپلود فایل `.htaccess`

1. فایل `.htaccess` که در پروژه ایجاد شده است را آپلود کنید
2. این فایل باید در **root directory** پروژه باشد (همان جایی که `server.js` است)
3. مسیر: `/home/shop1111/Brun/.htaccess`

### مرحله 4: بررسی تنظیمات Application URL

در Node.js App Manager:
- **Application URL** باید `77191336.shop` باشد
- **Application Root** باید `/home/shop1111/Brun` باشد

### مرحله 5: Restart Application

1. در Node.js App Manager، روی **Stop App** کلیک کنید
2. چند ثانیه صبر کنید
3. روی **Start App** کلیک کنید
4. منتظر بمانید تا Application شروع شود

### مرحله 6: تست سایت

سایت را در مرورگر باز کنید:
```
http://77191336.shop
```

اگر هنوز "Index of /" نمایش داده می‌شود، به مرحله بعد بروید.

---

## راه‌حل جایگزین: استفاده از PM2

اگر Node.js App Manager کار نمی‌کند، می‌توانید از PM2 استفاده کنید:

### 1. بررسی وضعیت PM2

```bash
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
pm2 status
```

### 2. اگر Application در حال اجرا نیست

```bash
pm2 start ecosystem.config.js
pm2 save
```

### 3. بررسی لاگ‌ها

```bash
pm2 logs saded --lines 50
```

### 4. بررسی پورت

```bash
netstat -tulpn | grep 3001
```

یا:

```bash
ss -tulpn | grep 3001
```

اگر پورت 3001 در حال گوش دادن است، Application در حال اجرا است.

---

## عیب‌یابی پیشرفته

### بررسی فایل `.htaccess`

از طریق SSH یا Terminal:

```bash
cd /home/shop1111/Brun
cat .htaccess
```

مطمئن شوید که محتوای فایل درست است.

### بررسی تنظیمات LiteSpeed

اگر از LiteSpeed استفاده می‌کنید، ممکن است نیاز به تنظیمات خاص باشد:

1. وارد cPanel شوید
2. به بخش **LiteSpeed Web Server** بروید
3. بررسی کنید که **Proxy** فعال است

### بررسی فایل‌های cPanel

cPanel ممکن است فایل‌های خاصی برای Node.js ایجاد کند. بررسی کنید:

```bash
ls -la /home/shop1111/public_html/.htaccess
ls -la /home/shop1111/Brun/.htaccess
```

### تست مستقیم Node.js

برای اطمینان از اینکه Node.js application کار می‌کند:

```bash
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
curl http://localhost:3001
```

اگر پاسخ دریافت کردید، Node.js application کار می‌کند و مشکل از proxy است.

---

## نکات مهم

1. **فایل `.htaccess` باید در root directory باشد**
2. **Application باید در Node.js App Manager Start شده باشد**
3. **پورت باید درست باشد (معمولاً 3001)**
4. **اگر از PM2 استفاده می‌کنید، Application را در Node.js App Manager Stop کنید**

---

## اگر هنوز کار نمی‌کند

1. با پشتیبانی هاست تماس بگیرید
2. از آنها بخواهید که:
   - بررسی کنند که mod_proxy و mod_rewrite فعال هستند
   - بررسی کنند که Node.js App Manager درست تنظیم شده است
   - بررسی کنند که فایل `.htaccess` درست کار می‌کند

---

## خلاصه دستورات

```bash
# بررسی وضعیت PM2
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
pm2 status

# بررسی پورت
netstat -tulpn | grep 3001

# تست مستقیم Node.js
curl http://localhost:3001

# بررسی فایل .htaccess
cat .htaccess
```

