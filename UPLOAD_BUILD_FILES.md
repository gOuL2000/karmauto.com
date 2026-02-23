# راهنمای آپلود فایل‌های Build شده

## ✅ Build موفقیت‌آمیز بود!

Build در سیستم محلی با موفقیت انجام شد. حالا باید فایل‌های build شده را به هاست آپلود کنید.

---

## فایل‌های لازم برای آپلود

### 1. پوشه `.next` (مهم!)

**مسیر در سیستم محلی:**
```
D:\saded - Copy (4)\.next
```

**مسیر در هاست:**
```
/home/shop1111/Brun/.next
```

**نکته:** این پوشه شامل تمام فایل‌های build شده است و **بسیار مهم** است.

### 2. فایل‌های تغییر یافته

فایل‌های زیر را هم آپلود کنید (اگر تغییر کرده‌اند):

- `server.js` (تغییرات برای غیرفعال کردن Turbopack)
- `components/ui/dialog.tsx`
- `components/ui/sheet.tsx`
- `components/ui/popover.tsx`
- `components/ui/toast.tsx`
- `components/admin/admin-chat.tsx`
- `components/notifications/persistent-notification.tsx`
- `components/notifications/notification-center.tsx`
- `app/admin/admin.css`
- `app/globals.css`
- `app/layout.tsx`
- `app/admin/layout.tsx`

---

## مراحل آپلود

### مرحله 1: آپلود پوشه `.next`

**⚠️ مهم:** این پوشه بزرگ است و ممکن است زمان زیادی ببرد.

1. استفاده از FileZilla یا هر FTP client
2. رفتن به مسیر: `/home/shop1111/Brun/`
3. حذف پوشه `.next` قبلی (اگر وجود دارد)
4. آپلود پوشه `.next` جدید

**نکته:** اگر پوشه `.next` قبلی وجود دارد، ابتدا آن را حذف کنید تا فایل‌های قدیمی با جدید تداخل نداشته باشند.

### مرحله 2: آپلود فایل‌های تغییر یافته

فایل‌های تغییر یافته را آپلود کنید.

### مرحله 3: بررسی در هاست

```bash
# بررسی وجود BUILD_ID
ls -la /home/shop1111/Brun/.next/BUILD_ID

# بررسی محتویات .next
ls -la /home/shop1111/Brun/.next/ | head -20
```

### مرحله 4: Restart PM2

```bash
# رفتن به مسیر پروژه
cd /home/shop1111/Brun

# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# Stop و Delete PM2
pm2 delete saded

# Start دوباره
pm2 start ecosystem.config.js --update-env

# بررسی وضعیت
pm2 status

# بررسی لاگ‌ها
pm2 logs saded --lines 20
```

---

## اگر آپلود پوشه `.next` مشکل دارد

### گزینه 1: فشرده‌سازی و آپلود

```bash
# در سیستم محلی (PowerShell)
Compress-Archive -Path ".next" -DestinationPath "next-build.zip"

# سپس آپلود next-build.zip به هاست
# و در هاست:
cd /home/shop1111/Brun
unzip -o next-build.zip
rm next-build.zip
```

### گزینه 2: آپلود فایل به فایل

اگر پوشه `.next` خیلی بزرگ است، می‌توانید فقط فایل‌های ضروری را آپلود کنید:

**فایل‌های ضروری:**
- `.next/BUILD_ID` (بسیار مهم!)
- `.next/server/` (تمام محتویات)
- `.next/static/` (تمام محتویات)
- `.next/standalone/` (اگر وجود دارد)

---

## بررسی Build

بعد از آپلود، این دستورات را در هاست اجرا کنید:

```bash
# بررسی BUILD_ID
cat /home/shop1111/Brun/.next/BUILD_ID

# بررسی محتویات .next/server
ls -la /home/shop1111/Brun/.next/server/ | head -20

# بررسی محتویات .next/static
ls -la /home/shop1111/Brun/.next/static/ | head -10
```

---

## دستورات کامل

```bash
# 1. بررسی BUILD_ID در هاست
ls -la /home/shop1111/Brun/.next/BUILD_ID

# 2. رفتن به مسیر پروژه
cd /home/shop1111/Brun

# 3. فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# 4. Restart PM2
pm2 delete saded
pm2 start ecosystem.config.js --update-env

# 5. بررسی وضعیت
pm2 status
pm2 logs saded --lines 20
```

---

## نکات مهم

1. **همیشه قبل از آپلود، پوشه `.next` قبلی را حذف کنید**
2. **بعد از آپلود، حتماً BUILD_ID را بررسی کنید**
3. **بعد از آپلود، PM2 را restart کنید**
4. **اگر مشکل داشتید، لاگ‌های PM2 را بررسی کنید**

---

## اگر هنوز مشکل دارید

لطفاً این اطلاعات را ارسال کنید:
1. خروجی `ls -la .next/BUILD_ID`
2. خروجی `pm2 status`
3. خروجی `pm2 logs saded --lines 50`

