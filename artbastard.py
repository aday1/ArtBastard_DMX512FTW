#!/usr/bin/env python3
"""
ArtBastard - DMX512FTW
A Python script to manage the ArtBastard DMX512 application.
"""

import os
import sys
import time
import json
import signal
import socket
import subprocess
import webbrowser
from datetime import datetime
from pathlib import Path
import venv
import site

# Configuration
VENV_DIR = ".venv"  # Directory for virtual environment

# Function to ensure we're running in a virtual environment with all dependencies
def ensure_venv_with_deps():
    """Create virtual environment if needed and install required dependencies"""
    venv_dir = Path(VENV_DIR).absolute()
    venv_python = venv_dir / ("Scripts" if sys.platform == "win32" else "bin") / "python"
    
    # Check if we're already in the venv
    in_venv = sys.prefix != sys.base_prefix
    
    if in_venv:
        # We're in a venv, just make sure dependencies are installed
        try:
            import psutil
            import rich
            import pythonosc
            return  # All dependencies already available
        except ImportError:
            pass  # Will install missing dependencies
    else:
        # Not in venv, check if it exists
        if not venv_python.exists():
            print(f"Creating virtual environment in {venv_dir}...")
            venv.create(venv_dir, with_pip=True)
            
        # Install dependencies in the venv
        print("Installing required dependencies in virtual environment...")
        required_packages = ["rich", "psutil", "python-osc"]
        subprocess.check_call([str(venv_python), "-m", "pip", "install"] + required_packages)
        
        # Re-execute script with the venv python
        print(f"Restarting script with virtual environment...")
        os.execv(str(venv_python), [str(venv_python), __file__])

# Ensure virtual environment with dependencies
if __name__ == "__main__":
    # Only run this if we're not in a venv yet or if dependencies aren't installed
    try:
        import psutil
        import rich
        import pythonosc
    except ImportError:
        ensure_venv_with_deps()

# Now import all required packages which should be available
import psutil
import threading
from rich.console import Console
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.text import Text
from rich.prompt import Prompt, Confirm
from rich.syntax import Syntax
import pythonosc
from pythonosc import dispatcher
from pythonosc import osc_server

# Configuration
BACKEND_PORT = 3000
FRONTEND_PORT = 3001
FRONTEND_DIR = "react-app"
LOG_DIR = "logs"
ERROR_LOG = "errors.log"
OSC_PORT = 8000  # Port for monitoring OSC messages
CONFIG_DIR = "data"
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

# Initialize console
console = Console()

# State tracking
running_processes = {}
osc_monitor = None
osc_messages = []
last_logs = []

