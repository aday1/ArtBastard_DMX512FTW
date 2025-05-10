"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableConsoleLogging = exports.enableLogging = exports.log = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Constants for logging
const LOGS_DIR = path_1.default.join(__dirname, '..', 'logs');
const LOG_FILE = path_1.default.join(LOGS_DIR, 'app.log');
let isLoggingEnabled = true;
let isConsoleLoggingEnabled = true;
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    if (isLoggingEnabled) {
        try {
            // Ensure logs directory exists
            if (!fs_1.default.existsSync(LOGS_DIR)) {
                try {
                    fs_1.default.mkdirSync(LOGS_DIR, { recursive: true });
                }
                catch (error) {
                    console.error(`Failed to create logs directory: ${error}`);
                }
            }
            // Check if log file is accessible/writeable
            fs_1.default.appendFileSync(LOG_FILE, logMessage);
        }
        catch (error) {
            console.error(`Error writing to log file: ${error}`);
            // Write to console if file logging fails
            console.log(logMessage);
        }
    }
    if (isConsoleLoggingEnabled) {
        console.log(message);
    }
}
exports.log = log;
function enableLogging(enable) {
    isLoggingEnabled = enable;
}
exports.enableLogging = enableLogging;
function enableConsoleLogging(enable) {
    isConsoleLoggingEnabled = enable;
}
exports.enableConsoleLogging = enableConsoleLogging;
