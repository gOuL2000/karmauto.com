@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo Git Commit Script
echo ========================================
echo.
echo Current directory: %CD%
echo.
echo Step 1: Adding app folder...
git add app/
if %ERRORLEVEL% EQU 0 (
    echo [OK] app/ added
) else (
    echo [WARNING] app/ not found or already in git
)
echo.
echo Step 2: Adding components folder...
git add components/ 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] components/ added
) else (
    echo [WARNING] components/ not found or already in git
)
echo.
echo Step 3: Adding lib folder...
git add lib/ 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] lib/ added
) else (
    echo [WARNING] lib/ not found or already in git
)
echo.
echo Step 4: Adding public folder...
git add public/ 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] public/ added
) else (
    echo [WARNING] public/ not found or already in git
)
echo.
echo Step 5: Checking status...
git status --short | findstr /C:"A " | findstr /C:"app" /C:"components" /C:"lib" /C:"public"
echo.
echo Step 6: Committing...
git commit -m "Add source code files (app, components, lib, public)"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to commit - no changes to commit
    echo This might mean files are already committed
) else (
    echo [OK] Committed successfully
)
echo.
echo Step 7: Pushing to origin master...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to push
) else (
    echo [OK] Pushed successfully
)
echo.
echo ========================================
echo Done!
echo ========================================
pause

