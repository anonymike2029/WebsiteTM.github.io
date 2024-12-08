const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // To generate unique message IDs
const fs = require('fs'); // File system module to read/write the JSON file

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 8000;

// Path to the names.json file
const namesFilePath = path.join(__dirname, 'names.json');

// Read the names from the names.json file
let takenNames = [];
if (fs.existsSync(namesFilePath)) {
  const rawData = fs.readFileSync(namesFilePath);
  takenNames = JSON.parse(rawData);
}

// In-memory storage for messages
let messages = [];

// Serve static files (e.g., front-end)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to handle JSON data
app.use(express.json());

// Route to check if a name is taken and set the user's name
app.post('/set-name', (req, res) => {
  const { userName } = req.body;

  if (!userName || takenNames.includes(userName)) {
    return res.status(400).json({ success: false, message: 'Name already taken or invalid.' });
  }

  // Add the new username to the takenNames array
  takenNames.push(userName);

  // Save the updated list of names to names.json
  fs.writeFileSync(namesFilePath, JSON.stringify(takenNames, null, 2));

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

    // Correct time format using the system's local time zone
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newMessage = { ...message, messageId, time: formattedTime };

    // Add the new message to the messages array
    messages.push(newMessage);

    // Broadcast the new message to all connected clients
    io.emit('newMessage', newMessage);
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
      messages.splice(index, 1); // Remove the message
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
     
