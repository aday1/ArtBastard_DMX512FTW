@echo off
echo ========================================================================
echo   ArtBastard DMX512FTW: MIDI/OSC Monitor (CMD Version)
echo   "The silent conversational partner for your devices"
echo ========================================================================
echo.
echo Launching MIDI/OSC Monitor...
echo.

:: Ensure we use the correct working directory
cd /d "%~dp0"

:: Try the built version first
if exist "build\midi-console.js" (
    echo Running compiled version...
    node build\midi-console.js
) else (
    echo Compiled version not found, running wrapper script...
    node run-midi-monitor.js
)

:: If there was an error, pause so user can see it
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error running MIDI monitor. See error details above.
    pause
)