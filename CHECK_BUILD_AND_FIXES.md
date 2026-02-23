# بررسی Build و رفع مشکلات

## وضعیت فعلی

Build با خطای `EAGAIN` مواجه شد که نشان می‌دهد build ممکن است ناقص باشد. اما PM2 application online است.

---

## بررسی Build

### مرحله 1: بررسی BUILD_ID

```bash
# بررسی وجود BUILD_ID
ls -la /home/shop1111/Brun/.next/BUILD_ID

# اگر BUILD_ID وجود دارد، build موفق بوده است
# اگر وجود ندارد، build ناقص است
```

### مرحله 2: بررسی لاگ‌های PM2

```bash
# بررسی لاگ‌ها
pm2 logs saded --lines 50

# بررسی خطاها
pm2 logs saded --err --lines 50
```

### مرحله 3: اگر Build ناقص است

```bash
# Build دوباره با محدودیت منابع
NODE_OPTIONS="--max-old-space-size=2048" npm run build:linux
```

---

## تبدیل Database Charset

دستور MySQL را اجرا کنید:

```bash
mysql -u shop1111_Brundb -p shop1111_Brun -e "ALTER TABLE site_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

**پسورد:** `goul77191336`

---

## بررسی وضعیت Application

بعد از اجرای دستورات:

```bash
# بررسی وضعیت PM2
pm2 status

# بررسی لاگ‌ها
pm2 logs saded --lines 20

# بررسی Port
netstat -tuln | grep 3001
```

---

## اگر Build ناقص است

### گزینه 1: Build محلی و آپلود

در سیستم محلی (Windows):
```bash
npm run build
```

سپس آپلود پوشه `.next` به هاست.

### گزینه 2: Build با محدودیت بیشتر

```bash
NODE_OPTIONS="--max-old-space-size=1536" npm run build:linux
```

---

## تست تغییرات

بعد از اطمینان از build و restart:

1. **فوتر:** `/admin/settings` → تایپ متن فارسی → ذخیره
2. **پروفایل:** `/profile` → کلیک روی "ویرایش" → باید Sheet باز شود
3. **Session:** ورود → بستن مرورگر → باز کردن → باید لاگین بماند
4. **سبد خرید:** اضافه محصول → لاگین → بررسی باقی ماندن
5. **Favicon:** بررسی تب مرورگر

---

## دستورات سریع

```bash
# 1. بررسی BUILD_ID
ls -la .next/BUILD_ID

# 2. بررسی لاگ‌ها
pm2 logs saded --lines 50

# 3. اگر build ناقص است، build دوباره
NODE_OPTIONS="--max-old-space-size=2048" npm run build:linux

# 4. Restart PM2
pm2 restart saded

# 5. بررسی وضعیت
pm2 status
```

