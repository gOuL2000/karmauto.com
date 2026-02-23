# دستورات نهایی آپلود و اجرا

## ✅ Build موفقیت‌آمیز بود!

Build در سیستم محلی با موفقیت انجام شد. حالا باید فایل‌ها را آپلود کنید.

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

**نکته:** این پوشه شامل تمام فایل‌های build شده است.

### 2. فایل‌های تغییر یافته

- `server.js` (تغییرات برای غیرفعال کردن Turbopack)
- `app/api/settings/site-content/route.ts` (Fix encoding)
- `lib/db/mysql.ts` (UTF-8 charset)
- `app/profile/page.tsx` (Dialog → Sheet)
- `lib/auth/session.ts` (Session 1 week)
- `app/api/cart/route.ts` (User-specific cart)
- `app/layout.tsx` (Favicon)
- `components/ui/dialog.tsx` (Fix modals)
- `components/ui/sheet.tsx` (Fix modals)
- `components/ui/popover.tsx` (Fix modals)
- `components/ui/toast.tsx` (Fix modals)
- `components/admin/admin-chat.tsx` (Fix modals)
- `components/notifications/persistent-notification.tsx` (Fix modals)
- `components/notifications/notification-center.tsx` (Fix modals)
- `app/admin/admin.css` (Fix overflow)
- `app/globals.css` (Fix overflow)

---

## مراحل آپلود

### مرحله 1: آپلود پوشه `.next`

1. استفاده از FileZilla یا هر FTP client
2. رفتن به مسیر: `/home/shop1111/Brun/`
3. **حذف پوشه `.next` قبلی** (اگر وجود دارد)
4. آپلود پوشه `.next` جدید

### مرحله 2: آپلود فایل‌های تغییر یافته

فایل‌های تغییر یافته را آپلود کنید.

### مرحله 3: بررسی در هاست

```bash
cd /home/shop1111/Brun
source /home/shop1111/nodevenv/Brun/20/bin/activate
ls -la .next/BUILD_ID
```

### مرحله 4: Restart PM2

```bash
pm2 delete saded
pm2 start ecosystem.config.js --update-env
pm2 status
pm2 logs saded --lines 20
```

### مرحله 5: تبدیل Database Charset (اختیاری - برای فوتر)

اگر می‌خواهید charset را تبدیل کنید، از cPanel استفاده کنید:

1. رفتن به cPanel → phpMyAdmin
2. انتخاب database: `shop1111_Brun`
3. انتخاب table: `site_settings`
4. کلیک روی "Operations"
5. در بخش "Table options":
   - Collation: `utf8mb4_unicode_ci`
6. کلیک روی "Go"

یا از ترمینال (اگر password درست است):

```bash
# بررسی password در .env.production
# سپس:
mysql -u shop1111_Brundb -p shop1111_Brun -e "ALTER TABLE site_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## دستورات کامل

```bash
# 1. بررسی BUILD_ID
cd /home/shop1111/Brun
source /home/shop1111/nodevenv/Brun/20/bin/activate
ls -la .next/BUILD_ID

# 2. Restart PM2
pm2 delete saded
pm2 start ecosystem.config.js --update-env

# 3. بررسی وضعیت
pm2 status
pm2 logs saded --lines 20
```

---

## تست تغییرات

بعد از آپلود و restart:

1. **فوتر:** `/admin/settings` → تایپ متن فارسی → ذخیره → بررسی
2. **پروفایل:** `/profile` → کلیک روی "ویرایش" → باید Sheet باز شود
3. **Session:** ورود → بستن مرورگر → باز کردن → باید لاگین بماند (1 هفته)
4. **سبد خرید:** اضافه محصول → لاگین → بررسی باقی ماندن محصولات
5. **Favicon:** بررسی تب مرورگر → باید لوگو نمایش داده شود

---

## اگر مشکلی پیش آمد

### بررسی لاگ‌ها:
```bash
pm2 logs saded --lines 50
```

### بررسی BUILD_ID:
```bash
ls -la .next/BUILD_ID
cat .next/BUILD_ID
```

### بررسی Port:
```bash
netstat -tuln | grep 3001
```

---

## موفق باشید! 🎉

تمام تغییرات اعمال شدند. لطفاً فایل‌ها را آپلود کنید و تست کنید.

