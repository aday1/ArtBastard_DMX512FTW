// Main entry point for the ArtBastard DMX512FTW application
import { log } from './logger';

log('🚀 Starting ArtBastard DMX512FTW server from main entry point...');

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
