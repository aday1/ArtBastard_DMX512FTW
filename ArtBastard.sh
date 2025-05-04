# Fallback function when gum is not available
fallback_output() {
    local message="$1"
    local type="$2"
    case "$type" in
        "error") echo "❌ $message" ;;
        "warning") echo "⚠️ $message" ;;
        "success") echo "✅ $message" ;;
        *) echo "🎨 $message" ;;
    esac
}

# Function to handle styled output
styled_output() {
    local message="$1"
    local type="$2"
    if command -v gum >/dev/null 2>&1; then
        case "$type" in
            "error") gum style --foreground 196 "$message" ;;
            "warning") gum style --foreground 226 "$message" ;;
            "success") gum style --foreground 39 "$message" ;;
            *) gum style --foreground 212 "$message" ;;
        esac
    else
        fallback_output "$message" "$type"
    fi
}

# Replace pierre_speaks function
pierre_speaks() {
    styled_output "🎭 Pierre is here to assist with your artistic endeavors!" "info"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check and install dependencies
check_install_dependencies() {
    styled_output "🔍 Checking for required dependencies..." "info"
    
    # Check for Node.js
    if ! command_exists node; then
        styled_output "Node.js is not installed!" "error"
        return 1
    fi
    
    # Check for npm
    if ! command_exists npm; then
        styled_output "npm is not installed!" "error"
        return 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        styled_output "Installing dependencies..." "warning"
        npm install || {
            styled_output "Failed to install dependencies!" "error"
            return 1
        }
    fi
    
    styled_output "All dependencies are installed!" "success"
    return 0
}

# Check server installation
check_server_installation() {
    styled_output "🔍 Checking server installation..." "info"
    
    # Check for required directories
    if [ ! -d "data" ]; then
        mkdir -p data
    fi
    
    if [ ! -d "logs" ]; then
        mkdir -p logs
    fi
    
    # Check if the server is properly installed
    if [ ! -d "node_modules" ] || [ ! -f "package.json" ]; then
        styled_output "Server installation appears incomplete!" "error"
        return 1
    fi
    
    styled_output "Server installation looks good!" "success"
    return 0
}

# Setup server
setup_server() {
    styled_output "🚀 Setting up the server..." "info"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        styled_output "📦 Installing dependencies..." "info"
        npm install || {
            styled_output "Failed to install dependencies!" "error"
            return 1
        }
    fi
    
    # Create required directories
    mkdir -p data logs
    
    # Build the application
    styled_output "🏗️ Building the application..." "info"
    npm run build || {
        styled_output "Failed to build the application!" "error"
        return 1
    }
    
    styled_output "Server setup complete! You may now launch the server!" "success"
    return 0
}

# Check for running server
styled_output "📊 Checking for signs of artistic life (running server):" "info"
if [ -f "server/.server.pid" ]; then
  SERVER_PID=$(cat server/.server.pid)
  if ps -p $SERVER_PID > /dev/null; then
    styled_output "Server is running with PID: $SERVER_PID - ze art is ALIVE!" "success"
  else
    styled_output "Server PID file exists, but no process is running! Ze phantom of ze server!" "warning"
  fi
else
  styled_output "No server PID file found. Ze server appears to be dormant!" "warning"
fi

# Check MIDI devices
styled_output "📊 Searching for MIDI devices - ze instruments of our expression:" "info"
MIDI_DEVICES=$(amidi -l 2>/dev/null || echo "No MIDI devices found or amidi not installed")
if [ "$MIDI_DEVICES" == "No MIDI devices found or amidi not installed" ]; then
  styled_output "No MIDI devices detected! Our orchestra has no instruments!" "warning"
else
  styled_output "MIDI devices detected:" "success"
  echo "$MIDI_DEVICES" | styled_output "$MIDI_DEVICES" "info"
fi

# Summary and recommendations
styled_output "📝 Pierre's Artistic Assessment:" "info"

# Count issues
CRITICAL_ISSUES=0
WARNINGS=0

if ! command -v node &> /dev/null || ! command -v npm &> /dev/null || [ ! -f "server/server.js" ]; then
  CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if ! command -v amidi &> /dev/null || [ ! -d "server/node_modules" ] || [ ! -f "server/config/default.json" ]; then
  WARNINGS=$((WARNINGS + 1))
fi

if [ $CRITICAL_ISSUES -gt 0 ]; then
  styled_output "There are $CRITICAL_ISSUES critical issues that must be resolved for ArtBastard to function!" "error"
  styled_output "Pierre recommends running these steps in order:" "info"
  styled_output "1. 🔄 Check/Install Dependencies" "info"
  styled_output "2. 🎨 Update ArtBastard" "info"
  styled_output "3. 🚀 Setup Server" "info"
elif [ $WARNINGS -gt 0 ]; then
  styled_output "There are $WARNINGS minor issues that may affect ze artistic experience." "warning"
  styled_output "Pierre suggests running 'Setup Server' to ensure all components are properly installed." "info"
else
  styled_output "Magnifique! Your ArtBastard installation appears to be in perfect artistic harmony!" "success"
  styled_output "You may proceed to launch ze server and create digital masterpieces!" "info"
fi

pierre_speaks

# Main menu without gum
show_menu() {
    echo "Please select an option:"
    echo "1) 🎨 Update ArtBastard"
    echo "2) 🚀 Setup Server"
    echo "3) 💻 Create 'artbastard' Command"
    echo "4) 🧹 Clean Up (Fresh Start)"
    echo "5) 🎵 Launch Server & Monitor MIDI"
    echo "6) 🎹 Monitor MIDI (Local Only)"
    echo "7) 📝 Monitor Server Logs"
    echo "8) 🔄 Check/Install Dependencies"
    echo "9) 🔍 Diagnostics & Troubleshooting"
    echo "10) 🛠️ Build Backend Only"
    echo "11) 🌐 Build React Frontend"
    echo "12) 🔧 Fix Cache"
    echo "13) 🎮 Launch React App"
    echo "14) 🖥️ Run in WSL Mode"
    echo "0) ❌ Exit"
    read -p "Enter your choice (0-14): " choice
    echo
    case "$choice" in
        [0-9]|1[0-4]) return "$choice" ;;
        *) return 255 ;;
    esac
}

