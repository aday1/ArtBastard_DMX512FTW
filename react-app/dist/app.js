// Minimal fallback app.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('Fallback app.js loaded');
  
  // Try to initialize Socket.IO connection
  try {
    const socket = io();
    
    socket.on('connect', () => {
      console.log('Socket connected!');
      document.querySelector('.container').innerHTML += '<p style="color: #4caf50">Socket connection established</p>';
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      document.querySelector('.container').innerHTML += '<p style="color: #ff4d4d">Socket disconnected</p>';
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  } catch (err) {
    console.error('Socket initialization error:', err);
  }
});