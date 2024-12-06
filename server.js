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
// In-memory storage for user profile pictures
let userProfilePics = {};  // Keyed by username

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
    messages.push(message);  // Store the message in the array
    io.emit('newMessage', message);  // Broadcast to all clients
  });

  // Listen for an edit message request from a client
  socket.on('editMessage', (messageData) => {
    const index = messages.findIndex(msg => msg.messageId === messageData.messageId);
    if (index !== -1) {
      messages[index].message = messageData.newMessage;
      io.emit('editedMessage', messages[index]);
    }
  });

  // Listen for a delete message request from a client
  socket.on('deleteMessage', (messageId) => {
    const index = messages.findIndex(msg => msg.messageId === messageId);
    if (index !== -1) {
      messages.splice(index, 1);
      io.emit('deletedMessage', messageId);  // Broadcast deletion to all clients
    }
  });

  // Handle profile picture upload
  socket.on('uploadProfilePic', (picData) => {
    const userName = picData.userName;
    userProfilePics[userName] = picData.picUrl;  // Store the uploaded profile picture
    console.log(`Profile picture uploaded for ${userName}: ${picData.picUrl}`);

    // Send the updated profile picture URL back to the client
    io.emit('profilePicUpdated', { userName, picUrl: picData.picUrl });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