# Function to create system-wide command
create_system_command() {
    styled_output "🔧 Creating system-wide 'artbastard' command..." "info"
    
    # Get the current script's absolute path
    SCRIPT_PATH=$(realpath "$0")
    
    # Create the command file
    COMMAND_FILE="/usr/local/bin/artbastard"
    
    # Check if we have sudo access
    if command -v sudo >/dev/null 2>&1; then
        if sudo -n true 2>/dev/null; then
            # We have passwordless sudo access
            sudo bash -c "echo '#!/bin/bash' > $COMMAND_FILE"
            sudo bash -c "echo 'exec \"$SCRIPT_PATH\" \"\$@\"' >> $COMMAND_FILE"
            sudo chmod +x "$COMMAND_FILE"
            styled_output "✅ Successfully created system-wide 'artbastard' command!" "success"
        else
            # We need to ask for sudo password
            styled_output "⚠️ This operation requires sudo access to create the command." "warning"
            if sudo bash -c "echo '#!/bin/bash' > $COMMAND_FILE" && \
               sudo bash -c "echo 'exec \"$SCRIPT_PATH\" \"\$@\"' >> $COMMAND_FILE" && \
               sudo chmod +x "$COMMAND_FILE"; then
                styled_output "✅ Successfully created system-wide 'artbastard' command!" "success"
            else
                styled_output "❌ Failed to create system-wide command. Make sure you have sudo access." "error"
                return 1
            fi
        fi
    else
        styled_output "❌ Cannot create system-wide command: sudo is not available" "error"
        return 1
    fi
    
    return 0
}

