@echo off
REM ArtBastard DMX512FTW Launcher
REM Launch the console interface

echo ========================================================================
echo   ArtBastard DMX512FTW - The Luminary Palette
echo   "Launching artistically enhanced DMX controller..."
echo ========================================================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found. Please install PowerShell to use this application.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

REM Launch the PowerShell console with proper execution policy
powershell -ExecutionPolicy Bypass -File "%~dp0ArtBastard-Console.ps1"

REM Check if PowerShell exited with an error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: PowerShell encountered an error. Please check the output above.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

exit /b 0