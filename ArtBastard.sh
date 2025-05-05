#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```
</copilot-edited-file>
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"

    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Use npm start to properly run the frontend server with the correct port
    PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

launch_without_typechecking() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend
    gum style --foreground 212 "『 Composing the Backend Movement... 』"
    npm run build-backend 2>&1 | tee -a $ERROR_LOG

    # Build frontend without type checking
    gum style --foreground 212 "『 Bypassing the TypeScript Gatekeepers... 』"
    # Run our special script to build without type checking
    node build-without-typechecking.js 2>&1 | tee -a $ERROR_LOG

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    gum style --foreground 212 "『 Backend server started successfully on port $BACKEND_PORT! 』"
    
    # Start frontend
    gum style --foreground 212 "『 Setting the Stage for the Frontend... 』"
    cd $FRONTEND_DIR
    
    # Create log filename with timestamp for frontend
    frontend_log="../$LOG_DIR/frontend-$(date +%Y%m%d%H%M%S).log"
    
    # Start the frontend server, serving the built application
    if [ -d "dist" ]; then
        # If we have a built app, serve it
        npx serve -s dist -l $FRONTEND_PORT > "$frontend_log" 2>&1 &
    else
        # Fall back to npm start if no build is available
        PORT=$FRONTEND_PORT npm start > "$frontend_log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    
    # Store PID for later cleanup
    echo $FRONTEND_PID > "../$LOG_DIR/frontend.pid"
    cd ..
    
    # Wait for frontend to be available
    if ! wait_for_service "http://localhost:$FRONTEND_PORT" 30; then
        gum style --foreground 196 "『 Frontend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of frontend log:"
        tail -n 20 "$frontend_log" | gum format -t code
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Launch browser with the frontend URL
    gum style --foreground 212 "『 Opening the frontend in your browser... 』"
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:$FRONTEND_PORT" &
    elif command -v open > /dev/null; then
        open "http://localhost:$FRONTEND_PORT" &
    fi

    # Show access information
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 213 \
        "✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧" \
        "Frontend Gallery: http://localhost:${FRONTEND_PORT}" \
        "Backstage Access: http://localhost:${BACKEND_PORT}" \
        "〜 Press Ctrl+C when you're ready to end the performance 〜"

    # This line keeps the script running until Ctrl+C
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; gum style --foreground 213 '『 The performance has concluded... 』'; exit" INT
    
    # Wait for processes to finish (will be killed by trap on Ctrl+C)
    wait $BACKEND_PID $FRONTEND_PID
}

system_setup() {
    gum confirm "Do you want to install system dependencies?" && {
        # Create logs directory if it doesn't exist
        mkdir -p $LOG_DIR
        
        gum spin --spinner dot --title "Installing backend dependencies..." -- npm install
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Installing frontend dependencies..." -- npm install
        cd ..
        gum style --foreground 212 "System setup complete!"
    }
}

