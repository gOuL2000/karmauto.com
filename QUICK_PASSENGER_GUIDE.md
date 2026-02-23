# راهنمای سریع Passenger

## ✅ بله، باید در Application Manager هم ثبت کنید!

اگر هاست شما از **Phusion Passenger** استفاده می‌کند، باید application را در بخش **Application Manager** ثبت کنید.

---

## 📝 تنظیمات در Application Manager

### Application Name:
```
saded
```

### Deployment Domain:
```
77191336.shop
```

### Application Path:
```
Brun
```
**⚠️ مهم:** فقط `Brun` را وارد کنید (نه `/home/shop1111/Brun`)

### Deployment Environment:
```
Production
```

---

## 🔧 کارهای بعدی

### 1. نصب Dependencies
```bash
source /home/shop1111/nodevenv/Brun/20/bin/activate
cd /home/shop1111/Brun
npm install
```

### 2. Build پروژه
```bash
npm run build
```

### 3. Restart Application
در Application Manager، روی **Restart** کلیک کنید.

یا از Terminal:
```bash
touch /home/shop1111/Brun/tmp/restart.txt
```

---

## ⚠️ نکات مهم

1. **فقط یکی را انتخاب کنید:**
   - ✅ Passenger (Application Manager)
   - ❌ Node.js App Manager
   - ❌ PM2

2. **فایل `.htaccess`:**
   - اگر از Passenger استفاده می‌کنید، معمولاً نیازی به `.htaccess` نیست
   - Passenger خودش همه چیز را مدیریت می‌کند

3. **Environment Variables:**
   - می‌توانید در Application Manager تنظیم کنید
   - یا در فایل `.env.production` قرار دهید

---

## 📚 راهنمای کامل

برای راهنمای کامل، فایل `PASSENGER_SETUP.md` را مطالعه کنید.

