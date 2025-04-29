@echo off
title ArtBastard DMX512FTW React Edition Launcher
color 0B

:: ASCII Art Logo (simplified to avoid special character issues)
echo.
echo     ArtBastard DMX512FTW
echo     ===================
echo.
echo     React Edition Launcher (Windows)
echo.

:: Function to print colored text
call :ColorText 0B "==== Checking prerequisites ===="
echo.
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call :ColorText 0C "Error: Node.js is not installed"
    echo.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check npm version
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call :ColorText 0C "Error: npm is not installed"
    echo.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

call :ColorText 0A "✓ Node.js and npm are installed"
echo.
node -v | findstr /r "v.*" > nul && echo   Node.js version: && node -v
npm -v | findstr /r "[0-9].*" > nul && echo   npm version: && npm -v
echo.

:: Create data directory if it doesn't exist
if not exist data (
    call :ColorText 0E "Creating data directory..."
    echo.
    mkdir data
    call :ColorText 0A "✓ Data directory created"
    echo.
)

:: Create logs directory if it doesn't exist
if not exist logs (
    call :ColorText 0E "Creating logs directory..."
    echo.
    mkdir logs
    call :ColorText 0A "✓ Logs directory created"
    echo.
)

:: Install backend dependencies
call :ColorText 0B "==== Setting up backend ===="
echo.
echo.

if not exist node_modules (
    call :ColorText 0E "Installing backend dependencies..."
    echo.
    call npm install
    call :ColorText 0A "✓ Backend dependencies installed"
    echo.
) else (
    call :ColorText 0A "✓ Backend dependencies already installed"
    echo.
)

:: Install frontend dependencies
call :ColorText 0B "==== Setting up React frontend ===="
echo.
echo.

cd react-app
if not exist node_modules (
    call :ColorText 0E "Installing React dependencies..."
    echo.
    call npm install
    call :ColorText 0A "✓ React dependencies installed"
    echo.
) else (
    call :ColorText 0A "✓ React dependencies already installed"
    echo.
)

:: Build the React app if it hasn't been built yet
if not exist dist (
    call :ColorText 0E "Building React application..."
    echo.
    call npm run build
    call :ColorText 0A "✓ React application built"
    echo.
) else (
    call :ColorText 0A "✓ React application already built"
    echo.
)

cd ..

:: Build the backend if it hasn't been built yet
if not exist build (
    call :ColorText 0B "==== Building backend ===="
    echo.
    echo.
    call :ColorText 0E "Building backend..."
    echo.
    call npm run build
    call :ColorText 0A "✓ Backend built"
    echo.
) else (
    call :ColorText 0A "✓ Backend already built"
    echo.
)

:: Launch options
call :ColorText 0B "==== Launch Options ===="
echo.
echo.
call :ColorText 0E "1. Start Production Server" 
echo  (built version with React frontend)
call :ColorText 0E "2. Start Development Server" 
echo  (with auto-reload for backend changes)
call :ColorText 0E "3. Start React Development Server" 
echo  (for frontend development)
call :ColorText 0E "4. Exit"
echo.

SET /P option=Select an option (1-4): 

IF "%option%"=="1" (
    call :ColorText 0B "==== Starting Production Server ===="
    echo.
    echo.
    call :ColorText 09 "Access the application at http://localhost:3001"
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    call :ColorText 0A "Starting server..."
    echo.
    echo.
    call npm start
) ELSE IF "%option%"=="2" (
    call :ColorText 0B "==== Starting Development Server ===="
    echo.
    echo.
    echo This mode will auto-reload when backend files change
    call :ColorText 09 "Access the application at http://localhost:3001"
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    call :ColorText 0A "Starting development server..."
    echo.
    echo.
    call npm run start:dev
) ELSE IF "%option%"=="3" (
    call :ColorText 0B "==== Starting React Development Server ===="
    echo.
    echo.
    echo This mode is for frontend development only
    echo Backend services will not be available in this mode
    call :ColorText 09 "Access the React dev server at http://localhost:3000"
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    call :ColorText 0A "Starting React development server..."
    echo.
    echo.
    cd react-app
    call npm start
) ELSE IF "%option%"=="4" (
    call :ColorText 09 "Exiting..."
    echo.
    exit /b 0
) ELSE (
    call :ColorText 0C "Invalid option. Exiting..."
    echo.
    pause
    exit /b 1
)

exit /b 0

:ColorText
echo %~2
goto :eof