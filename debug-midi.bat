@echo off
echo ========================================================================
echo   ArtBastard DMX512FTW: MIDI Debugging Tool
echo   "Find and diagnose MIDI device detection issues"
echo ========================================================================
echo.

:: Ensure we use the correct working directory
cd /d "%~dp0"

echo Checking Node.js installation...
node --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is required but not found.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo ========== SYSTEM INFORMATION ==========
echo.
echo Operating System:
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
echo.

echo Node.js version:
node --version
echo.

echo NPM version:
npm --version
echo.

echo ========== MIDI INTERFACES ==========
echo.
echo Creating MIDI info test script...

echo.
echo Listing audio interfaces using PowerShell...
powershell -Command "Get-CimInstance Win32_SoundDevice | Format-Table Manufacturer, Name, Status -AutoSize"
echo.

echo Checking Windows Device Manager...
echo The following MIDI devices are found in Device Manager:
echo (Look for "Sound, video and game controllers" devices)
echo.
powershell -Command "Get-PnpDevice -Class 'Sound, video and game controllers' | Format-Table Status, Class, FriendlyName -AutoSize"
echo.

echo.
echo ========== EASYMIDI DETECTION ==========
echo.

:: Create a temporary JS file to list MIDI devices
echo var easymidi; > midi-debug.js
echo try { >> midi-debug.js
echo   easymidi = require('easymidi'); >> midi-debug.js
echo   console.log('easymidi module loaded successfully!'); >> midi-debug.js
echo   console.log(''); >> midi-debug.js
echo   console.log('MIDI INPUT DEVICES:'); >> midi-debug.js
echo   try { >> midi-debug.js
echo     var inputs = easymidi.getInputs(); >> midi-debug.js
echo     if (inputs.length === 0) { >> midi-debug.js
echo       console.log('  No MIDI input devices found'); >> midi-debug.js
echo     } else { >> midi-debug.js
echo       inputs.forEach(function(input, i) { >> midi-debug.js
echo         console.log('  ' + (i+1) + '. ' + input); >> midi-debug.js
echo       }); >> midi-debug.js
echo     } >> midi-debug.js
echo   } catch (err) { >> midi-debug.js
echo     console.log('Error getting MIDI inputs: ' + err.message); >> midi-debug.js
echo   } >> midi-debug.js
echo   console.log(''); >> midi-debug.js
echo   console.log('MIDI OUTPUT DEVICES:'); >> midi-debug.js
echo   try { >> midi-debug.js
echo     var outputs = easymidi.getOutputs(); >> midi-debug.js
echo     if (outputs.length === 0) { >> midi-debug.js
echo       console.log('  No MIDI output devices found'); >> midi-debug.js
echo     } else { >> midi-debug.js
echo       outputs.forEach(function(output, i) { >> midi-debug.js
echo         console.log('  ' + (i+1) + '. ' + output); >> midi-debug.js
echo       }); >> midi-debug.js
echo     } >> midi-debug.js
echo   } catch (err) { >> midi-debug.js
echo     console.log('Error getting MIDI outputs: ' + err.message); >> midi-debug.js
echo   } >> midi-debug.js
echo } catch (err) { >> midi-debug.js
echo   console.log('Error loading easymidi module: ' + err.message); >> midi-debug.js
echo   console.log(''); >> midi-debug.js
echo   console.log('This might be because:'); >> midi-debug.js
echo   console.log('- easymidi module is not installed (npm install easymidi)'); >> midi-debug.js
echo   console.log('- there is a compatibility issue with your Node.js version'); >> midi-debug.js
echo } >> midi-debug.js

echo Running MIDI detection test...
echo.
node midi-debug.js
echo.

echo ========== REINSTALL SUGGESTION ==========
echo.
echo If you're having MIDI detection issues, try reinstalling MIDI dependencies:
echo 1. Run: npm uninstall easymidi
echo 2. Run: npm install easymidi@3.1.0 --save
echo 3. Try the MIDI monitor again
echo.

echo ========== ADMINISTRATOR RUN ==========
echo.
echo If issues persist, try running the MIDI monitor as Administrator by:
echo 1. Right-click on MIDI-Monitor.bat
echo 2. Select "Run as administrator"
echo.

:: Cleanup
del midi-debug.js

echo ========== DEBUGGING COMPLETE ==========
echo.
echo If the issues persist, check that your MIDI device:
echo 1. Is properly connected to your computer
echo 2. Is powered on
echo 3. Has the correct drivers installed
echo 4. Is not being used by another application
echo.
echo Press any key to exit...
pause > nul