class ArtBastard:
    """Main application class for ArtBastard."""

    def __init__(self):
        self.console = Console()
        self._ensure_directories()
        self.backend_pid = None
        self.frontend_pid = None
        self.monitor_thread = None
        self.monitor_running = False
        self.osc_server = None

    def _ensure_directories(self):
        """Ensure all necessary directories exist."""
        os.makedirs(LOG_DIR, exist_ok=True)
        os.makedirs(os.path.join("dist", "data"), exist_ok=True)
        os.makedirs(os.path.join("dist", "logs"), exist_ok=True)

    def _create_default_config(self):
        """Create a default config file if it doesn't exist."""
        if not os.path.exists(CONFIG_FILE):
            os.makedirs(CONFIG_DIR, exist_ok=True)
            default_config = {
                "artNetConfig": {
                    "ip": "192.168.1.199",
                    "subnet": 0,
                    "universe": 0,
                    "net": 0,
                    "port": 6454,
                    "base_refresh_interval": 1000
                },
                "midiMappings": {}
            }
            with open(CONFIG_FILE, 'w') as f:
                json.dump(default_config, f, indent=2)
            self.console.print("✨ Created default config.json file", style="green")

    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = False
        try:
            sock.bind(("127.0.0.1", port))
            result = True
        except:
            pass
        finally:
            sock.close()
        return result

    def _kill_process_on_port(self, port: int) -> bool:
        """Kill any process running on the specified port."""
        # First, try to find processes using the specified port using system commands
        # This is more reliable than using psutil's connections which may not be available on all platforms
        try:
            if sys.platform == 'win32':
                # Windows - use netstat
                self.console.print(f"Looking for processes using port {port}...", style="yellow")
                result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
                if result.returncode == 0:
                    for line in result.stdout.splitlines():
                        if f":{port}" in line and ('LISTENING' in line or 'ESTABLISHED' in line):
                            parts = line.strip().split()
                            if len(parts) >= 5:
                                try:
                                    pid = int(parts[-1])
                                    self.console.print(f"Found process with PID {pid} using port {port} - terminating...", style="red")
                                    try:
                                        # First try graceful termination
                                        subprocess.run(['taskkill', '/PID', str(pid)], capture_output=True)
                                        time.sleep(1)
                                        # If still running, force it
                                        subprocess.run(['taskkill', '/F', '/PID', str(pid)], capture_output=True)
                                        return True
                                    except:
                                        self.console.print(f"Failed to kill process with PID {pid}", style="red")
                                except:
                                    pass
            else:
                # Linux/macOS - use lsof
                self.console.print(f"Looking for processes using port {port}...", style="yellow")
                result = subprocess.run(['lsof', '-i', f':{port}'], capture_output=True, text=True)
                if result.returncode == 0 and result.stdout.strip():
                    for line in result.stdout.splitlines()[1:]:  # Skip header line
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            try:
                                pid = int(parts[1])
                                self.console.print(f"Found process with PID {pid} using port {port} - terminating...", style="red")
                                try:
                                    # Send SIGTERM first, then SIGKILL if needed
                                    os.kill(pid, signal.SIGTERM)
                                    time.sleep(1)
                                    if psutil.pid_exists(pid):
                                        os.kill(pid, signal.SIGKILL)
                                    return True
                                except:
                                    self.console.print(f"Failed to kill process with PID {pid}", style="red")
                            except:
                                pass
            
            # Fallback method using psutil, but only get basic info and check connections manually
            self.console.print("Using fallback method to check for processes on port...", style="yellow")
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    # Get process details and check if it has connections on our port
                    proc_info = proc.as_dict(attrs=['pid', 'name'])
                    pid = proc_info['pid']
                    
                    # Safely check connections
                    try:
                        # Replace deprecated connections() with net_connections()
                        connections = proc.net_connections() if hasattr(proc, 'net_connections') else []
                        for conn in connections:
                            if hasattr(conn, 'laddr') and hasattr(conn.laddr, 'port') and conn.laddr.port == port:
                                self.console.print(f"Process {pid} ({proc_info['name']}) is using port {port} - terminating...", 
                                                style="red")
                                psutil.Process(pid).terminate()
                                time.sleep(1)
                                if psutil.pid_exists(pid):
                                    psutil.Process(pid).kill()
                                return True
                    except (psutil.AccessDenied, psutil.NoSuchProcess, AttributeError):
                        # Skip this process if we can't access its connections
                        continue
                except (psutil.NoSuchProcess, psutil.AccessDenied, KeyError):
                    continue
                    
        except Exception as e:
            self.console.print(f"Error checking processes: {e}", style="red")
            
        return False

    def _kill_processes_on_ports(self):
        """Kill processes using the backend and frontend ports."""
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Freeing ports for the performance..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            self._kill_process_on_port(BACKEND_PORT)
            self._kill_process_on_port(FRONTEND_PORT)
            progress.update(task, completed=True)

    def _wait_for_service(self, url: str, max_attempts: int = 30) -> bool:
        """Wait for a service to be available at the specified URL."""
        with Progress(
            SpinnerColumn(),
            TextColumn(f"[bold blue]Waiting for service at {url}..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=max_attempts)
            
            for i in range(max_attempts):
                import http.client
                url_parts = url.split("://")[1].split(":")
                host = url_parts[0]
                port = int(url_parts[1].split("/")[0])
                
                try:
                    conn = http.client.HTTPConnection(host, port, timeout=1)
                    conn.request("HEAD", "/")
                    response = conn.getresponse()
                    conn.close()
                    return True
                except:
                    progress.update(task, advance=1)
                    time.sleep(1)
            
            return False

    def system_setup(self):
        """Install system dependencies."""
        self.console.print("🎪 Preparing the Stage (System Setup)", style="bold cyan")
        
        if not Confirm.ask("Do you want to install system dependencies?"):
            return
        
        # Create logs directory if it doesn't exist
        os.makedirs(LOG_DIR, exist_ok=True)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Installing backend dependencies..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            subprocess.run(["npm", "install"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        
        os.chdir(FRONTEND_DIR)
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Installing frontend dependencies..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            subprocess.run(["npm", "install"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        os.chdir("..")
        
        self.console.print("✨ System setup complete!", style="green")

    def clear_cache(self):
        """Clear node_modules and dist directories."""
        self.console.print("🧹 Clearing the Canvas (Cache Cleaning)", style="bold cyan")
        
        if not Confirm.ask("『 Shall we purify the artistic workspace? 』"):
            return
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]『 Clearing the canvas... 』"),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            
            # Remove node_modules
            if os.path.exists("node_modules"):
                import shutil
                shutil.rmtree("node_modules", ignore_errors=True)
            
            # Remove frontend node_modules
            if os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
                import shutil
                shutil.rmtree(os.path.join(FRONTEND_DIR, "node_modules"), ignore_errors=True)
            
            # Remove dist directories
            if os.path.exists("dist"):
                import shutil
                shutil.rmtree("dist", ignore_errors=True)
            
            if os.path.exists(os.path.join(FRONTEND_DIR, "dist")):
                import shutil
                shutil.rmtree(os.path.join(FRONTEND_DIR, "dist"), ignore_errors=True)
            
            # Clean npm cache
            subprocess.run(["npm", "cache", "clean", "--force"], 
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            
            progress.update(task, completed=True)
        
        self.console.print("✧･ﾟ: *✧･ﾟ:* 『 The canvas has been renewed 』 *:･ﾟ✧*:･ﾟ✧", style="green")

    def rebuild_system(self):
        """Rebuild the entire system."""
        self.console.print("🎨 Reinventing the Canvas (Rebuild)", style="bold cyan")
        
        if not Confirm.ask("This will rebuild the entire system. Continue?"):
            return
        
        self.clear_cache()
        self.system_setup()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Building backend..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            subprocess.run(["npm", "run", "build-backend"], 
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        
        os.chdir(FRONTEND_DIR)
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]Building frontend..."),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            subprocess.run(["npm", "run", "build"], 
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            progress.update(task, completed=True)
        os.chdir("..")
        
        self.console.print("✨ System rebuild complete!", style="green")

    def show_midi_info(self):
        """Display information about MIDI interfaces."""
        self.console.print("🎹 Surveying the Musical Landscape (MIDI Info)", style="bold cyan")
        
        if not os.path.exists("dist/index.js"):
            self.console.print("Backend not built yet. Please build the backend first.", style="red")
            return
        
        self.console.print("『 Discovering the Musical Constellations... 』", style="cyan")
        
        result = subprocess.run(
            ["node", "-e", "require('./dist/index.js').listMidiInterfaces()"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            midi_info = result.stdout
            syntax = Syntax(midi_info, "javascript", theme="monokai", line_numbers=True)
            self.console.print(Panel(syntax, title="MIDI Interfaces", border_style="green"))
        else:
            self.console.print("❌ Error getting MIDI information:", style="red")
            self.console.print(result.stderr, style="red")

    def view_logs(self):
        """View application logs."""
        self.console.print("📜 Consulting the Ancient Scrolls (View Logs)", style="bold cyan")
        
        if not os.path.exists(LOG_DIR):
            self.console.print("No logs found!", style="red")
            return
        
        # Get list of log files
        log_files = ["errors.log"] + [f for f in os.listdir(LOG_DIR) if os.path.isfile(os.path.join(LOG_DIR, f))]
        
        # Display list for selection
        self.console.print("Select a log file to view:", style="cyan")
        for i, log_file in enumerate(log_files):
            self.console.print(f"[{i}] {log_file}")
        
        choice = Prompt.ask("Enter number", default="0")
        try:
            choice = int(choice)
            if 0 <= choice < len(log_files):
                selected_log = log_files[choice]
                
                if selected_log == "errors.log":
                    log_path = ERROR_LOG
                else:
                    log_path = os.path.join(LOG_DIR, selected_log)
                
                if os.path.exists(log_path):
                    with open(log_path, 'r', errors='replace') as f:
                        log_content = f.read()
                    
                    pager = subprocess.Popen(['less'], stdin=subprocess.PIPE)
                    pager.communicate(input=log_content.encode())
                else:
                    self.console.print(f"Log file {log_path} not found!", style="red")
            else:
                self.console.print("Invalid choice!", style="red")
        except ValueError:
            self.console.print("Invalid input!", style="red")

    def update_from_github(self):
        """Update from GitHub repository."""
        self.console.print("⬆️ Channeling the Latest Inspiration (Update)", style="bold cyan")
        
        if not Confirm.ask("『 Shall we fetch the latest artistic inspiration? 』"):
            return
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[bold blue]『 Syncing with the celestial repository... 』"),
            console=self.console
        ) as progress:
            task = progress.add_task("", total=None)
            result = subprocess.run(["git", "pull"], 
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
                                  text=True, check=False)
            progress.update(task, completed=True)
        
        if result.returncode == 0:
            self.console.print("✧･ﾟ: *✧･ﾟ:* 『 The code has been enlightened 』 *:･ﾟ✧*:･ﾟ✧", style="green")
            self.console.print(result.stdout)
        else:
            self.console.print("❌ Error updating from GitHub:", style="red")
            self.console.print(result.stderr, style="red")
    
    def start_osc_monitor(self, port=OSC_PORT):
        """Start monitoring OSC messages."""
        global osc_messages
        
        if self.osc_server:
            self.console.print("OSC monitor is already running", style="yellow")
            return
        
        def osc_handler(address, *args):
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            message = f"{timestamp} {address}: {args}"
            osc_messages.append(message)
            # Keep only the last 100 messages
            if len(osc_messages) > 100:
                osc_messages.pop(0)
        
        try:
            from pythonosc import dispatcher
            from pythonosc import osc_server
            
            disp = dispatcher.Dispatcher()
            disp.set_default_handler(osc_handler)
            
            server = osc_server.ThreadingOSCUDPServer(("127.0.0.1", port), disp)
            self.console.print(f"👂 Listening for OSC messages on port {port}...", style="green")
            
            # Start server in a thread
            self.osc_thread = threading.Thread(target=server.serve_forever)
            self.osc_thread.daemon = True
            self.osc_thread.start()
            self.osc_server = server
            
        except Exception as e:
            self.console.print(f"Error starting OSC monitor: {e}", style="red")

    def stop_osc_monitor(self):
        """Stop monitoring OSC messages."""
        if self.osc_server:
            self.osc_server.shutdown()
            self.osc_server = None
            self.console.print("OSC monitor stopped", style="yellow")
        else:
            self.console.print("OSC monitor is not running", style="yellow")

    def start_system_monitor(self):
        """Start monitoring system metrics."""
        if self.monitor_thread and self.monitor_running:
            self.console.print("System monitor is already running", style="yellow")
            return
        
        self.monitor_running = True
        self.monitor_thread = threading.Thread(target=self._monitor_thread_func)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        self.console.print("🔍 System monitoring started", style="green")

    def stop_system_monitor(self):
        """Stop the system monitor."""
        self.monitor_running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1)
            self.monitor_thread = None
        self.console.print("🛑 System monitoring stopped", style="yellow")

    def _monitor_thread_func(self):
        """Background thread function for system monitoring."""
        global last_logs
        
        while self.monitor_running:
            # Update system stats periodically
            time.sleep(1)
            
            # Check backend logs
            if self.backend_pid and os.path.exists(f"{LOG_DIR}/backend.pid"):
                log_files = sorted([f for f in os.listdir(LOG_DIR) if f.startswith("backend-")])
                if log_files:
                    latest_log = os.path.join(LOG_DIR, log_files[-1])
                    try:
                        with open(latest_log, 'r', errors='replace') as f:
                            content = f.readlines()
                            if content:
                                # Get the last few lines
                                last_n = min(5, len(content))
                                last_logs = content[-last_n:]
                    except Exception:
                        pass

    def _launch_browser(self, url):
        """Launch a browser with the given URL."""
        self.console.print(f"『 Opening the frontend in your browser... 』", style="cyan")
        try:
            webbrowser.open(url)
        except Exception as e:
            self.console.print(f"Error opening browser: {e}", style="red")

    def _display_dashboard(self):
        """Display a monitoring dashboard."""
        # Create layout
        layout = Layout()
        
        layout.split(
            Layout(name="header", size=3),
            Layout(name="main"),
            Layout(name="footer", size=3)
        )
        
        layout["main"].split_row(
            Layout(name="left", ratio=2),
            Layout(name="right", ratio=1),
        )
        
        layout["left"].split(
            Layout(name="status", size=8),
            Layout(name="logs"),
            Layout(name="osc", size=10),
        )
        
        # Update function for Live display
        def update_dashboard():
            # Header
            header = Panel(
                Text("⚡ ArtBastard DMX512FTW ⚡", justify="center"),
                style="cyan",
                border_style="cyan"
            )
            
            # Status table
            status_table = Table(show_header=True, header_style="bold magenta", expand=True)
            status_table.add_column("Service")
            status_table.add_column("Status")
            status_table.add_column("PID")
            status_table.add_column("Port")
            status_table.add_column("URL")
            
            # Backend status
            backend_status = "✅ Running" if self.backend_pid else "❌ Stopped"
            backend_pid = str(self.backend_pid) if self.backend_pid else "-"
            backend_url = f"http://localhost:{BACKEND_PORT}"
            status_table.add_row("Backend", backend_status, backend_pid, str(BACKEND_PORT), backend_url)
            
            # Frontend status
            frontend_status = "✅ Running" if self.frontend_pid else "❌ Stopped"
            frontend_pid = str(self.frontend_pid) if self.frontend_pid else "-"
            frontend_url = f"http://localhost:{FRONTEND_PORT}"
            status_table.add_row("Frontend", frontend_status, frontend_pid, str(FRONTEND_PORT), frontend_url)
            
            # System metrics
            system_table = Table(show_header=True, header_style="bold blue", expand=True)
            system_table.add_column("Metric")
            system_table.add_column("Value")
            
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            mem_percent = memory.percent
            
            system_table.add_row("CPU Usage", f"{cpu_percent}%")
            system_table.add_row("Memory Usage", f"{mem_percent}%")
            system_table.add_row("Time", datetime.now().strftime("%H:%M:%S"))
            
            # Logs panel
            logs_content = "\n".join(last_logs) if last_logs else "No recent logs"
            logs_panel = Panel(logs_content, title="Recent Logs", border_style="green")
            
            # OSC panel
            osc_content = "\n".join(osc_messages[-5:]) if osc_messages else "No OSC messages received"
            osc_panel = Panel(osc_content, title="OSC Messages", border_style="yellow")
            
            # Footer with help
            footer = Panel(
                Text("Press Ctrl+C to return to menu", justify="center"),
                style="dim",
                border_style="dim"
            )
            
            # Update the layout
            layout["header"].update(header)
            layout["status"].update(Panel(status_table, title="Services", border_style="blue"))
            layout["logs"].update(logs_panel)
            layout["osc"].update(osc_panel)
            layout["right"].update(Panel(system_table, title="System Metrics", border_style="magenta"))
            layout["footer"].update(footer)
            
            return layout
        
        # Live updating dashboard
        try:
            with Live(update_dashboard(), refresh_per_second=2, screen=True) as live:
                while True:
                    time.sleep(0.5)
                    live.update(update_dashboard())
        except KeyboardInterrupt:
            
            return

    def _stop_services(self):
        """Stop backend and frontend services if they're running."""
        # Stop backend
        if self.backend_pid:
            try:
                if psutil.pid_exists(self.backend_pid):
                    p = psutil.Process(self.backend_pid)
                    p.terminate()
                    p.wait(timeout=3)
                self.backend_pid = None
            except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                pass
        
        # Stop frontend
        if self.frontend_pid:
            try:
                if psutil.pid_exists(self.frontend_pid):
                    p = psutil.Process(self.frontend_pid)
                    p.terminate()
                    p.wait(timeout=3)
                self.frontend_pid = None
            except (psutil.NoSuchProcess, psutil.TimeoutExpired):
                pass
        
        self.console.print("『 Services have been stopped 』", style="yellow")

    def launch_all(self, bypass_typescript=False):
        """Launch the application."""
        title = "🎭 Commencing the Grand Performance (Launch All)"
        if bypass_typescript:
            title = "🎭✨ Commencing the Performance (Bypass TypeScript)"
        
        self.console.print(title, style="bold cyan")
        
        # Add debug output
        self.console.print("DEBUG: Starting launch process...", style="yellow")
        
        # Kill any processes using our ports first
        self._kill_processes_on_ports()
        
        # Check if ports are available after killing
        if not self._is_port_available(BACKEND_PORT):
            self.console.print(f"『 Port {BACKEND_PORT} is still in use even after cleanup. Please investigate further. 』", 
                            style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        
        if not self._is_port_available(FRONTEND_PORT):
            self.console.print(f"『 Port {FRONTEND_PORT} is still in use even after cleanup. Please investigate further. 』", 
                            style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        
        # Ensure node_modules exists
        if not os.path.exists("node_modules") or not os.path.exists(os.path.join(FRONTEND_DIR, "node_modules")):
            self.console.print("DEBUG: node_modules not found, running system setup", style="yellow")
            self.system_setup()
        
        # Debug output for dist directory check
        self.console.print(f"DEBUG: Checking for dist directory. Exists: {os.path.exists('dist')}", style="yellow")
        
        # Build backend if dist directory doesn't exist or if bypassing TypeScript
        if not os.path.exists("dist") or bypass_typescript:
            self.console.print("『 Composing the Backend Movement... 』", style="cyan")
            
            # Ensure the error log directory exists
            os.makedirs(os.path.dirname(ERROR_LOG), exist_ok=True)
            
            # Add debug for build process
            self.console.print("DEBUG: Running npm build-backend", style="yellow")
            
            with open(ERROR_LOG, "a") as error_file:
                try:
                    # Use check=True to raise an exception if the command fails
                    result = subprocess.run(
                        ["npm", "run", "build-backend"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        check=False
                    )
                    error_file.write(result.stdout)
                    error_file.write(result.stderr)
                    
                    # Debug output for build result
                    self.console.print(f"DEBUG: Build process return code: {result.returncode}", style="yellow")
                    
                except Exception as e:
                    self.console.print(f"DEBUG: Error during build: {str(e)}", style="red")
                    error_file.write(f"\nException during build: {str(e)}\n")
            
            if not os.path.exists("dist"):
                self.console.print("『 Backend build failed! Check errors.log for details. 』", style="red")
                Prompt.ask("Press Enter to continue...", default="")
                return False
            
            # If bypassing TypeScript, build frontend without type checking
            if bypass_typescript:
                self.console.print("『 Bypassing the TypeScript Gatekeepers... 』", style="cyan")
                with open(ERROR_LOG, "a") as error_file:
                    result = subprocess.run(
                        ["node", "build-without-typechecking.js"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True
                    )
                    error_file.write(result.stdout)
                    error_file.write(result.stderr)
        
        # Debug for dist/index.js
        if not os.path.exists("dist/index.js"):
            self.console.print("DEBUG: dist/index.js does not exist after build!", style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        else:
            self.console.print("DEBUG: dist/index.js exists, continuing", style="green")
        
        # Start backend with log capture
        self.console.print("『 The Conductor Takes Position... 』", style="cyan")
        
        # Create log filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        backend_log = f"{LOG_DIR}/backend-{timestamp}.log"
        
        # Make sure directories exist in dist first
        os.makedirs(os.path.join("dist", "data"), exist_ok=True)
        os.makedirs(os.path.join("dist", "logs"), exist_ok=True)
        
        # Check if config.json exists, create if not
        self._create_default_config()
        
        # Try to run the server
        env = os.environ.copy()
        env["NODE_ENV"] = "production"
        
        # Debug before starting backend process
        self.console.print("DEBUG: Starting backend process with Node.js", style="yellow")
        
        try:
            backend_process = subprocess.Popen(
                ["node", "dist/index.js"],
                stdout=open(backend_log, 'w'),
                stderr=subprocess.STDOUT,
                env=env
            )
            
            self.backend_pid = backend_process.pid
            self.console.print(f"DEBUG: Backend process started with PID {self.backend_pid}", style="green")
            
            # Store PID for later cleanup
            with open(os.path.join(LOG_DIR, "backend.pid"), 'w') as f:
                f.write(str(self.backend_pid))
        except Exception as e:
            self.console.print(f"DEBUG: Failed to start backend process: {str(e)}", style="red")
            Prompt.ask("Press Enter to continue...", default="")
            return False
        
        # Wait for backend to be available
        backend_url = f"http://localhost:{BACKEND_PORT}"
        self.console.print(f"DEBUG: Waiting for backend at {backend_url}", style="yellow")
        
        if not self._wait_for_service(backend_url, 15):
            self.console.print("『 Backend server failed to start. Check logs for details. 』", style="red")
            self.console.print("Last lines of backend log:", style="red")
            
            try:
                with open(backend_log, 'r') as f:
                    last_lines = f.readlines()[-20:]
                    for line in last_lines:
                        self.console.print(line.rstrip(), style="red")
            except:
                self.console.print("Could not read log file", style="red")
            
            # Kill backend process
            if self.backend_pid:
                try:
                    psutil.Process(self.backend_pid).terminate()
                except:
                    pass
            
            Prompt.ask("Press Enter to continue...", default="")
            return False
        
        self.console.print(f"『 Backend server started successfully on port {BACKEND_PORT}! 』", style="green")
        
        # Start frontend
        self.console.print("『 Setting the Stage for the Frontend... 』", style="cyan")
        self.console.print(f"DEBUG: Changing directory to {FRONTEND_DIR}", style="yellow")
        
        current_dir = os.getcwd()
        os.chdir(FRONTEND_DIR)
        self.console.print(f"DEBUG: Current directory is now {os.getcwd()}", style="yellow")
        
        # Create log filename with timestamp for frontend
        frontend_log = f"../{LOG_DIR}/frontend-{timestamp}.log"
        
        env = os.environ.copy()
        
        # Start the frontend server appropriately
        try:
            if bypass_typescript and os.path.exists("dist"):
                # If bypassing TypeScript and dist exists, serve the built app
                self.console.print("DEBUG: Starting frontend with npx serve", style="yellow")
                frontend_process = subprocess.Popen(
                    ["npx", "serve", "-s", "dist", "-l", str(FRONTEND_PORT)],
                    stdout=open(frontend_log, 'w'),
                    stderr=subprocess.STDOUT,
                    env=env
                )
            else:
                # Otherwise start with npm start
                self.console.print("DEBUG: Starting frontend with npm start", style="yellow")
                env["PORT"] = str(FRONTEND_PORT)
                frontend_process = subprocess.Popen(
                    ["npm", "start"],
                    stdout=open(frontend_log, 'w'),
                    stderr=subprocess.STDOUT,
                    env=env
                )
            
            self.frontend_pid = frontend_process.pid
            self.console.print(f"DEBUG: Frontend process started with PID {self.frontend_pid}", style="green")
            
            # Store PID for later cleanup
            with open(os.path.join("..", LOG_DIR, "frontend.pid"), 'w') as f:
                f.write(str(self.frontend_pid))
        except Exception as e:
            self.console.print(f"DEBUG: Failed to start frontend process: {str(e)}", style="red")
            os.chdir(current_dir)
            Prompt.ask("Press Enter to continue...", default="")
            return False
        
        os.chdir(current_dir)
        self.console.print(f"DEBUG: Changed back to original directory: {os.getcwd()}", style="yellow")
        
        # Wait for frontend to be available
        frontend_url = f"http://localhost:{FRONTEND_PORT}"
        self.console.print(f"DEBUG: Waiting for frontend at {frontend_url}", style="yellow")
        
        if not self._wait_for_service(frontend_url, 30):
            self.console.print("『 Frontend server failed to start. Check logs for details. 』", style="red")
            self.console.print("Last lines of frontend log:", style="red")
            
            try:
                with open(frontend_log, 'r') as f:
                    last_lines = f.readlines()[-20:]
                    for line in last_lines:
                        self.console.print(line.rstrip(), style="red")
            except:
                self.console.print("Could not read log file", style="red")
            
            # Kill both processes
            if self.backend_pid:
                try:
                    psutil.Process(self.backend_pid).terminate()
                except:
                    pass
            
            if self.frontend_pid:
                try:
                    psutil.Process(self.frontend_pid).terminate()
                except:
                    pass
            
            Prompt.ask("Press Enter to continue...", default="")
            return False
        
        # Launch browser with the frontend URL
        self.console.print("DEBUG: Launching browser", style="yellow")
        self._launch_browser(frontend_url)
        
        # Show access information
        self.console.print(Panel(
            Text(f"""
            ✧･ﾟ: *✧･ﾟ:* 『 The Stage Awaits 』 *:･ﾟ✧*:･ﾟ✧
            
            Frontend Gallery: http://localhost:{FRONTEND_PORT}
            Backstage Access: http://localhost:{BACKEND_PORT}
            
            Launching dashboard for monitoring...
            Press Ctrl+C in the dashboard to return to menu
            """, justify="center"),
            style="bold cyan",
            border_style="cyan"
        ))
        
        # Start OSC monitoring
        self.console.print("DEBUG: Starting OSC monitor", style="yellow")
        self.start_osc_monitor()
        
        # Start system monitoring
        self.console.print("DEBUG: Starting system monitor", style="yellow")
        self.start_system_monitor()
        
        # Launch dashboard
        self.console.print("DEBUG: Launching dashboard", style="yellow")
        try:
            time.sleep(1)  # Give some time for services to fully initialize
            self._display_dashboard()
        except KeyboardInterrupt:
            self.console.print("DEBUG: Dashboard interrupted", style="yellow")
        finally:
            # Don't automatically stop services when exiting dashboard
            pass

    def show_menu(self):
        """Display the main menu and handle user selection."""
        while True:
            self.console.clear()
            
            # Display fancy header
            self.console.print(Panel(
                Text("\n⚡ ArtBastard DMX512FTW ⚡\n『 The Digital Luminescence Orchestra 』\n▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁\n「 Where Code Meets Light in Perfect Harmony 」\n", 
                     justify="center"),
                style="bold cyan",
                border_style="cyan"
            ))
            
            # Show explanation about the two launch options
            self.console.print(Panel(
                Text("✧･ﾟ: *✧･ﾟ:* 『 About the Launch Options 』 *:･ﾟ✧*:･ﾟ✧\n\n• 'Launch All' - Regular launch with full TypeScript checking\n• 'Bypass TypeScript' - Launches without TypeScript type checking (useful for fixing TypeScript errors)\n\nBoth options start a complete backend and frontend environment."),
                style="blue",
                border_style="blue"
            ))
            
            # Show current status
            status_table = Table(show_header=True, header_style="bold magenta")
            status_table.add_column("Service")
            status_table.add_column("Status")
            
            # Backend status
            backend_status = "✅ Running" if self.backend_pid and psutil.pid_exists(self.backend_pid) else "❌ Stopped"
            status_table.add_row("Backend", backend_status)
            
            # Frontend status
            frontend_status = "✅ Running" if self.frontend_pid and psutil.pid_exists(self.frontend_pid) else "❌ Stopped"
            status_table.add_row("Frontend", frontend_status)
            
            # OSC Monitor status
            osc_status = "✅ Running" if self.osc_server else "❌ Stopped"
            status_table.add_row("OSC Monitor", osc_status)
            
            self.console.print(Panel(status_table, title="Service Status", border_style="magenta"))
            
            # Menu options with letter keys instead of numbers
            menu_options = {
                'L': "🎭 [L]aunch All (Regular TypeScript)",
                'S': "🎪 [S]ystem Setup",
                'U': "⬆️ [U]pdate from GitHub",
                'M': "🎹 [M]IDI Information",
                'V': "📜 [V]iew Logs",
                'R': "🎨 [R]ebuild System",
                'B': "🎭✨ [B]ypass TypeScript Launch",
                'D': "📊 [D]ashboard",
                'O': "🔍 [O]SC Monitoring Toggle",
                'X': "🛑 Stop [X] All Services",
                'Q': "🌙 [Q]uit"
            }
            
            self.console.print("Choose an option by typing the letter in [brackets]:", style="bold green")
            
            # Display menu options
            for key, option in menu_options.items():
                self.console.print(f"  {option}")
            
            # Get user choice with prompt
            choice = Prompt.ask("\nEnter your choice", default="L").upper()
            
            # Check if entered choice is valid
            if choice in menu_options:
                # Handle menu selection with letter keys
                if choice == 'L':  # Launch All
                    self.console.print("\n=== Starting services ===\n", style="bold green")
                    result = self.launch_all()
                    if result is False:
                        self.console.print("\n⚠️  Services failed to start. See logs for details.", style="bold red")
                        Prompt.ask("Press Enter to continue...", default="")
                elif choice == 'S':  # System Setup
                    self.system_setup()
                elif choice == 'U':  # Update
                    self.update_from_github()
                elif choice == 'M':  # MIDI Info
                    self.show_midi_info()
                elif choice == 'V':  # View Logs
                    self.view_logs()
                elif choice == 'R':  # Rebuild
                    self.rebuild_system()
                elif choice == 'B':  # Bypass TypeScript
                    self.console.print("\n=== Starting services with TypeScript bypassed ===\n", style="bold green")
                    result = self.launch_all(bypass_typescript=True)
                    if result is False:
                        self.console.print("\n⚠️  Services failed to start. See logs for details.", style="bold red")
                        Prompt.ask("Press Enter to continue...", default="")
                elif choice == 'D':  # Dashboard
                    if not (self.backend_pid or self.frontend_pid):
                        self.console.print("No services are running. Start services first.", style="yellow")
                        time.sleep(2)
                    else:
                        # Start OSC monitoring if not already started
                        if not self.osc_server:
                            self.start_osc_monitor()
                        
                        # Start system monitoring if not already started
                        if not self.monitor_running:
                            self.start_system_monitor()
                        
                        self._display_dashboard()
                elif choice == 'O':  # Toggle OSC
                    if self.osc_server:
                        self.stop_osc_monitor()
                    else:
                        self.start_osc_monitor()
                elif choice == 'X':  # Stop Services
                    self._stop_services()
                elif choice == 'Q':  # Quit
                    # Stop services
                    self._stop_services()
                    
                    # Stop monitors
                    self.stop_osc_monitor()
                    self.stop_system_monitor()
                    
                    self.console.print("『 The stage dims, until we meet again... 』", style="bold magenta")
                    return
            else:
                self.console.print(f"Invalid choice: {choice}", style="red")
            
            # Pause for user to see results except for specific actions
            if choice not in ['L', 'B', 'D']:
                Prompt.ask("Press Enter to continue...", default="")

    def cleanup(self):
        """Clean up resources before exiting."""
        # Stop OSC server if running
        if self.osc_server:
            self.stop_osc_monitor()
        
        # Stop monitoring thread
        self.stop_system_monitor()
        
        # Check if we have saved PIDs and kill them
        pid_files = {
            "backend": os.path.join(LOG_DIR, "backend.pid"),
            "frontend": os.path.join(LOG_DIR, "frontend.pid")
        }
        
        for service, pid_file in pid_files.items():
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    
                    if psutil.pid_exists(pid):
                        try:
                            p = psutil.Process(pid)
                            p.terminate()
                            p.wait(timeout=3)
                        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired):
                            pass
                    
                    os.remove(pid_file)
                except:
                    pass
        
        # Kill any other processes on our ports
        self._kill_processes_on_ports()

def main():
    """Main entry point for the application."""
    app = ArtBastard()
    
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        print("\nCleaning up...")
        app.cleanup()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        app.show_menu()
    finally:
        app.cleanup()

if __name__ == "__main__":
    main()