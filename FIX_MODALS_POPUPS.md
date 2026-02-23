# راهنمای رفع مشکل مودال‌ها و پاپ‌آپ‌ها

## مشکل
مودال‌ها و پاپ‌آپ‌ها درست در صفحه نمایش داده نمی‌شوند و فیکس نیستند. ممکن است از viewport خارج شوند یا به سمت راست متمایل شوند.

## تغییرات اعمال شده

### 1. `components/ui/dialog.tsx`
- اضافه شدن `overflow-x-hidden` و `overflow-y-auto`
- اضافه شدن `maxWidth: 'calc(100vw - 2rem)'` و `maxHeight: '90vh'`
- اطمینان از center شدن درست با `left: 50%` و `transform: translate(-50%, -50%)`

### 2. `components/ui/sheet.tsx`
- اضافه شدن `overflow-y-auto overflow-x-hidden max-w-full`
- اضافه شدن `max-w-[90vw]` برای side variants
- اضافه شدن `max-h-[90vh]` برای top/bottom variants

### 3. `components/ui/popover.tsx`
- اضافه شدن `max-w-[calc(100vw-2rem)] overflow-x-hidden`
- اضافه شدن inline style برای `maxWidth`

### 4. `components/admin/admin-chat.tsx`
- اضافه شدن inline style برای `maxWidth` و `overflowX`

### 5. `components/ui/toast.tsx`
- اضافه شدن `sm:left-0` برای RTL support
- اضافه شدن `max-w-[calc(100vw-2rem)] overflow-x-hidden`
- اضافه شدن inline style برای `maxWidth`

### 6. `components/notifications/persistent-notification.tsx`
- اضافه شدن `max-w-[calc(100vw-2rem)] overflow-x-hidden`

### 7. `components/notifications/notification-center.tsx`
- اضافه شدن `max-w-[calc(100vw-2rem)] overflow-x-hidden`
- اضافه شدن inline style برای `maxWidth`

### 8. `app/admin/admin.css`
- اضافه شدن CSS قوی برای همه مودال‌ها، پاپ‌آپ‌ها، Toast و Notification
- Fix برای RTL direction در Sheet
- Fix برای Dialog Overlay
- Fix برای Toast Viewport
- Fix برای همه fixed positioned elements

---

## مراحل اجرا

### مرحله 1: آپلود فایل‌های تغییر یافته

فایل‌های زیر را آپلود کنید:
- `components/ui/dialog.tsx`
- `components/ui/sheet.tsx`
- `components/ui/popover.tsx`
- `components/ui/toast.tsx`
- `components/admin/admin-chat.tsx`
- `components/notifications/persistent-notification.tsx`
- `components/notifications/notification-center.tsx`
- `app/admin/admin.css`

### مرحله 2: Rebuild پروژه (مهم!)

**⚠️ مهم:** بعد از تغییر componentها، حتماً باید rebuild کنید:

```bash
# برگشت به مسیر پروژه
cd /home/shop1111/Brun

# فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# پاک کردن build قبلی
rm -rf .next

# Build دوباره
npm run build:linux
```

**نکته:** اگر `npm run build:linux` خطا داد، از این دستور استفاده کنید:
```bash
NEXT_PRIVATE_SKIP_TURBO=1 npx next build --webpack
```

### مرحله 3: Restart PM2

```bash
# Restart PM2
pm2 restart saded

# بررسی وضعیت
pm2 status

# بررسی لاگ‌ها
pm2 logs saded --lines 20
```

### مرحله 4: پاک کردن Cache مرورگر

**⚠️ بسیار مهم:** بعد از rebuild، حتماً cache مرورگر را پاک کنید:

1. **Chrome/Edge:**
   - `Ctrl + Shift + Delete` (Windows) یا `Cmd + Shift + Delete` (Mac)
   - انتخاب "Cached images and files"
   - انتخاب "All time"
   - کلیک روی "Clear data"

2. **Firefox:**
   - `Ctrl + Shift + Delete` (Windows) یا `Cmd + Shift + Delete` (Mac)
   - انتخاب "Cache"
   - انتخاب "Everything"
   - کلیک روی "Clear Now"

3. **یا استفاده از Hard Refresh:**
   - `Ctrl + F5` (Windows) یا `Cmd + Shift + R` (Mac)

### مرحله 5: تست مودال‌ها و پاپ‌آپ‌ها

