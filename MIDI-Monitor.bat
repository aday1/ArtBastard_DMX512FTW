@echo off
echo ========================================================================
echo   ArtBastard DMX512FTW: MIDI/OSC Monitor
echo   "See your MIDI devices and signals in real-time"
echo ========================================================================
echo.
echo Launching MIDI/OSC Monitor...
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

:: Auto-run MIDI debugging if no MIDI devices detected
node -e "try { const inputs = require('easymidi').getInputs(); if (inputs.length === 0) { console.log('No MIDI devices detected - running diagnostic tool...'); process.exit(1); } else { console.log('MIDI devices detected: ' + inputs.join(', ')); } } catch(e) { console.log('Error checking MIDI: ' + e.message); process.exit(1); }"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo No MIDI devices detected or error accessing MIDI system.
    echo.
    echo Would you like to run the MIDI debugging tool? (Y/N)
    set /p run_debug="Enter Y or N: "
    if /i "%run_debug%"=="Y" (
        echo Running MIDI debugging tool...
        call debug-midi.bat
        echo Debug tool completed. Press any key to continue with MIDI monitor...
        pause > nul
    )
)

:: New - create a bigger command window for better visibility
powershell -command "&{$H=get-host;$W=$H.ui.rawui;$B=$W.buffersize;$B.width=120;$B.height=3000;$W.buffersize=$B;}"
powershell -command "&{$H=get-host;$W=$H.ui.rawui;$S=$W.windowsize;$S.width=120;$S.height=40;$W.windowsize=$S;}"

:: Add a mode that forces RtMidi backend for Windows if users have issues
echo MIDI Monitor Launch Options:
echo 1. Standard Mode (recommended)
echo 2. Windows-compatible Mode (try if standard mode fails)
echo.
set /p launch_mode="Enter option number (1-2, default is 1): "

if "%launch_mode%"=="2" (
    echo Using Windows-compatible mode...
    set RTMIDI_API=winmm
) else (
    set launch_mode=1
    echo Using standard mode...
)

:: Check if build directory exists
if exist "build\midi-console.js" (
    echo Using compiled version...
    
    :: Run with built application
    if "%launch_mode%"=="2" (
        echo Running with Windows MIDI compatibility mode...
        node -e "process.env.RTMIDI_API='winmm'; require('./build/midi-console.js');"
    ) else (
        node build\midi-console.js
    )
) else (
    :: Try using our wrapper script
    echo Compiled version not found, running with ts-node...
    
    if exist "run-midi-monitor.js" (
        if "%launch_mode%"=="2" (
            echo Running with Windows MIDI compatibility mode...
            node -e "process.env.RTMIDI_API='winmm'; require('./run-midi-monitor.js');"
        ) else (
            node run-midi-monitor.js
        )
    ) else (
        :: Direct method - try to use ts-node
        echo Wrapper script not found, trying direct ts-node execution...
        if "%launch_mode%"=="2" (
            echo Running with Windows MIDI compatibility mode...
            set RTMIDI_API=winmm
            npx ts-node src\midi-console.ts
        ) else (
            npx ts-node src\midi-console.ts
        )
    )
)

:: If there was an error, pause so user can see it
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error running MIDI monitor. See error details above.
    
    :: One last attempt with PowerShell
    echo Trying PowerShell launch method...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -Command "& { Set-Location '%~dp0'; try { npm run midi-console } catch { Write-Host 'Error: $_' -ForegroundColor Red; pause } }"
    
    if %ERRORLEVEL% NEQ 0 (
        echo All launch methods failed. Please check your installation.
        echo Running debug-midi.bat may help diagnose the issue.
        pause
    )
)