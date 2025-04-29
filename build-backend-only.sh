#!/bin/bash

# ArtBastard DMX512FTW Backend-Only Build Script
# This script builds only the backend, skipping the React frontend

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
echo "║ ArtBastard DMX512FTW: Backend-Only Build                      ║"
echo "║                                                               ║"
echo "║  'Essential build for WSL environments'                       ║"
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

# Build the application
echo -e "${CYAN}Building the backend only...${RESET}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please check the errors above.${RESET}"
    exit 1
fi

echo -e "${GREEN}Backend build completed successfully!${RESET}"
echo -e "${YELLOW}Note: The React frontend was NOT built.${RESET}"
echo -e "${YELLOW}The original interface will be served at http://localhost:3001/public${RESET}"
echo ""
echo -e "${CYAN}To start the application, run:${RESET} npm start"