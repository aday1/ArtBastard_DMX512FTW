import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { startLaserTime, listMidiInterfaces, connectMidiInput, disconnectMidiInput } from './index';
import { apiRouter, setupSocketHandlers } from './api';

// Declare global io instance for use in API routes
declare global {
  var io: Server;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3001;

// Set up API routes
app.use('/api', apiRouter);

// Serve static files from the React app with no caching
app.use(express.static(path.join(__dirname, '..', 'react-app', 'dist'), {
  setHeaders: (res, path) => {
    // Disable caching for all static files
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// For backward compatibility, also serve the original public directory
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// For any routes not handled by specific endpoints, serve the React app
app.get('*', (req, res) => {
  const reactAppPath = path.join(__dirname, '..', 'react-app', 'dist', 'index.html');
  
  // Check if the React app is built
  if (fs.existsSync(reactAppPath)) {
    res.sendFile(reactAppPath);
  } else {
    // If React app is not built, redirect to the original interface
    console.log('React app not built. Redirecting to original interface.');
    res.redirect('/public');
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send available MIDI interfaces to the client
  const midiInterfaces = listMidiInterfaces();
  console.log('MIDI interfaces found:', midiInterfaces.inputs);
  socket.emit('midiInterfaces', midiInterfaces.inputs);

  // Handle MIDI interface selection
  socket.on('selectMidiInterface', (interfaceName) => {
    console.log(`Selecting MIDI interface: ${interfaceName}`);
    connectMidiInput(io, interfaceName);
  });

  // Handle MIDI interface disconnection
  socket.on('disconnectMidiInterface', (interfaceName) => {
    console.log(`Disconnecting MIDI interface: ${interfaceName}`);
    disconnectMidiInput(io, interfaceName);
  });

  // Handle request for refreshing MIDI interfaces
  socket.on('getMidiInterfaces', () => {
    const midiInterfaces = listMidiInterfaces();
    socket.emit('midiInterfaces', midiInterfaces.inputs);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Set up additional Socket.IO handlers from API
setupSocketHandlers(io);

// Start the server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`React app available at http://localhost:${port}`);
  console.log(`Original interface available at http://localhost:${port}/public`);
  startLaserTime(io);
});