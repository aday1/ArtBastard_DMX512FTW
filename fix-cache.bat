@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================================
echo   ArtBastard DMX512FTW: Cache Reset Utility
echo   "Purging the browser's memory to reveal true artistic intent"
echo ========================================================================
echo.

echo Stopping any running server processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ArtBastard*" >nul 2>&1

echo Purging build artifacts...
if exist build (
    rmdir /s /q build
)
mkdir build

echo Rebuilding the application with a clean slate...
call npm run build

if %errorlevel% neq 0 (
    echo An error occurred during rebuilding. Please check the output above.
    pause
    exit /b 1
)

echo Application rebuilt successfully.

echo Creating version marker for cache busting...
echo {"version": "%TIME:~0,8%-%DATE:~0,10%"} > build\public\version.json

echo Restarting the application...
start "ArtBastard DMX512FTW Server" cmd /c "npm start"

timeout /t 3 /nobreak >nul

echo.
echo ========================================================================
echo   Cache Reset Complete!
echo.
echo   Please take these additional steps in your browser:
echo   1. Press Ctrl+F5 to force refresh
echo   2. Or clear your browser cache manually
echo   3. Or try opening in a private/incognito window
echo.
echo   Your illuminated canvas awaits at: http://localhost:3001
echo.
echo   To close the application, close the server terminal window.
echo ========================================================================
echo.

start http://localhost:3001

pause