clear_cache() {
    gum confirm "『 Shall we purify the artistic workspace? 』" && {
        gum spin --spinner dots --title "『 Clearing the canvas... 』" -- rm -rf node_modules $FRONTEND_DIR/node_modules dist $FRONTEND_DIR/dist
        npm cache clean --force
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

show_midi_info() {
    gum style --foreground 212 "『 Discovering the Musical Constellations... 』"
    node -e "require('./dist/index.js').listMidiInterfaces()" | \
        gum format -t code
}

view_logs() {
    if [ ! -d "$LOG_DIR" ]; then
        gum style --foreground 196 "No logs found!"
        return
    fi

    LOG_FILE=$(gum choose "errors.log" $(ls -1 $LOG_DIR))
    
    if [ "$LOG_FILE" = "errors.log" ]; then
        if [ -f "$ERROR_LOG" ]; then
            gum pager < "$ERROR_LOG"
        else
            gum style --foreground 196 "Error log file not found!"
        fi
    elif [ -n "$LOG_FILE" ]; then
        gum pager < "$LOG_DIR/$LOG_FILE"
    fi
}

rebuild_system() {
    gum confirm "This will rebuild the entire system. Continue?" && {
        clear_cache
        system_setup
        gum spin --spinner dot --title "Building backend..." -- npm run build-backend
        cd $FRONTEND_DIR
        gum spin --spinner dot --title "Building frontend..." -- npm run build
        cd ..
        gum style --foreground 212 "System rebuild complete!"
    }
}

# Kill any running processes on exit
cleanup() {
    # Check if we have saved PIDs and kill them
    if [ -f "$LOG_DIR/backend.pid" ]; then
        kill $(cat "$LOG_DIR/backend.pid") 2>/dev/null
        rm "$LOG_DIR/backend.pid"
    fi
    
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        kill $(cat "$LOG_DIR/frontend.pid") 2>/dev/null
        rm "$LOG_DIR/frontend.pid"
    fi
    
    # Kill any other processes on our ports
    kill_processes_on_ports
}

# Register cleanup function
trap cleanup EXIT

# Main program
check_gum
# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR
# Start with clean error log
> $ERROR_LOG

# Show explanation about the two launch options
gum style \
    --border normal \
    --align left \
    --width 80 \
    --margin "1 2" \
    --padding "1 2" \
    --foreground 117 \
    "✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧" \
    "• 'Launch All' - Regular launch with full TypeScript checking" \
    "• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)" \
    "Both options start a complete backend and frontend environment."

while true; do
    clear
    show_header
    show_menu
done
```bash
#!/bin/bash

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
BACKEND_PORT=3000
FRONTEND_PORT=3001
FRONTEND_DIR="react-app"
LOG_DIR="logs"
ERROR_LOG="errors.log"

# Check for gum installation
check_gum() {
    if ! command -v gum &> /dev/null; then
        echo "Installing gum..."
        go install github.com/charmbracelet/gum@latest
    fi
}

# Display fancy header
show_header() {
    gum style \
        --border double \
        --align center \
        --width 70 \
        --margin "1 2" \
        --padding "1 2" \
        --foreground 212 \
        "⚡ ArtBastard DMX512FTW ⚡" \
        "『 The Digital Luminescence Orchestra 』" \
        "▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁" \
        "「 Where Code Meets Light in Perfect Harmony 」"
}

# Main menu
show_menu() {
    choice=$(gum choose \
        "🎭 Commence the Grand Performance (Launch All)" \
        "🎪 Prepare the Stage (System Setup)" \
        "⬆️ Channel the Latest Inspiration (Update)" \
        "🎹 Survey the Musical Landscape (MIDI Info)" \
        "📜 Consult the Ancient Scrolls (View Logs)" \
        "🎨 Reinvent the Canvas (Rebuild)" \
        "🎭✨ Commence the Performance (Bypass TypeScript)" \
        "🌙 Fade to Black (Exit)")

    case "$choice" in
        "🎭 Commence the Grand Performance (Launch All)")
            launch_all
            ;;
        "🎪 Prepare the Stage (System Setup)")
            system_setup
            ;;
        "⬆️ Channel the Latest Inspiration (Update)")
            update_from_github
            ;;
        "🎹 Survey the Musical Landscape (MIDI Info)")
            show_midi_info
            ;;
        "📜 Consult the Ancient Scrolls (View Logs)")
            view_logs
            ;;
        "🎨 Reinvent the Canvas (Rebuild)")
            rebuild_system
            ;;
        "🎭✨ Commence the Performance (Bypass TypeScript)")
            launch_without_typechecking
            ;;
        "🌙 Fade to Black (Exit)")
            gum style --foreground 213 "『 The stage dims, until we meet again... 』"
            exit 0
            ;;
    esac
}

update_from_github() {
    gum confirm "『 Shall we fetch the latest artistic inspiration? 』" && {
        gum spin --spinner minidot --title "『 Syncing with the celestial repository... 』" -- git pull
        gum style --foreground 212 "✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧"
    }
}

# Check if a port is available
check_port_available() {
    local port=$1
    if lsof -i:"$port" > /dev/null ; then
        return 1
    else
        return 0
    fi
}

# Find and kill processes using specific ports
kill_processes_on_ports() {
    gum style --foreground 213 "『 Freeing the stage from previous performances... 』"
    
    # Find and kill processes using BACKEND_PORT
    local pid=$(lsof -t -i:$BACKEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $BACKEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
    
    # Find and kill processes using FRONTEND_PORT
    pid=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null)
    if [ -n "$pid" ]; then
        gum style --foreground 196 "Process $pid is using port $FRONTEND_PORT - terminating..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Wait for a service to be available
wait_for_service() {
    local url=$1
    local max_attempts=$2
    local attempt=0
    
    # Define the service check function
    check_service() {
        local attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if curl -s --head "$url" > /dev/null; then
                return 0
            fi
            sleep 1
            attempt=$((attempt+1))
        done
        return 1
    }
    
    # Run the check with a spinner
    if gum spin --spinner dot --title "『 Waiting for service at $url... 』" -- bash -c "$(declare -f check_service); check_service"; then
        return 0
    else
        return 1
    fi
}

launch_all() {
    # Kill any processes using our ports first
    kill_processes_on_ports
    
    # Check if ports are available after killing
    if ! check_port_available $BACKEND_PORT; then
        gum style --foreground 196 "『 Port $BACKEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    if ! check_port_available $FRONTEND_PORT; then
        gum style --foreground 196 "『 Port $FRONTEND_PORT is still in use even after cleanup. Please investigate further. 』"
        gum confirm "Press Enter to continue..." && return
    fi
    
    # Ensure node_modules exists
    if [ ! -d "node_modules" ] || [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        system_setup
    fi

    # Build backend if dist directory doesn't exist
    if [ ! -d "dist" ]; then
        gum style --foreground 212 "『 Composing the Backend Movement... 』"
        npm run build-backend 2>&1 | tee -a $ERROR_LOG
        
        # Check if build was successful
        if [ ! -d "dist" ]; then
            gum style --foreground 196 "『 Backend build failed! Check $ERROR_LOG for details. 』"
            gum confirm "Press Enter to continue..." && return
        fi
    fi

    # Start backend with log capture
    gum style --foreground 212 "『 The Conductor Takes Position... 』"
    
    # Create log filename with timestamp
    backend_log="$LOG_DIR/backend-$(date +%Y%m%d%H%M%S).log"
    
    # Make sure directories exist in dist first
    mkdir -p dist/data dist/logs
    
    # Check if config.json exists, create if not
    if [ ! -f data/config.json ]; then
        echo '{"artNetConfig":{"ip":"192.168.1.199","subnet":0,"universe":0,"net":0,"port":6454,"base_refresh_interval":1000},"midiMappings":{}}' > data/config.json
        gum style --foreground 212 "『 Created default config.json file 』"
    fi
    
    # Try to run the server with proper error handling
    NODE_ENV=production node dist/index.js > "$backend_log" 2>&1 &
    BACKEND_PID=$!
    
    # Store PID for later cleanup
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"

    # Wait for backend to be available
    if ! wait_for_service "http://localhost:$BACKEND_PORT" 15; then
        gum style --foreground 196 "『 Backend server failed to start. Check logs for details. 』"
        # Show the last few lines of the log
        gum style --foreground 196 "Last lines of backend log:"
        tail -n 20 "$backend_log" | gum format -t code
        kill $BACKEND_PID 2>/dev/null
        gum confirm "Press Enter to continue..." && return
    fi
    