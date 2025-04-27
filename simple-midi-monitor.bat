@echo off
echo ========================================================================
echo   Simple MIDI Monitor (No Locking/Blocking)
echo   "Just shows MIDI messages without OSC or other features"
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

:: Make window bigger
powershell -command "&{$H=get-host;$W=$H.ui.rawui;$B=$W.buffersize;$B.width=120;$B.height=3000;$W.buffersize=$B;}"
powershell -command "&{$H=get-host;$W=$H.ui.rawui;$S=$W.windowsize;$S.width=120;$S.height=40;$W.windowsize=$S;}"

echo Running simple MIDI monitor...
echo.
echo This monitor uses a simpler approach that should avoid locking issues.
echo It will try to connect to all MIDI devices non-exclusively.
echo.

:: Kill any hanging node processes that might be keeping MIDI locked
echo Ensuring no conflicts with other processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq ArtBastard*" >nul 2>&1

:: Run the simple monitor
node simple-midi-monitor.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error running MIDI monitor. 
    echo.
    pause
)