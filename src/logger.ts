import fs from 'fs';
import path from 'path';

// Constants for logging
const LOGS_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'app.log');

let isLoggingEnabled = true;
let isConsoleLoggingEnabled = true;

export function log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;

    if (isLoggingEnabled) {
        try {
            // Ensure logs directory exists
            if (!fs.existsSync(LOGS_DIR)) {
                try {
                    fs.mkdirSync(LOGS_DIR, { recursive: true });
                } catch (error) {
                    console.error(`Failed to create logs directory: ${error}`);
                }
            }
            
            // Check if log file is accessible/writeable
            fs.appendFileSync(LOG_FILE, logMessage);
        } catch (error) {
            console.error(`Error writing to log file: ${error}`);
            // Write to console if file logging fails
            console.log(logMessage);
        }
    }

    if (isConsoleLoggingEnabled) {
        console.log(message);
    }
}

export function enableLogging(enable: boolean): void {
    isLoggingEnabled = enable;
}

export function enableConsoleLogging(enable: boolean): void {
    isConsoleLoggingEnabled = enable;
}