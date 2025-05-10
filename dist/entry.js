"use strict";
// This is the main entry point for the ArtBastard DMX512FTW server application
// It provides a clear startup path for the application
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
// Log server startup
(0, logger_1.log)('🚀 Starting ArtBastard DMX512FTW server...');
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
