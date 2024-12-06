const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 8000;

// In-memory storage for taken names (you could use a database in production)
let takenNames = [];
// In-memory storage for messages
let messages = [];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to handle JSON data
app.use(express.json());

// Route to check if a name is taken and to set the user's name
app.post('/set-name', (req, res) => {
  const { userName } = req.body;

  // Check if the name is valid
  if (!userName || takenNames.includes(userName)) {
    return res.status(400).json({ success: false, message: 'Name already taken or invalid.' });
  }

  takenNames.push(userName); // Save name to the list
  res.status(200).json({ success: true, userName });
});

// Default route to serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket to handle real-time chat messages
io.on('connection', (socket) => {
  console.log('A user connected');
  
  // Send all previous messages to the newly connected client
  socket.emit('previousMessages', messages);

  // Listen for new chat messages from a user
  socket.on('sendMessage', (message) => {
    // Add the new message to the messages array
    messages.push(message);

    // Broadcast the message to all connected clients
    io.emit('newMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
