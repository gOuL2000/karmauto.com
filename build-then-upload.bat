@echo off
chcp 65001 >nul
echo ============================================
echo   بیلد پروژه برای آپلود روی هاست
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] در حال بیلد...
call npm run build 2>nul
if %errorlevel% neq 0 (
  echo.
  echo npm run build خطا داد. در حال امتحان بیلد بدون cross-env...
  set NEXT_PRIVATE_SKIP_TURBO=1
  call npx next build --webpack
)

if %errorlevel% neq 0 (
  echo.
  echo بیلد ناموفق بود. خطاها را بالا ببین.
  pause
  exit /b 1
)

echo.
echo [2/2] بیلد موفق.
echo.
echo --------------------------------------------
echo   این‌ها را روی هاست جایگزین کن:
echo --------------------------------------------
echo   - پوشه  .next   (کامل)
echo   - فایل  server.js
echo   - فایل  package.json
echo   - فایل  package-lock.json
echo   - در صورت تغییر:  app  ,  components  ,  public  ,  .env
echo --------------------------------------------
echo   جزئیات: DEPLOY-UPLOAD-CHECKLIST.md
echo --------------------------------------------
echo.
pause
