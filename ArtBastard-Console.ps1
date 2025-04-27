# ArtBastard DMX512FTW Console
# A simple console-based launcher without any GUI dependencies

# Set console colors and title
$host.UI.RawUI.BackgroundColor = "Black"
$host.UI.RawUI.ForegroundColor = "White"
$host.UI.RawUI.WindowTitle = "ArtBastard DMX512FTW - The Luminary Palette"
Clear-Host

# Function to display colored text
function Write-ColorText {
    param(
        [Parameter(Mandatory=$true, Position=0)]
        [string]$Text,
        
        [Parameter(Mandatory=$false)]
        [string]$ForegroundColor = "White",
        
        [Parameter(Mandatory=$false)]
        [switch]$NoNewLine
    )
    
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    
    if ($NoNewLine) {
        Write-Host $Text -NoNewline
    } else {
        Write-Host $Text
    }
    
    $host.UI.RawUI.ForegroundColor = $originalColor
}

# Function to display a header
function Show-Header {
    Clear-Host
    Write-ColorText "================================================================" -ForegroundColor "Magenta"
    Write-ColorText "             ArtBastard DMX512FTW Console" -ForegroundColor "Yellow"
    Write-ColorText "  Where technicians become artists, and artists become luminescent" -ForegroundColor "Cyan"
    Write-ColorText "================================================================" -ForegroundColor "Magenta"
    Write-Host ""
    Write-Host '"The console of command - a digital canvas where the lighting'
    Write-Host 'director orchestrates DMX universes, translating artistic vision'
    Write-Host 'into precision-timed sequences of channel values."'
    Write-Host '- Professor Tactilus, DMX512 Master Designer' -ForegroundColor Gray
    Write-Host ""
    Write-ColorText "----------------------------------------------------------------" -ForegroundColor "DarkCyan"
    Write-Host ""
}

# Function to display the main menu
function Show-MainMenu {
    Show-Header
    
    Write-ColorText "INSTALLATION" -ForegroundColor "Red"
    Write-ColorText " 1. Check Environment" -ForegroundColor "White"
    Write-ColorText " 2. Install Dependencies" -ForegroundColor "White"
    Write-ColorText " 3. Build Application" -ForegroundColor "White"
    Write-ColorText " 4. Complete Setup (All Steps)" -ForegroundColor "Green"
    Write-Host ""
    
    Write-ColorText "OPERATION" -ForegroundColor "Yellow"
    Write-ColorText " 5. Start Server" -ForegroundColor "Cyan"
    Write-ColorText " 6. Open Web Interface" -ForegroundColor "Cyan"
    Write-ColorText " 7. View Logs" -ForegroundColor "Cyan"
    Write-ColorText " 8. Type Check" -ForegroundColor "Cyan"
    Write-ColorText " 9. MIDI Monitor" -ForegroundColor "Cyan"
    Write-Host ""
    
    Write-ColorText " 0. Exit" -ForegroundColor "DarkGray"
    Write-Host ""
    Write-ColorText "----------------------------------------------------------------" -ForegroundColor "DarkCyan"
    Write-Host ""
    Write-ColorText "Enter your choice (0-9): " -NoNewLine
    
    $choice = Read-Host
    return $choice
}

# Function to pause and wait for user input
function Pause {
    Write-Host ""
    Write-ColorText "Press Enter to continue..." -ForegroundColor "Gray" -NoNewLine
    Read-Host | Out-Null
}

# Function to execute a command and display output
function Invoke-CommandWithOutput {
    param(
        [string]$Command,
        [string]$Description = ""
    )
    
    Write-Host ""
    if ($Description -ne "") {
        Write-ColorText $Description -ForegroundColor "Yellow"
    }
    Write-ColorText "Executing: $Command" -ForegroundColor "DarkGray"
    Write-Host ""
    
    try {
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = "powershell.exe"
        $pinfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"$Command`""
        $pinfo.RedirectStandardOutput = $true
        $pinfo.RedirectStandardError = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $pinfo
        $process.Start() | Out-Null
        
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        
        $exitCode = $process.ExitCode
        
        if ($stdout) {
            Write-Host $stdout
        }
        
        if ($stderr) {
            Write-ColorText $stderr -ForegroundColor "Red"
        }
        
        if ($exitCode -eq 0) {
            Write-Host ""
            Write-ColorText "Command completed successfully (Exit code: $exitCode)" -ForegroundColor "Green"
            return $true
        } else {
            Write-Host ""
            Write-ColorText "Command failed with exit code: $exitCode" -ForegroundColor "Red"
            return $false
        }
    } catch {
        Write-ColorText "Error executing command: $_" -ForegroundColor "Red"
        return $false
    }
}

