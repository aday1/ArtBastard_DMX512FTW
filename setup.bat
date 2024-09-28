@echo off
echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b %errorlevel%
)

echo Creating data directory...
mkdir data

echo Building the application...
call npm run build

if %errorlevel% neq 0 (
    echo Error: Failed to build the application.
    pause
    exit /b %errorlevel%
)

echo Starting the application...
start "" npm start

echo Application is running. Please open your web browser and navigate to http://localhost:3001
echo Press Ctrl+C in this window to stop the server when you're done.
pause