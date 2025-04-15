# ArtBastard DMX512FTW: The Luminary Palette - Installation Script for Windows
# This PowerShell script prepares your canvas for the art of light

Write-Host "
╔═══════════════════════════════════════════════════════════════╗
║ ArtBastard DMX512FTW: The Luminary Palette                    ║
║                                                               ║
║  'Where technicians become artists,                           ║
║   and artists become luminescent technicians.'                ║
╚═══════════════════════════════════════════════════════════════╝
" -ForegroundColor Magenta

# Function to check if a command exists
function Test-CommandExists {
    param ($command)
    $exists = $null -ne (Get-Command $command -ErrorAction SilentlyContinue)
    return $exists
}

# Check for required dependencies
Write-Host "Examining the required artistic implements..." -ForegroundColor Cyan

$nodeExists = Test-CommandExists "node"
$npmExists = Test-CommandExists "npm"

if (-not $nodeExists) {
    Write-Host "Node.js is not present in your creative environment." -ForegroundColor Yellow
    Write-Host "Please install Node.js from https://nodejs.org/ (Version 14 or later recommended)" -ForegroundColor Yellow
    Write-Host "After installation, please restart this script." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

$nodeVersion = node -v
Write-Host "Node.js palette detected: $nodeVersion" -ForegroundColor Green

if (-not $npmExists) {
    Write-Host "npm is not present in your creative environment." -ForegroundColor Yellow
    Write-Host "It should be included with Node.js. Please check your installation." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

$npmVersion = npm -v
Write-Host "npm curator detected: $npmVersion" -ForegroundColor Green

# Create data directory if it doesn't exist
Write-Host "Establishing the data sanctuary..." -ForegroundColor Cyan
if (-not (Test-Path -Path "data")) {
    New-Item -ItemType Directory -Path "data" | Out-Null
    Write-Host "Data sanctuary created." -ForegroundColor Green
} else {
    Write-Host "Data sanctuary already exists." -ForegroundColor Green
}

# Create logs directory if it doesn't exist
Write-Host "Preparing the chronicles repository..." -ForegroundColor Cyan
if (-not (Test-Path -Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
    Write-Host "Log repository created." -ForegroundColor Green
} else {
    Write-Host "Log repository already exists." -ForegroundColor Green
}

# Install dependencies
Write-Host "Summoning the necessary components..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "An error occurred while gathering the components. Please check the output above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Components assembled successfully." -ForegroundColor Green

# Build the application
Write-Host "Manifesting the luminous interface..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "An error occurred during the manifestation process. Please check the output above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "Luminous interface manifested successfully." -ForegroundColor Green

# Start the application
Write-Host "Breathing life into your creation..." -ForegroundColor Cyan
Write-Host "The ArtBastard DMX512FTW is now ready to assist your artistic expression." -ForegroundColor Magenta
Write-Host "Opening the application in your browser..." -ForegroundColor Magenta

# Start the server in a new command window
Start-Process cmd -ArgumentList "/c npm start"

# Wait a moment for the server to start
Start-Sleep -Seconds 3

# Open the browser
Start-Process "http://localhost:3001"

Write-Host "
╔═══════════════════════════════════════════════════════════════╗
║ Installation Complete!                                        ║
║                                                               ║
║ Your illuminated canvas awaits at: http://localhost:3001      ║
║                                                               ║
║ To close the application, press Ctrl+C in the terminal where  ║
║ the server is running, or close the terminal window.          ║
╚═══════════════════════════════════════════════════════════════╝
" -ForegroundColor Magenta

# Keep the window open
Read-Host "Press Enter to close this setup window (the application will continue running)"