# Function to check Node.js environment
function Check-Environment {
    Show-Header
    
    Write-ColorText "CHECKING ENVIRONMENT" -ForegroundColor "Cyan"
    Write-Host ""
    
    # Check Node.js
    Write-ColorText "Checking Node.js..." -ForegroundColor "White"
    $nodeResult = Invoke-CommandWithOutput "node --version"
    
    if (-not $nodeResult) {
        Write-ColorText "Node.js is required. Please install it from https://nodejs.org/" -ForegroundColor "Red"
        Pause
        return $false
    }
    
    # Check npm
    Write-ColorText "Checking npm..." -ForegroundColor "White"
    $npmResult = Invoke-CommandWithOutput "npm --version"
    
    if (-not $npmResult) {
        Write-ColorText "npm is required. It should be installed with Node.js." -ForegroundColor "Red"
        Pause
        return $false
    }
    
    # Check directories
    Write-ColorText "Checking directories..." -ForegroundColor "White"
    
    if (-not (Test-Path "data")) {
        Write-ColorText "Creating data directory..." -ForegroundColor "Yellow"
        New-Item -Path "data" -ItemType Directory -Force | Out-Null
    }
    
    if (-not (Test-Path "logs")) {
        Write-ColorText "Creating logs directory..." -ForegroundColor "Yellow"
        New-Item -Path "logs" -ItemType Directory -Force | Out-Null
    }
    
    Write-Host ""
    Write-ColorText "Environment check completed successfully." -ForegroundColor "Green"
    Pause
    return $true
}

# Function to install dependencies
function Install-Dependencies {
    Show-Header
    
    Write-ColorText "INSTALLING DEPENDENCIES" -ForegroundColor "Cyan"
    Write-Host ""
    Write-ColorText "Installing npm dependencies (this might take a moment)..." -ForegroundColor "White"
    
    $result = Invoke-CommandWithOutput "npm install" -Description "Summoning the Digital Components..."
    
    if ($result) {
        Write-Host ""
        Write-ColorText "Dependencies installed successfully." -ForegroundColor "Green"
    } else {
        Write-Host ""
        Write-ColorText "Failed to install dependencies." -ForegroundColor "Red"
    }
    
    Pause
    return $result
}

# Function to build the application
function Build-Application {
    Show-Header
    
    Write-ColorText "BUILDING APPLICATION" -ForegroundColor "Cyan"
    Write-Host ""
    
    # Clean build directory
    if (Test-Path "build") {
        Write-ColorText "Purging previous manifestations..." -ForegroundColor "Yellow"
        Remove-Item -Path "build" -Recurse -Force
    }
    
    Write-ColorText "Creating build directory..." -ForegroundColor "White"
    New-Item -Path "build" -ItemType Directory -Force | Out-Null
    
    Write-ColorText "Building the application (this might take a moment)..." -ForegroundColor "White"
    $result = Invoke-CommandWithOutput "npm run build" -Description "Manifesting the Luminous Interface..."
    
    if ($result) {
        Write-Host ""
        Write-ColorText "Application built successfully." -ForegroundColor "Green"
    } else {
        Write-Host ""
        Write-ColorText "Failed to build the application." -ForegroundColor "Red"
    }
    
    Pause
    return $result
}

# Function to run TypeScript check
function Check-TypeScript {
    Show-Header
    
    Write-ColorText "VALIDATING CODE INTEGRITY" -ForegroundColor "Cyan"
    Write-Host ""
    
    $result = Invoke-CommandWithOutput "npx tsc --noEmit" -Description "Performing TypeScript validation..."
    
    if ($result) {
        Write-Host ""
        Write-ColorText "TypeScript check passed. Your code is harmoniously aligned." -ForegroundColor "Green"
    } else {
        Write-Host ""
        Write-ColorText "TypeScript check failed. Please review the errors above." -ForegroundColor "Red"
    }
    
    Pause
    return $result
}

