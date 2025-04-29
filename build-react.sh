#!/bin/bash

# ArtBastard DMX512FTW React Edition Build Script

set -e  # Exit on any error

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
                                                     
React Edition Build Script
"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting ArtBastard DMX512FTW React Edition build...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js first"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    echo "Please install npm first"
    exit 1
fi

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo -e "${YELLOW}Creating data directory...${NC}"
    mkdir -p data
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    echo -e "${YELLOW}Creating logs directory...${NC}"
    mkdir -p logs
fi

# Check if the React app exists
if [ ! -d "react-app" ]; then
    echo -e "${RED}Error: react-app directory not found${NC}"
    echo "Please make sure you have the React app in the react-app directory"
    exit 1
fi

# Step 1: Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
npm install

# Step 2: Install React dependencies
echo -e "${YELLOW}Installing React dependencies...${NC}"
cd react-app
npm install
cd ..

# Step 3: Build React app
echo -e "${YELLOW}Building React app...${NC}"
cd react-app
npm run build
cd ..

# Step 4: Build backend
echo -e "${YELLOW}Building backend...${NC}"
npm run build

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${BLUE}To start the application, run:${NC} npm start"
echo -e "${BLUE}The application will be available at:${NC} http://localhost:3001"
echo ""
echo -e "${YELLOW}Note: The old interface is still available at:${NC} http://localhost:3001/public"