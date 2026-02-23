# دستورات آپلود و راه‌اندازی

## ✅ Build موفقیت‌آمیز بود!

---

## 📦 فایل‌های لازم برای آپلود

### 1. پوشه `.next` (مهم!)
**مسیر در سیستم محلی:**
```
D:\saded - Copy (4)\.next
```

**مسیر در هاست:**
```
/home/shop1111/Brun/.next
```

### 2. فایل‌های تغییر یافته

- `app/admin/layout.tsx` - رفع session ادمین
- `app/layout.tsx` - رفع favicon
- `app/admin/chat/page.tsx` - صفحه جدید چت
- `components/admin/admin-chat.tsx` - تبدیل از Dialog به کامپوننت عادی
- `components/admin/admin-header.tsx` - تغییر دکمه چت به redirect
- `app/api/cart/route.ts` - رفع خطای 500

---

## 📤 مراحل آپلود

### مرحله 1: آپلود پوشه `.next`

1. استفاده از FileZilla یا هر FTP client
2. رفتن به مسیر: `/home/shop1111/Brun/`
3. **حذف پوشه `.next` قبلی** (اگر وجود دارد)
4. آپلود پوشه `.next` جدید

### مرحله 2: آپلود فایل‌های تغییر یافته

فایل‌های تغییر یافته را آپلود کنید.

---

## 🚀 دستورات راه‌اندازی در هاست

### دستورات کامل (کپی و paste کنید):

```bash
# 1. رفتن به مسیر پروژه
cd /home/shop1111/Brun

# 2. فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# 3. بررسی BUILD_ID
ls -la .next/BUILD_ID

# 4. Restart PM2
pm2 delete saded
pm2 start ecosystem.config.js --update-env

# 5. بررسی وضعیت
pm2 status

# 6. بررسی لاگ‌ها
pm2 logs saded --lines 20
```

---

## ✅ تست تغییرات

بعد از آپلود و restart:

### 1. Session ادمین
- ورود به `/admin/login`
- رفرش صفحه (F5)
- باید لاگین بماند (نباید دوباره وارد شود)

### 2. Favicon
- باز کردن سایت
- بررسی تب مرورگر
- باید لوگو نمایش داده شود

### 3. چت ادمین
- ورود به `/admin`
- کلیک روی دکمه چت (آیکون MessageCircle)
- باید به `/admin/chat` redirect شود
- چت باید به صورت صفحه کامل نمایش داده شود (نه مودال)

### 4. سبد خرید
- اضافه کردن محصول به سبد
- باید بدون خطای 500 ذخیره شود
- برای کاربر لاگین شده، باید شخصی ذخیره شود

---

## 🔍 اگر مشکلی پیش آمد

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

### بررسی وضعیت PM2:
```bash
pm2 status
pm2 info saded
```

---

## 📝 خلاصه تغییرات

1. ✅ **Session ادمین**: با هر رفرش دیگر نیاز به ورود مجدد نیست
2. ✅ **Favicon**: لوگو در تب مرورگر نمایش داده می‌شود
3. ✅ **چت ادمین**: از مودال به صفحه اختصاصی تبدیل شد (`/admin/chat`)
4. ✅ **سبد خرید**: خطای 500 رفع شد و برای هر کاربر شخصی ذخیره می‌شود

---

## 🎉 موفق باشید!

تمام تغییرات اعمال شدند. لطفاً فایل‌ها را آپلود کنید و تست کنید.