# Function to start the application
function Start-LuminousCanvas {
    Show-Header
    
    Write-ColorText "STARTING SERVER" -ForegroundColor "Cyan"
    Write-Host ""
    
    # Check if Node.js is installed
    try {
        $nodeVersion = & node --version
        Write-ColorText "Node.js version: $nodeVersion" -ForegroundColor "White"
    } catch {
        Write-ColorText "Node.js is required but not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor "Red"
        Pause
        return
    }
    
    # Check if the server is already running
    try {
        $isRunning = $false
        try {
            # Test if port 3001 is in use
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $portOpen = $tcpClient.ConnectAsync("localhost", 3001).Wait(1000)
            $tcpClient.Close()
            $isRunning = $portOpen
        } catch {
            # Port is likely not in use
        }
        
        if ($isRunning) {
            Write-ColorText "Server is already running on port 3001." -ForegroundColor "Green"
            Pause
            return
        }
    } catch {
        # Connection test failed, server is probably not running
    }
    
    # Make sure the app is built
    if (-not (Test-Path "build/server.js")) {
        Write-ColorText "Application is not built yet. Building now..." -ForegroundColor "Yellow"
        $buildResult = Build-Application
        if (-not $buildResult) {
            Write-ColorText "Failed to build the application. Cannot start server." -ForegroundColor "Red"
            Pause
            return
        }
    }
    
    # Start a new terminal for running the server
    try {
        Write-ColorText "Starting the server in a new terminal..." -ForegroundColor "White"
        
        # Create a batch file to start the server
        $serverBatchPath = Join-Path $PWD "temp-server-start.bat"
        $serverBatchContent = @"
@echo off
cd /d "%~dp0"
echo ========================================================================
echo   ArtBastard DMX512FTW Server
echo   "Starting lighting control server..."
echo ========================================================================
echo.
echo The server window will remain open while the application is running.
echo Close this window to stop the server when you're finished.
echo.
echo Server starting on http://localhost:3001
echo.
node build/server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server failed to start. Error code: %ERRORLEVEL%
    echo.
    pause
)
"@
        Set-Content -Path $serverBatchPath -Value $serverBatchContent
        
        # Try different methods to launch the server
        $launched = $false
        
        # Try cmd method
        try {
            Start-Process "cmd.exe" -ArgumentList "/k `"$serverBatchPath`"" -WindowStyle Normal
            $launched = $true
        } catch {
            Write-ColorText "Primary launch method failed: $($_.Exception.Message)" -ForegroundColor "Red"
        }
        
        if ($launched) {
            Write-ColorText "Server launched successfully. The application will be accessible at: http://localhost:3001" -ForegroundColor "Green"
            
            # Clean up batch file in the background
            Start-Sleep -Seconds 2
            if (Test-Path $serverBatchPath) {
                Remove-Item $serverBatchPath -Force -ErrorAction SilentlyContinue
            }
        } else {
            Write-ColorText "All server launch methods failed. Please try running 'npm start' manually in a command window." -ForegroundColor "Red"
        }
    } catch {
        Write-ColorText "Error starting server: $($_.Exception.Message)" -ForegroundColor "Red"
    }
    
    Pause
}

# Function to view logs
function View-Chronicles {
    Show-Header
    
    Write-ColorText "EXAMINING LOGS" -ForegroundColor "Cyan"
    Write-Host ""
    
    $logPath = Join-Path $PWD "logs\app.log"
    
    if (Test-Path $logPath) {
        try {
            Write-ColorText "Opening log viewer in a new terminal..." -ForegroundColor "White"
            Start-Process "powershell.exe" -ArgumentList "-NoExit -Command `"cd '$PWD'; Write-Host 'ArtBastard Log Viewer' -ForegroundColor Yellow; Get-Content -Path 'logs\app.log' -Tail 100 -Wait`""
            Write-ColorText "Log viewer started in a new terminal." -ForegroundColor "Green"
        } catch {
            Write-ColorText "Error opening log viewer: $($_.Exception.Message)" -ForegroundColor "Red"
        }
    } else {
        Write-ColorText "Log file not found at: $logPath" -ForegroundColor "Red"
    }
    
    Pause
}

