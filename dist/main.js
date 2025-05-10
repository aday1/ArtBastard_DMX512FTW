"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Main entry point for the ArtBastard DMX512FTW application
const logger_1 = require("./logger");
(0, logger_1.log)('🚀 Starting ArtBastard DMX512FTW server from main entry point...');
try {
    // Import the server module which starts the Express and Socket.IO server
    require('./server');
    // Log successful startup
    (0, logger_1.log)('✅ Server modules loaded successfully');
}
catch (error) {
    // Log any startup errors
    (0, logger_1.log)(`❌ ERROR during server startup: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
        (0, logger_1.log)(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
}
