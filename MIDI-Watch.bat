@echo off
echo ========================================================================
echo   ArtBastard DMX512FTW: MIDI/OSC Monitoring Tool
echo   "Watches messages without interfering with ports"
echo ========================================================================
echo.

:: Ensure we use the correct working directory
cd /d "%~dp0"

:: First, check if Node.js is installed
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is required but not found.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if the main app is running first
powershell -Command "Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet" > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: ArtBastard server is not running.
    echo Please start the main application first with:
    echo    npm start
    echo or
    echo    Launch-ArtBastard.bat
    pause
    exit /b 1
)

:: Make window bigger
powershell -command "&{$H=get-host;$W=$H.ui.rawui;$B=$W.buffersize;$B.width=120;$B.height=3000;$W.buffersize=$B;}"
powershell -command "&{$H=get-host;$W=$H.ui.rawui;$S=$W.windowsize;$S.width=120;$S.height=40;$W.windowsize=$S;}"

echo Running MIDI/OSC passthrough monitor...
echo.
echo This monitor only watches messages that ArtBastard receives.
echo It does NOT try to open any MIDI or OSC ports directly.
echo.

:: Install socket.io-client if not already installed
if not exist "node_modules\socket.io-client" (
    echo Installing required dependencies...
    npm install socket.io-client --no-save > nul
)

:: Run the monitoring script
node midi-passthrough.js

:: If there was an error, pause so user can see it
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error running MIDI monitor. 
    echo Make sure the main ArtBastard application is running.
    pause
)