@echo off
echo ========================================================================
echo   ArtBastard DMX512FTW: MIDI/OSC Monitor (Direct Mode)
echo   "The silent conversational partner for your devices"
echo ========================================================================
echo.
echo Launching MIDI/OSC Monitor directly with Node.js...
echo.

:: Change to the script directory
cd /d "%~dp0"

:: First try with the compiled js file if it exists
if exist "build\midi-console.js" (
    node build\midi-console.js
) else (
    :: If compiled file doesn't exist, try with ts-node
    echo Compiled file not found, trying with ts-node...
    npx ts-node src\midi-console.ts
)

:: If we got here and there was an error, pause
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error running MIDI monitor
    pause
)