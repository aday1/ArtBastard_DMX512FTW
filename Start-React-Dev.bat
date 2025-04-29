@echo off
title ArtBastard DMX512FTW React Development Server
color 0A

echo.
echo Starting React development server...
echo.
echo This may take a moment to start up. Please wait...
echo.

cd react-app

:: Try to run with react-scripts
echo Attempting to start with react-scripts...
call npx react-scripts start

:: If the above fails, try with simple express server
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Falling back to simple development server...
    echo.
    call node start-react.js
)

pause