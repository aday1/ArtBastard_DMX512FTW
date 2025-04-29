#!/bin/bash

# ArtBastard DMX512FTW React Edition Launcher for Linux/WSL
# This script sets up and launches the React application

# ASCII Art Logo
echo "
    _         _   ____            _                _ 
   / \   _ __| |_| __ )  __ _ ___| |_ __ _ _ __ __| |
  / _ \ | '__| __|  _ \ / _\` / __| __/ _\` | '__/ _\` |
 / ___ \| |  | |_| |_) | (_| \__ \ || (_| | | | (_| |
/_/   \_\_|   \__|____/ \__,_|___/\__\__,_|_|  \__,_|
                                                    
 ____  __  __ __   __________  ___ _________ _    _
|  _ \|  \/  |\ \ / /___ / _ \/ _ \___ /___| | _| |
| | | | |\/| | \ V /  |_ \ | | | | ||_ \___| |/ / |
| |_| | |  | |  | |  ___) | |_| |_| |__) |  |   <|_|
|____/|_|  |_|  |_| |____/ \___/\___/____/   |_|\_(_)
                                                     
React Edition Launcher (Linux/WSL)
"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

# Check if Node.js is installed
print_section "Checking prerequisites"
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo -e "Please install Node.js first with:"
    echo -e "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo -e "  sudo apt-get install -y nodejs"
    exit 1
fi

# Check npm
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    echo -e "Please install npm"
    exit 1
fi

echo -e "${GREEN}✓ Node.js and npm are installed${NC}"
echo -e "  Node.js version: $(node -v)"
echo -e "  npm version: $(npm -v)"

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo -e "\n${YELLOW}Creating data directory...${NC}"
    mkdir -p data
    echo -e "${GREEN}✓ Data directory created${NC}"
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    echo -e "\n${YELLOW}Creating logs directory...${NC}"
    mkdir -p logs
    echo -e "${GREEN}✓ Logs directory created${NC}"
fi

# Install backend dependencies if not installed
print_section "Setting up backend"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Install frontend dependencies if not installed
print_section "Setting up React frontend"
cd react-app || exit 1

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo -e "${YELLOW}Installing React dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ React dependencies installed${NC}"
else
    echo -e "${GREEN}✓ React dependencies already installed${NC}"
fi

# Build the React app if it hasn't been built yet
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo -e "\n${YELLOW}Building React application...${NC}"
    npm run build
    echo -e "${GREEN}✓ React application built${NC}"
else
    echo -e "${GREEN}✓ React application already built${NC}"
fi

cd ..

# Build the backend if it hasn't been built yet
if [ ! -d "build" ]; then
    print_section "Building backend"
    echo -e "${YELLOW}Building backend...${NC}"
    npm run build
    echo -e "${GREEN}✓ Backend built${NC}"
else
    echo -e "${GREEN}✓ Backend already built${NC}"
fi

# Launch options
print_section "Launch Options"
echo -e "1. ${YELLOW}Start Production Server${NC} (built version with React frontend)"
echo -e "2. ${YELLOW}Start Development Server${NC} (with auto-reload for backend changes)"
echo -e "3. ${YELLOW}Start React Development Server${NC} (for frontend development)"
echo -e "4. ${YELLOW}Exit${NC}"

read -p "Select an option (1-4): " option

case $option in
    1)
        print_section "Starting Production Server"
        echo -e "Access the application at ${BLUE}http://localhost:3001${NC}"
        echo -e "Press ${YELLOW}Ctrl+C${NC} to stop the server"
        echo -e "\n${GREEN}Starting server...${NC}\n"
        npm start
        ;;
    2)
        print_section "Starting Development Server"
        echo -e "This mode will auto-reload when backend files change"
        echo -e "Access the application at ${BLUE}http://localhost:3001${NC}"
        echo -e "Press ${YELLOW}Ctrl+C${NC} to stop the server"
        echo -e "\n${GREEN}Starting development server...${NC}\n"
        npm run start:dev
        ;;
    3)
        print_section "Starting React Development Server"
        echo -e "This mode is for frontend development only"
        echo -e "Backend services will not be available in this mode"
        echo -e "Access the React dev server at ${BLUE}http://localhost:3000${NC}"
        echo -e "Press ${YELLOW}Ctrl+C${NC} to stop the server"
        echo -e "\n${GREEN}Starting React development server...${NC}\n"
        cd react-app
        npm start
        ;;
    4)
        echo -e "\n${BLUE}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "\n${RED}Invalid option. Exiting...${NC}"
        exit 1
        ;;
esac