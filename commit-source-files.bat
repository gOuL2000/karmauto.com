@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Current directory: %CD%
echo.
echo Adding app folder...
git add app/
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to add app/
    pause
    exit /b 1
)
echo.
echo Adding components folder...
git add components/
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: components/ not found or already in git
)
echo.
echo Adding lib folder...
git add lib/
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: lib/ not found or already in git
)
echo.
echo Adding public folder...
git add public/
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: public/ not found or already in git
)
echo.
echo Checking status...
git status --short | findstr /C:"A " | findstr /C:"app" /C:"components" /C:"lib" /C:"public"
echo.
echo Committing...
git commit -m "Add source code files (app, components, lib, public)"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to commit
    pause
    exit /b 1
)
echo.
echo Pushing to origin master...
git push origin master
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to push
    pause
    exit /b 1
)
echo.
echo Done!
pause

