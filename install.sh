#!/bin/bash

# ArtBastard DMX512FTW: The Luminary Palette - Installation Script for Linux/macOS
# This script prepares your canvas for the art of light

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
echo "║ ArtBastard DMX512FTW: The Luminary Palette                    ║"
echo "║                                                               ║"
echo "║  'Where technicians become artists,                           ║"
echo "║   and artists become luminescent technicians.'                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
echo -e "${CYAN}Examining the required artistic implements...${RESET}"

if ! command_exists node; then
    echo -e "${YELLOW}Node.js is not present in your creative environment.${RESET}"
    echo -e "${YELLOW}Attempting to install Node.js...${RESET}"
    
    # Try to determine OS
    if command_exists apt-get; then
        echo -e "${CYAN}Detected Debian/Ubuntu. Installing Node.js...${RESET}"
        sudo apt-get update
        sudo apt-get install -y nodejs npm
    elif command_exists yum; then
        echo -e "${CYAN}Detected RHEL/CentOS/Fedora. Installing Node.js...${RESET}"
        sudo yum install -y nodejs npm
    elif command_exists brew; then
        echo -e "${CYAN}Detected macOS with Homebrew. Installing Node.js...${RESET}"
        brew install node
    else
        echo -e "${RED}Could not determine package manager. Please install Node.js manually from https://nodejs.org/ (Version 14 or later recommended).${RESET}"
        echo -e "${RED}After installation, please restart this script.${RESET}"
        exit 1
    fi
    
    # Check if installation was successful
    if ! command_exists node; then
        echo -e "${RED}Node.js installation failed. Please install manually and restart the script.${RESET}"
        exit 1
    fi
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js palette detected: $NODE_VERSION${RESET}"

if ! command_exists npm; then
    echo -e "${YELLOW}npm is not present in your creative environment.${RESET}"
    echo -e "${YELLOW}It should be included with Node.js. Please check your installation.${RESET}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}npm curator detected: $NPM_VERSION${RESET}"

# Create data directory if it doesn't exist
echo -e "${CYAN}Establishing the data sanctuary...${RESET}"
if [ ! -d "data" ]; then
    mkdir -p data
    echo -e "${GREEN}Data sanctuary created.${RESET}"
else
    echo -e "${GREEN}Data sanctuary already exists.${RESET}"
fi

# Create logs directory if it doesn't exist
echo -e "${CYAN}Preparing the chronicles repository...${RESET}"
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo -e "${GREEN}Log repository created.${RESET}"
else
    echo -e "${GREEN}Log repository already exists.${RESET}"
fi

# Install build essentials if needed (for Linux)
if command_exists apt-get; then
    echo -e "${CYAN}Installing artistic tools for Linux...${RESET}"
    sudo apt-get install -y build-essential
    
    # Install additional dependencies for DMX on Linux
    echo -e "${CYAN}Installing additional dependencies for DMX...${RESET}"
    sudo apt-get install -y libudev-dev
fi

# Install dependencies
echo -e "${CYAN}Summoning the necessary components...${RESET}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}An error occurred while gathering the components. Please check the output above.${RESET}"
    exit 1
fi

echo -e "${GREEN}Components assembled successfully.${RESET}"

# Build the application
echo -e "${CYAN}Manifesting the luminous interface...${RESET}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}An error occurred during the manifestation process. Please check the output above.${RESET}"
    exit 1
fi

echo -e "${GREEN}Luminous interface manifested successfully.${RESET}"

# Start the application
echo -e "${CYAN}Breathing life into your creation...${RESET}"
echo -e "${MAGENTA}The ArtBastard DMX512FTW is now ready to assist your artistic expression.${RESET}"
echo -e "${MAGENTA}Starting the application...${RESET}"

npm start &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║ Installation Complete!                                        ║"
echo "║                                                               ║"
echo "║ Your illuminated canvas awaits at: http://localhost:3001      ║"
echo "║                                                               ║"
echo "║ Press Ctrl+C to stop the application when you're done.        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

# Keep script running until user presses Ctrl+C
trap "kill $SERVER_PID; echo -e '${CYAN}The luminous canvas fades to black...${RESET}'; exit" INT
wait $SERVER_PID