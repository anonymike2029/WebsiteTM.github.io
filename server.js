const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // To generate unique message IDs

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 8000;

// In-memory storage for taken names
let takenNames = [];
let messages = [];

// Serve static files (e.g., for the front-end)
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
    const messageId = uuidv4(); // Generate a unique message ID
    const newMessage = { ...message, messageId, time: new Date().toLocaleTimeString() };
    
    // Add the new message to the messages array
    messages.push(newMessage);

    // Broadcast the new message to all connected clients
    io.emit('newMessage', newMessage);
  });

  // Listen for an edit message request from a client
  socket.on('editMessage', (messageData) => {
    // Find the message by its messageId and update the message content
    const index = messages.findIndex(msg => msg.messageId === messageData.messageId);
    if (index !== -1) {
      messages[index].message = messageData.newMessage;

      // Broadcast the edited message to all clients
      io.emit('editedMessage', messages[index]);
    }
  });

  // Listen for a delete message request from a client
  socket.on('deleteMessage', (messageId) => {
    // Find the index of the message to delete
    const index = messages.findIndex(msg => msg.messageId === messageId);
    
    if (index !== -1) {
      // Remove the message from the messages array
      messages.splice(index, 1);

      // Broadcast the deleted message ID to all clients so they can remove it from their view
      io.emit('deletedMessage', messageId);
    } else {
      console.log(`Message with ID ${messageId} not found`);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
