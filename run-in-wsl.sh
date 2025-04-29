#!/bin/bash

# ArtBastard DMX512FTW - Run in WSL Environment Script
# This script is optimized for running in WSL where MIDI hardware access is limited

# Text styling
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
MAGENTA="\033[0;35m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║ ArtBastard DMX512FTW: WSL Edition                             ║"
echo "║                                                               ║"
echo "║  'Making light control work anywhere'                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# Check if the data directory exists
if [ ! -d "data" ]; then
    echo -e "${CYAN}Creating data directory...${RESET}"
    mkdir -p data
fi

# Check if the logs directory exists
if [ ! -d "logs" ]; then
    echo -e "${CYAN}Creating logs directory...${RESET}"
    mkdir -p logs
fi

# Build the application (backend only in WSL)
echo -e "${CYAN}Building the backend only (skipping React frontend)...${RESET}"
npm run build

# Note about React frontend
echo -e "${YELLOW}Skipping React frontend build in WSL environment${RESET}"
echo -e "${YELLOW}The original interface will be available at /public${RESET}"

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please check the errors above.${RESET}"
    exit 1
fi

# Start the application with a special note about WSL environment
echo -e "${CYAN}Starting ArtBastard DMX512FTW in WSL mode${RESET}"
echo -e "${YELLOW}NOTE: Hardware MIDI devices are not accessible in WSL.${RESET}"
echo -e "${YELLOW}You can still use browser-based MIDI via Web MIDI API.${RESET}"
echo -e "${YELLOW}For hardware MIDI devices, run in native Windows.${RESET}"
echo ""

npm start &
APP_PID=$!

# Sleep to give the app time to start
sleep 3

echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║ ArtBastard DMX512FTW is now running!                          ║"
echo "║                                                               ║"
echo "║ Access the interface at: http://localhost:3001                ║"
echo "║                                                               ║"
echo "║ NOTE: Browser MIDI is enabled, but hardware MIDI is disabled  ║"
echo "║       when running in WSL.                                    ║"
echo "║                                                               ║"
echo "║ Press Ctrl+C to stop the application.                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# Trap Ctrl+C and clean up
trap "echo -e '${CYAN}Shutting down ArtBastard DMX512FTW...${RESET}'; kill $APP_PID; exit" INT

# Wait for the application to exit
wait $APP_PID