// This is the main entry point for the ArtBastard DMX512FTW server application
// It provides a clear startup path for the application

import { log } from './logger';

// Log server startup
log('🚀 Starting ArtBastard DMX512FTW server...');

try {
  // Import the server module which starts the Express and Socket.IO server
  require('./server');
  
  // Log successful startup
  log('✅ Server modules loaded successfully');
} catch (error) {
  // Log any startup errors
  log(`❌ ERROR during server startup: ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof Error && error.stack) {
    log(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}