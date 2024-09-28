import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { startLaserTime, listMidiInterfaces } from './index';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3001;

// Serve static files from the 'public' directory in the build folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes for the pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/midi-osc-setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'midi-osc-setup.html'));
});

app.get('/fixture-setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'fixture-setup.html'));
});

app.get('/osc-debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'osc-debug.html'));
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send available MIDI interfaces to the client
  const midiInterfaces = listMidiInterfaces();
  socket.emit('midiInterfaces', midiInterfaces.inputs);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  startLaserTime(io);
});