1. باز کردن سایت: `http://77191336.shop`
2. رفتن به بخش admin: `http://77191336.shop/admin`
3. تست کردن:
   - ✅ باز کردن Dialog (مثلاً ویرایش محصول)
   - ✅ باز کردن Sheet (مثلاً منوی موبایل)
   - ✅ باز کردن Popover (مثلاً tooltip)
   - ✅ نمایش Toast (مثلاً بعد از ذخیره)
   - ✅ نمایش Notification (مثلاً پیام جدید)
   - ✅ باز کردن Admin Chat Dialog

4. بررسی:
   - ✅ مودال‌ها در center صفحه هستند
   - ✅ مودال‌ها از viewport خارج نمی‌شوند
   - ✅ scrollbar افقی وجود ندارد
   - ✅ مودال‌ها در RTL درست نمایش داده می‌شوند

---

## تغییرات فنی

### Dialog Content
```tsx
// قبل:
className="fixed !left-1/2 !top-1/2 ..."

// بعد:
className="fixed !left-1/2 !top-1/2 ... overflow-y-auto overflow-x-hidden"
style={{
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: '90vh',
  overflowX: 'hidden',
}}
```

### Sheet Content
```tsx
// قبل:
"fixed z-[10001] gap-4 ..."

// بعد:
"fixed z-[10001] gap-4 ... overflow-y-auto overflow-x-hidden max-w-full"
```

### Toast Viewport
```tsx
// قبل:
"fixed top-0 ... sm:right-0 ... md:max-w-[420px]"

// بعد:
"fixed top-0 ... sm:right-0 sm:left-0 ... md:max-w-[420px] max-w-[calc(100vw-2rem)] overflow-x-hidden"
```

### CSS برای همه مودال‌ها
```css
[data-radix-portal],
[data-radix-dialog-content],
[data-radix-sheet-content],
[data-radix-popover-content] {
  max-width: calc(100vw - 2rem) !important;
  max-height: 90vh !important;
  overflow-x: hidden !important;
  box-sizing: border-box !important;
}
```

---

## اگر مشکل باقی ماند

### بررسی 1: آیا فایل‌ها آپلود شده‌اند؟

```bash
# بررسی وجود فایل‌ها
ls -la /home/shop1111/Brun/components/ui/dialog.tsx
ls -la /home/shop1111/Brun/components/ui/sheet.tsx
ls -la /home/shop1111/Brun/components/ui/popover.tsx
ls -la /home/shop1111/Brun/components/ui/toast.tsx
```

### بررسی 2: آیا rebuild انجام شده است؟

```bash
# بررسی وجود BUILD_ID
ls -la /home/shop1111/Brun/.next/BUILD_ID

# بررسی تاریخ build
ls -la /home/shop1111/Brun/.next/
```

### بررسی 3: بررسی Console مرورگر

1. باز کردن Developer Tools: `F12`
2. رفتن به تب "Console"
3. بررسی خطاهای CSS یا JavaScript

### بررسی 4: استفاده از Inspect Element

1. کلیک راست روی مودال → "Inspect"
2. بررسی computed styles:
   - `left` یا `right`
   - `transform`
   - `max-width`
   - `overflow-x`

---

## خلاصه دستورات

```bash
# 1. رفتن به مسیر پروژه
cd /home/shop1111/Brun

# 2. فعال‌سازی virtual environment
source /home/shop1111/nodevenv/Brun/20/bin/activate

# 3. پاک کردن build قبلی
rm -rf .next

# 4. Build دوباره
npm run build:linux

# 5. Restart PM2
pm2 restart saded

# 6. بررسی وضعیت
pm2 status
pm2 logs saded --lines 20
```

---

## نکات مهم

1. **همیشه بعد از تغییر componentها باید rebuild کنید**
2. **همیشه cache مرورگر را پاک کنید**
3. **اگر مشکل باقی ماند، بررسی کنید که فایل‌ها آپلود شده‌اند**
4. **از Developer Tools برای debug استفاده کنید**
5. **مودال‌ها باید `max-width: calc(100vw - 2rem)` داشته باشند**
6. **مودال‌ها باید `overflow-x: hidden` داشته باشند**

---

## اگر هنوز مشکل دارید

لطفاً این اطلاعات را ارسال کنید:
1. Screenshot از مشکل
2. Console errors (از Developer Tools)
3. خروجی `pm2 logs saded --lines 50`
4. خروجی `ls -la /home/shop1111/Brun/components/ui/dialog.tsx`

