#!/bin/bash

# Text styling
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
MAGENTA="\033[0;35m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║ ArtBastard DMX512FTW: Cache Reset Utility                     ║"
echo "║                                                               ║"
echo "║  'Purging the browser's memory to reveal true artistic intent'║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# Stop any running server
echo -e "${CYAN}Stopping any running server processes...${RESET}"
pkill -f "node build/server.js" || true

# Clean build directory
echo -e "${CYAN}Purging build artifacts...${RESET}"
rm -rf build/*

# Clean any browser cache files that might be in the project
echo -e "${CYAN}Removing browser cache files...${RESET}"
find . -name "*.cache" -type f -delete

# Rebuild the application
echo -e "${CYAN}Rebuilding the application with a clean slate...${RESET}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}An error occurred during rebuilding. Please check the output above.${RESET}"
    exit 1
fi

echo -e "${GREEN}Application rebuilt successfully.${RESET}"

# Create version marker for cache busting
echo -e "${CYAN}Creating version marker for cache busting...${RESET}"
echo "{\"version\": \"$(date +%s)\"}" > build/public/version.json

# Restart the server
echo -e "${CYAN}Restarting the application...${RESET}"
npm start &

echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║ Cache Reset Complete!                                         ║"
echo "║                                                               ║"
echo "║ Please take these additional steps in your browser:           ║"
echo "║ 1. Press Ctrl+F5 to force refresh                             ║"
echo "║ 2. Or clear your browser cache manually                       ║"
echo "║ 3. Or try opening in a private/incognito window               ║"
echo "║                                                               ║"
echo "║ Your illuminated canvas awaits at: http://localhost:3001      ║"
echo "║                                                               ║"
echo "║ Press Ctrl+C to stop the application when you're done.        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# Keep script running until user presses Ctrl+C
trap "pkill -f 'node build/server.js'; echo -e '${CYAN}The luminous canvas fades to black...${RESET}'; exit" INT
wait