# Update ArtBastard function
update_artbastard() {
    styled_output "🔄 Checking for updates..." "info"
    
    # Check if git is installed
    if ! command_exists git; then
        styled_output "Git is not installed! Cannot update ArtBastard." "error"
        return 1
    fi
    
    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        styled_output "This is not a git repository! Cannot update ArtBastard." "error"
        return 1
    fi
    
    # Fetch updates
    styled_output "Fetching updates..." "info"
    if ! git fetch origin; then
        styled_output "Failed to fetch updates!" "error"
        return 1
    fi
    
    # Check if we're behind
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u})
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        styled_output "ArtBastard is already up to date!" "success"
        return 0
    fi
    
    # Backup current state
    styled_output "Creating backup of current state..." "info"
    BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r * "$BACKUP_DIR/" 2>/dev/null
    
    # Pull updates
    styled_output "Pulling updates..." "info"
    if ! git pull origin; then
        styled_output "Failed to pull updates! Restoring from backup..." "error"
        cp -r "$BACKUP_DIR"/* .
        rm -rf "$BACKUP_DIR"
        return 1
    fi
    
    # Clean up backup
    rm -rf "$BACKUP_DIR"
    
    # Run setup after update
    styled_output "Running setup after update..." "info"
    setup_server
    
    styled_output "ArtBastard has been updated successfully!" "success"
    return 0
}

# Clean up function
clean_up() {
    styled_output "🧹 Preparing for clean up..." "info"
    
    read -p "⚠️ This will remove all node_modules, build files, and logs. Continue? (y/n) " answer
    if [ "$answer" != "y" ]; then
        styled_output "Clean up cancelled." "warning"
        return 0
    fi
    
    # Stop any running servers
    if [ -f "server/.server.pid" ]; then
        SERVER_PID=$(cat server/.server.pid)
        if ps -p $SERVER_PID >/dev/null 2>&1; then
            kill $SERVER_PID
            styled_output "Stopped running server." "info"
        fi
        rm server/.server.pid
    fi
    
    # Remove build artifacts and dependencies
    rm -rf node_modules build dist
    rm -rf server/node_modules server/build server/dist
    rm -rf react-app/node_modules react-app/build react-app/dist
    
    # Clear logs
    rm -rf logs/*
    mkdir -p logs
    
    styled_output "Clean up complete! Run setup to reinstall dependencies." "success"
    return 0
}

# Launch server with monitoring
launch_server_with_monitoring() {
    styled_output "🚀 Launching server with MIDI monitoring..." "info"
    
    # Check dependencies first
    check_install_dependencies || return 1
    
    # Build if needed
    if [ ! -d "build" ]; then
        styled_output "Building application..." "info"
        npm run build || return 1
    fi
    
    # Start server in background
    styled_output "Starting server..." "info"
    node build/server.js &
    SERVER_PID=$!
    echo $SERVER_PID > server/.server.pid
    
    # Start MIDI monitoring
    styled_output "Starting MIDI monitoring..." "info"
    node build/midi-console.js
}

# Monitor MIDI (local only)
monitor_midi_local_only() {
    styled_output "🎹 Starting local MIDI monitoring..." "info"
    
    # Check if midi-console.js exists
    if [ ! -f "build/midi-console.js" ]; then
        styled_output "Building MIDI monitor..." "info"
        npm run build || return 1
    fi
    
    # Run MIDI monitor
    node build/midi-console.js
}

# Monitor server logs
monitor_server_logs() {
    styled_output "📝 Monitoring server logs..." "info"
    
    if [ ! -d "logs" ]; then
        mkdir -p logs
    fi
    
    # Use tail to follow the log file
    tail -f logs/app.log
}

# Run diagnostics
run_diagnostics() {
    styled_output "🔍 Running diagnostics..." "info"
    
    # Check Node.js and npm versions
    if command_exists node; then
        NODE_VERSION=$(node --version)
        styled_output "Node.js version: $NODE_VERSION" "info"
    else
        styled_output "Node.js is not installed!" "error"
    fi
    
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        styled_output "npm version: $NPM_VERSION" "info"
    else
        styled_output "npm is not installed!" "error"
    fi
    
    # Check MIDI system
    styled_output "Checking MIDI system..." "info"
    if command_exists amidi; then
        MIDI_DEVICES=$(amidi -l 2>/dev/null)
        if [ -n "$MIDI_DEVICES" ]; then
            styled_output "MIDI devices found:" "success"
            echo "$MIDI_DEVICES"
        else
            styled_output "No MIDI devices detected" "warning"
        fi
    else
        styled_output "MIDI tools not installed (amidi)" "warning"
    fi
    
    # Check disk space
    styled_output "Checking disk space..." "info"
    df -h . | grep -v "Filesystem"
    
    # Check installation
    check_server_installation
    
    styled_output "Diagnostics complete!" "success"
    return 0
}

# Factory reset function
factory_reset() {
    styled_output "⚠️ WARNING: This will completely reset ArtBastard to factory settings!" "warning"
    read -p "Are you absolutely sure? This cannot be undone! (y/N) " answer
    
    if [ "$answer" != "y" ]; then
        styled_output "Factory reset cancelled." "info"
        return 0
    fi
    
    # Stop any running processes
    if [ -f "server/.server.pid" ]; then
        kill $(cat server/.server.pid) 2>/dev/null
        rm server/.server.pid
    fi
    
    # Remove all generated files
    rm -rf node_modules build dist logs/* data/*
    rm -f .installation_checked
    
    styled_output "Factory reset complete. Please run setup to reinstall." "success"
    return 0
}

# Reinstall function
reinstall() {
    styled_output "🔄 Reinstalling ArtBastard..." "info"
    
    # Clean up first
    clean_up
    
    # Run setup
    setup_server
    
    styled_output "Reinstallation complete!" "success"
    return 0
}

# Build backend only function
build_backend_only() {
    styled_output "🛠️ Building backend only..." "info"
    
    # Create required directories
    mkdir -p data logs
    
    # Build backend
    styled_output "Building the backend only..." "info"
    npm run build || {
        styled_output "Build failed!" "error"
        return 1
    }
    
    styled_output "Backend build completed successfully!" "success"
    styled_output "Note: The React frontend was NOT built. Original interface will be served at http://localhost:3001/public" "warning"
    return 0
}

# Build React frontend function
build_react_frontend() {
    styled_output "🌐 Building React frontend..." "info"
    
    if [ ! -d "react-app" ]; then
        styled_output "React app directory not found!" "error"
        return 1
    fi
    
    cd react-app || return 1
    npm install || {
        styled_output "Failed to install React dependencies!" "error"
        cd ..
        return 1
    }
    
    npm run build || {
        styled_output "Failed to build React frontend!" "error"
        cd ..
        return 1
    }
    
    cd ..
    styled_output "React frontend built successfully!" "success"
    return 0
}

# Fix cache function
fix_cache() {
    styled_output "🔧 Fixing npm cache..." "info"
    
    npm cache clean --force
    rm -rf node_modules package-lock.json
    npm install
    
    if [ -d "react-app" ]; then
        cd react-app
        rm -rf node_modules package-lock.json
        npm install
        cd ..
    fi
    
    styled_output "Cache fixed and dependencies reinstalled!" "success"
    return 0
}

# Launch React app function
launch_react_app() {
    styled_output "🎮 Launching React app..." "info"
    
    if [ ! -d "react-app" ]; then
        styled_output "React app directory not found!" "error"
        return 1
    fi
    
    cd react-app
    npm start &
    cd ..
    
    styled_output "React app launched successfully!" "success"
    return 0
}

# Run in WSL mode
run_in_wsl() {
    styled_output "🖥️ Running in WSL mode..." "info"
    
    # Build backend only first
    build_backend_only || return 1
    
    # Start the server with specific WSL configuration
    NODE_ENV=production node build/server.js --wsl &
    SERVER_PID=$!
    echo $SERVER_PID > server/.server.pid
    
    styled_output "Server started in WSL mode!" "success"
    return 0
}

# Main menu
main_menu() {
    # Run installation check on first launch
    if [ ! -f ".installation_checked" ]; then
        styled_output "🎨 Checking your ArtBastard installation status..." "info"
        check_server_installation
        INSTALL_STATUS=$?
        
        touch .installation_checked
        
        if [ $INSTALL_STATUS -ne 0 ]; then
            read -p "Would you like to perform the initial setup now? (y/n) " answer
            if [ "$answer" = "y" ]; then
                setup_server
            fi
        fi
    fi
    
    while true; do
        pierre_speaks
        
        if command -v gum >/dev/null 2>&1; then
            CHOICE=$(gum choose --height 20 \
                "🎨 Update ArtBastard" \
                "🚀 Setup Server" \
                "💻 Create 'artbastard' Command" \
                "🧹 Clean Up (Fresh Start)" \
                "🎵 Launch Server & Monitor MIDI" \
                "🎹 Monitor MIDI (Local Only)" \
                "📝 Monitor Server Logs" \
                "🔄 Check/Install Dependencies" \
                "🔍 Diagnostics & Troubleshooting" \
                "🛠️ Build Backend Only" \
                "🌐 Build React Frontend" \
                "🔧 Fix Cache" \
                "🎮 Launch React App" \
                "🖥️ Run in WSL Mode" \
                "❌ Exit")
        else
            show_menu
            CHOICE=$?
            case "$CHOICE" in
                1) CHOICE="🎨 Update ArtBastard" ;;
                2) CHOICE="🚀 Setup Server" ;;
                3) CHOICE="💻 Create 'artbastard' Command" ;;
                4) CHOICE="🧹 Clean Up (Fresh Start)" ;;
                5) CHOICE="🎵 Launch Server & Monitor MIDI" ;;
                6) CHOICE="🎹 Monitor MIDI (Local Only)" ;;
                7) CHOICE="📝 Monitor Server Logs" ;;
                8) CHOICE="🔄 Check/Install Dependencies" ;;
                9) CHOICE="🔍 Diagnostics & Troubleshooting" ;;
                10) CHOICE="🛠️ Build Backend Only" ;;
                11) CHOICE="🌐 Build React Frontend" ;;
                12) CHOICE="🔧 Fix Cache" ;;
                13) CHOICE="🎮 Launch React App" ;;
                14) CHOICE="🖥️ Run in WSL Mode" ;;
                0) CHOICE="❌ Exit" ;;
            esac
        fi
        
        case "$CHOICE" in
            "🎨 Update ArtBastard")
                update_artbastard
                ;;
            "🚀 Setup Server")
                setup_server
                ;;
            "💻 Create 'artbastard' Command")
                create_system_command
                ;;
            "🧹 Clean Up (Fresh Start)")
                clean_up
                ;;
            "🎵 Launch Server & Monitor MIDI")
                launch_server_with_monitoring
                ;;
            "🎹 Monitor MIDI (Local Only)")
                monitor_midi_local_only
                ;;
            "📝 Monitor Server Logs")
                monitor_server_logs
                ;;
            "🔄 Check/Install Dependencies")
                check_install_dependencies
                ;;
            "🔍 Diagnostics & Troubleshooting")
                run_diagnostics
                ;;
            "🛠️ Build Backend Only")
                build_backend_only
                ;;
            "🌐 Build React Frontend")
                build_react_frontend
                ;;
            "🔧 Fix Cache")
                fix_cache
                ;;
            "🎮 Launch React App")
                launch_react_app
                ;;
            "🖥️ Run in WSL Mode")
                run_in_wsl
                ;;
            "❌ Exit")
                styled_output "👋 Au revoir! Until we meet again." "info"
                exit 0
                ;;
        esac
    done
}

# Handle script arguments
if [ "$1" = "monitor_midi_only" ]; then
    monitor_midi_local_only
    exit 0
elif [ "$1" = "factory_reset" ]; then
    factory_reset
    exit 0
elif [ "$1" = "reinstall" ]; then
    reinstall
    exit 0
fi

# Check for dependencies and show main menu
check_install_dependencies
main_menu