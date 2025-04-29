@echo off
title ArtBastard DMX512FTW - React App Setup
color 0A

echo.
echo ==================================
echo  ArtBastard DMX512FTW React Setup
echo ==================================
echo.
echo This script will set up and run the React application.
echo.

cd react-app

echo Cleaning previous installation...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul

echo.
echo Installing dependencies with legacy peer deps...
echo (This may take a few minutes)
echo.
call npm install --legacy-peer-deps

echo.
echo Installation complete!
echo.

echo Starting Vite development server...
echo (If this fails, we'll try an alternative method)
echo.

:: Try running with vite directly first
call npx vite --host

:: If vite failed, fall back to our node script
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying alternative startup method...
    echo.
    call node start-react.js
)

pause