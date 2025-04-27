############################################################
# ArtBastard DMX512FTW: MIDI/OSC Monitor PowerShell Script
############################################################

Write-Host "========================================================================"
Write-Host "  ArtBastard DMX512FTW: MIDI/OSC Monitor" -ForegroundColor Cyan
Write-Host "  `"The silent conversational partner for your devices`"" -ForegroundColor Cyan
Write-Host "========================================================================"
Write-Host ""
Write-Host "Launching MIDI/OSC Monitor..." -ForegroundColor Yellow
Write-Host ""

# Go to the directory where this script is located
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptPath

try {
    # Try running with npm
    & npm run midi-console
}
catch {
    Write-Host "Error running MIDI monitor: $_" -ForegroundColor Red
    
    # Fallback to using node directly if npm command fails
    Write-Host "Trying alternate launch method..." -ForegroundColor Yellow
    
    try {
        if (Test-Path "build/midi-console.js") {
            & node build/midi-console.js
        } 
        elseif (Test-Path "src/midi-console.ts") {
            & npx ts-node src/midi-console.ts
        }
        else {
            Write-Host "Could not find midi-console files" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Fallback launch also failed: $_" -ForegroundColor Red
    }
}

# Keep window open if there was an error
if ($LASTEXITCODE -ne 0) {
    Write-Host "Press any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}