# Function to start MIDI monitor
function Start-MidiMonitor {
    Show-Header
    
    Write-ColorText "MIDI MONITOR" -ForegroundColor "Cyan"
    Write-Host ""
    
    try {
        # Create a batch file to launch MIDI Monitor
        $midiBatchPath = Join-Path $PWD "temp-midi-monitor.bat"
        $midiBatchContent = @"
@echo off
cd /d "%~dp0"
echo ========================================================================
echo   ArtBastard DMX512FTW: MIDI/OSC Monitor
echo   "See your MIDI devices and signals in real-time"
echo ========================================================================
echo.
echo Launching MIDI/OSC Monitor...
echo.

:: Run the built version if it exists, otherwise use ts-node
if exist "build\midi-console.js" (
    echo Using compiled version...
    node build\midi-console.js
) else (
    echo Compiled version not found, using direct execution...
    npx ts-node src\midi-console.ts
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error launching MIDI monitor. Error code: %ERRORLEVEL%
    echo.
    pause
)
"@
        Set-Content -Path $midiBatchPath -Value $midiBatchContent
        
        # Launch the MIDI monitor
        Write-ColorText "Starting MIDI Monitor..." -ForegroundColor "White"
        Start-Process "cmd.exe" -ArgumentList "/k `"$midiBatchPath`"" -WindowStyle Normal
        
        Write-ColorText "MIDI Monitor started in a new window." -ForegroundColor "Green"
        
        # Clean up batch file in the background
        Start-Sleep -Seconds 2
        if (Test-Path $midiBatchPath) {
            Remove-Item $midiBatchPath -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-ColorText "Error launching MIDI Monitor: $($_.Exception.Message)" -ForegroundColor "Red"
    }
    
    Pause
}

# Function to run the complete setup process
function Complete-Setup {
    Show-Header
    
    Write-ColorText "COMPLETE SETUP" -ForegroundColor "Cyan"
    Write-Host ""
    Write-ColorText "Initiating Complete Installation Ritual..." -ForegroundColor "Magenta"
    Write-Host ""
    
    $success = $true
    
    Write-ColorText "Step 1: Checking environment..." -ForegroundColor "Yellow"
    $envOk = Check-Environment
    if (-not $envOk) {
        $success = $false
        return
    }
    
    Write-ColorText "Step 2: Installing dependencies..." -ForegroundColor "Yellow"
    $depsOk = Install-Dependencies
    if (-not $depsOk) {
        $success = $false
        return
    }
    
    Write-ColorText "Step 3: Building application..." -ForegroundColor "Yellow"
    $buildOk = Build-Application
    if (-not $buildOk) {
        $success = $false
        return
    }
    
    if ($success) {
        Show-Header
        Write-ColorText "SETUP COMPLETE!" -ForegroundColor "Green"
        Write-Host ""
        Write-ColorText "** Installation complete! The digital canvas awaits your artistic guidance. **" -ForegroundColor "Cyan"
        Write-Host ""
        Write-ColorText "You can now start the server using option 5 from the main menu." -ForegroundColor "White"
    }
    
    Pause
}

# Function to open web interface
function Open-WebInterface {
    Show-Header
    
    Write-ColorText "OPENING WEB INTERFACE" -ForegroundColor "Cyan"
    Write-Host ""
    
    # Check if server is running
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $portOpen = $tcpClient.ConnectAsync("localhost", 3001).Wait(1000)
        $tcpClient.Close()
        
        if (-not $portOpen) {
            Write-ColorText "The server does not appear to be running. Start the server first." -ForegroundColor "Yellow"
            Write-Host ""
            $startServer = Read-Host "Would you like to start the server now? (y/n)"
            
            if ($startServer -eq "y") {
                Start-LuminousCanvas
            } else {
                Pause
                return
            }
        }
    } catch {
        # Ignore connection errors and try to open the browser anyway
    }
    
    try {
        Write-ColorText "Opening the web interface in your default browser..." -ForegroundColor "White"
        Start-Process "http://localhost:3001"
        Write-ColorText "Browser opened successfully." -ForegroundColor "Green"
    } catch {
        Write-ColorText "Error opening browser: $($_.Exception.Message)" -ForegroundColor "Red"
    }
    
    Pause
}

# Main program loop
$running = $true

while ($running) {
    $choice = Show-MainMenu
    
    switch ($choice) {
        "0" { $running = $false }
        "1" { Check-Environment }
        "2" { Install-Dependencies }
        "3" { Build-Application }
        "4" { Complete-Setup }
        "5" { Start-LuminousCanvas }
        "6" { Open-WebInterface }
        "7" { View-Chronicles }
        "8" { Check-TypeScript }
        "9" { Start-MidiMonitor }
        default { 
            Show-Header
            Write-ColorText "Invalid choice. Please enter a number between 0 and 9." -ForegroundColor "Red"
            Pause
        }
    }
}

# Final cleanup
Clear-Host
Write-ColorText "================================================================" -ForegroundColor "Magenta"
Write-ColorText "    Thank you for using ArtBastard DMX512FTW Console" -ForegroundColor "Yellow"
Write-ColorText "    May your illuminations be artful and your DMX data pristine" -ForegroundColor "Cyan"
Write-ColorText "================================================================" -ForegroundColor "Magenta"
Write-Host ""