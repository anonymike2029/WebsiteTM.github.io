const socket = io();  // Connect to Socket.IO server
let username = "";

// Handle Enter button click event
document.getElementById("enterButton").addEventListener("click", () => {
  username = document.getElementById("nameInput").value.trim();
  if (username) {
    // Hide the welcome screen and show the chat screen
    document.getElementById("welcomeScreen").style.display = "none";
    document.getElementById("chatScreen").style.display = "flex";
  }
});

// Send message to server when the Enter key is pressed in the message input box
function sendMessage(event) {
  if (event.key === "Enter") {
    const message = document.getElementById("messageInput").value.trim();
    if (message) {
      socket.emit("send-message", { user: username, content: message });
      document.getElementById("messageInput").value = ""; // Clear input
    }
  }
}

// Listen for incoming messages and display them
socket.on("receive-message", (message) => {
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  // Add a class to differentiate between self and other users
  if (message.user === username) {
    messageDiv.classList.add("self");
  } else {
    messageDiv.classList.add("other");
  }

  messageDiv.textContent = `${message.user}: ${message.content}`;
  document.getElementById("chatBox").appendChild(messageDiv);

  // Scroll to the bottom of the chat box
  document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
});
