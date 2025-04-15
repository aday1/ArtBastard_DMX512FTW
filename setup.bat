@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================================
echo   ArtBastard DMX512FTW: The Luminary Palette - Windows Installation
echo   "Where technicians become artists, and artists become luminescent technicians."
echo ========================================================================
echo.

REM Check if Node.js is installed
echo Examining the required artistic implements...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not present in your creative environment.
    echo Please install Node.js from https://nodejs.org/ ^(Version 14 or later recommended^)
    echo After installation, please restart this script.
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js palette detected: %NODE_VERSION%

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo npm is not present in your creative environment.
    echo It should be included with Node.js. Please check your installation.
    pause
    exit /b 1
)

REM Get npm version
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo npm curator detected: %NPM_VERSION%

REM Create data directory if it doesn't exist
echo Establishing the data sanctuary...
if not exist data (
    mkdir data
    echo Data sanctuary created.
) else (
    echo Data sanctuary already exists.
)

REM Create logs directory if it doesn't exist
echo Preparing the chronicles repository...
if not exist logs (
    mkdir logs
    echo Log repository created.
) else (
    echo Log repository already exists.
)

REM Install dependencies
echo Summoning the necessary components...
call npm install

if %errorlevel% neq 0 (
    echo An error occurred while gathering the components. Please check the output above.
    pause
    exit /b 1
)

echo Components assembled successfully.

REM Build the application
echo Manifesting the luminous interface...
call npm run build

if %errorlevel% neq 0 (
    echo An error occurred during the manifestation process. Please check the output above.
    pause
    exit /b 1
)

echo Luminous interface manifested successfully.

REM Start the application
echo Breathing life into your creation...
echo The ArtBastard DMX512FTW is now ready to assist your artistic expression.
echo Opening the application in your browser...

REM Start the server in a new command window
start "ArtBastard DMX512FTW Server" cmd /c "npm start"

REM Wait a moment for the server to start
timeout /t 3 /nobreak >nul

REM Open the default browser to the application
start http://localhost:3001

echo.
echo ========================================================================
echo   Installation Complete!
echo.
echo   Your illuminated canvas awaits at: http://localhost:3001
echo.
echo   To close the application, close the server terminal window.
echo ========================================================================
echo.

pause