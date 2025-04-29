#!/bin/bash

# ArtBastard DMX512FTW Universal Master Console
# This script provides access to both original and React editions

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
                                                     
Universal Master Console (Linux/WSL)
"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Main Menu function
main_menu() {
    while true; do
        echo -e "\n${BLUE}==== Main Menu ====${NC}\n"
        echo -e "1. ${YELLOW}Launch Original Interface${NC} (Classic version)"
        echo -e "2. ${YELLOW}Launch React Edition${NC} (Modern WebGL/Three.js version)"
        echo -e "3. ${YELLOW}Install/Build Only${NC} (Set up without launching)"
        echo -e "4. ${YELLOW}MIDI Monitor${NC} (Check MIDI devices)"
        echo -e "5. ${YELLOW}View Log Files${NC} (Troubleshooting)"
        echo -e "6. ${YELLOW}Exit${NC}"
        echo ""
        
        read -p "Select an option (1-6): " option
        
        case $option in
            1)
                echo -e "\n${BLUE}==== Launching Original Interface ====${NC}\n"
                bash setup.sh
                ;;
            2)
                echo -e "\n${BLUE}==== Launching React Edition ====${NC}\n"
                bash launch-react-app.sh
                ;;
            3)
                install_build_menu
                ;;
            4)
                echo -e "\n${BLUE}==== MIDI Monitor ====${NC}\n"
                ts-node src/midi-console.ts
                ;;
            5)
                view_logs
                ;;
            6)
                echo -e "\n${BLUE}Exiting...${NC}"
                exit 0
                ;;
            *)
                echo -e "\n${RED}Invalid option. Please try again.${NC}"
                ;;
        esac
    done
}

# Install and Build Menu
install_build_menu() {
    echo -e "\n${BLUE}==== Install and Build ====${NC}\n"
    echo -e "1. ${YELLOW}Install all dependencies and build everything${NC} (Complete setup)"
    echo -e "2. ${YELLOW}Build backend only${NC} (TypeScript compilation)"
    echo -e "3. ${YELLOW}Build React frontend only${NC} (For WebGL version)"
    echo -e "4. ${YELLOW}Back to main menu${NC}"
    echo ""
    
    read -p "Select an option (1-4): " buildopt
    
    case $buildopt in
        1)
            echo -e "\n${YELLOW}Installing dependencies and building...${NC}"
            npm install
            (cd react-app && npm install && npm run build)
            npm run build
            echo -e "\n${GREEN}All dependencies installed and built successfully!${NC}"
            read -p "Press Enter to continue..."
            ;;
        2)
            echo -e "\n${YELLOW}Building backend only...${NC}"
            npm run build
            echo -e "\n${GREEN}Backend built successfully!${NC}"
            read -p "Press Enter to continue..."
            ;;
        3)
            echo -e "\n${YELLOW}Building React frontend only...${NC}"
            (cd react-app && npm run build)
            echo -e "\n${GREEN}React frontend built successfully!${NC}"
            read -p "Press Enter to continue..."
            ;;
        4)
            return
            ;;
        *)
            echo -e "\n${RED}Invalid option. Please try again.${NC}"
            install_build_menu
            ;;
    esac
}

# View Logs
view_logs() {
    echo -e "\n${BLUE}==== Log Files ====${NC}\n"
    
    if [ ! -d "logs" ]; then
        echo -e "${RED}No log files found.${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    if [ ! -f "logs/app.log" ]; then
        echo -e "${RED}No application log found.${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    echo -e "${YELLOW}Most recent log entries:${NC}\n"
    tail -n 20 logs/app.log
    echo ""
    
    read -p "View full log? (Y/N): " viewfull
    if [[ $viewfull == "Y" || $viewfull == "y" ]]; then
        if command -v less &> /dev/null; then
            less logs/app.log
        else
            cat logs/app.log | more
        fi
    fi
}

# Start the main menu
echo -e "${GREEN}Welcome to the ArtBastard DMX512FTW Master Console!${NC}"
echo -e "This console provides access to both the original and React editions."
main_menu