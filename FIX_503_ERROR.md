# راهنمای رفع خطای 503

## مشکل
بعد از rebuild و restart PM2، سایت خطای 503 می‌دهد.

## علت احتمالی
1. Build ناقص است (خطای `EAGAIN` در build)
2. Application درست start نشده است
3. PM2 process crash کرده است
4. Port درست listen نمی‌کند

---

## مراحل رفع مشکل

### مرحله 1: بررسی PM2 Logs

```bash
# بررسی لاگ‌های PM2
pm2 logs saded --lines 50

# یا فقط خطاها
pm2 logs saded --err --lines 50
```

### مرحله 2: بررسی وضعیت PM2

```bash
# بررسی وضعیت
pm2 status

# بررسی جزئیات
pm2 describe saded

# بررسی info
pm2 info saded
```

### مرحله 3: بررسی Build

```bash
# بررسی وجود BUILD_ID
ls -la /home/shop1111/Brun/.next/BUILD_ID

# بررسی محتویات .next
ls -la /home/shop1111/Brun/.next/ | head -20
```

### مرحله 4: بررسی Port

```bash
# بررسی اینکه آیا port 3001 در حال listen است
netstat -tuln | grep 3001

# یا
ss -tuln | grep 3001
```

### مرحله 5: Restart کامل PM2

```bash
# Stop PM2
pm2 stop saded

# Delete PM2 process
pm2 delete saded

# Start دوباره
pm2 start ecosystem.config.js

# یا
pm2 start ecosystem.config.js --update-env

# بررسی وضعیت
pm2 status
pm2 logs saded --lines 20
```

### مرحله 6: اگر مشکل باقی ماند - Build دوباره

```bash
# پاک کردن کامل .next
rm -rf .next

# Build دوباره (با محدودیت منابع)
NEXT_PRIVATE_SKIP_TURBO=1 NODE_OPTIONS="--max-old-space-size=2048" npx next build --webpack

# یا با تعداد worker کمتر
NEXT_PRIVATE_SKIP_TURBO=1 NODE_OPTIONS="--max-old-space-size=2048" next build --webpack
```

---

## دستورات سریع

```bash
# 1. بررسی لاگ‌ها
pm2 logs saded --lines 50

# 2. بررسی وضعیت
pm2 status

# 3. Restart کامل
pm2 delete saded
pm2 start ecosystem.config.js --update-env

# 4. بررسی Port
netstat -tuln | grep 3001

# 5. بررسی Build
ls -la .next/BUILD_ID
```

---

## اگر Build ناقص است

خطای `EAGAIN` نشان می‌دهد که build به دلیل محدودیت منابع ناقص شده است. در این صورت:

### گزینه 1: Build محلی و آپلود

```bash
# در سیستم محلی (Windows)
npm run build

# سپس آپلود .next folder به هاست
```

### گزینه 2: Build با محدودیت منابع

```bash
# Build با محدودیت RAM
NODE_OPTIONS="--max-old-space-size=2048" npm run build:linux

# یا
NEXT_PRIVATE_SKIP_TURBO=1 NODE_OPTIONS="--max-old-space-size=2048" npx next build --webpack
```

---

## بررسی‌های اضافی

### بررسی Environment Variables

```bash
# بررسی env variables در PM2
pm2 env 0

# یا
pm2 describe saded | grep -A 20 "env:"
```

### بررسی Process

```bash
# بررسی process
ps aux | grep node

# بررسی PM2 process
ps aux | grep pm2
```

### بررسی .htaccess

```bash
# بررسی .htaccess
cat /home/shop1111/public_html/.htaccess

# بررسی اینکه proxy درست تنظیم شده است
```

---

## اگر هنوز مشکل دارید

لطفاً این اطلاعات را ارسال کنید:
1. خروجی `pm2 logs saded --lines 50`
2. خروجی `pm2 status`
3. خروجی `ls -la .next/BUILD_ID`
4. خروجی `netstat -tuln | grep 3001`

