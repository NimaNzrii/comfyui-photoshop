let socket = null;
let listeners = {};

function connect() {
  try {
    socket = new WebSocket("ws://" + window.location.hostname + ":8188/ps/ws?platform=cm&clientId=" + generateClientId());

    socket.addEventListener("open", () => {
      console.log("🔹 Connected to the server.");
    });

    socket.addEventListener("message", (event) => {
      try {
        let message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error("🔹 Error parsing message:", error, event.data);
      }
    });

    socket.addEventListener("close", (event) => {
      console.warn("🔹 Connection closed. Reconnecting...", event);
      setTimeout(connect, 5000);
    });

    socket.addEventListener("error", (error) => {
      console.error("🔹 WebSocket error:", error);
      socket.close(); // Close the socket and trigger the reconnect logic
    });
  } catch (error) {
    console.error("🔹 Error establishing WebSocket connection:", error);
    setTimeout(connect, 5000);
  }
}

// Function to generate a unique client ID
function generateClientId() {
  return "cm-" + Math.random().toString(36).substr(2, 9);
}

function handleMessage(message) {
  for (let [type, callback] of Object.entries(listeners)) {
    if (message[type] !== undefined) {
      try {
        callback(message[type]);
      } catch (error) {
        console.error(`🔹 Error handling message of type ${type}:`, error);
      }
    }
  }
}

function sendMsg(type, data) {
  if (!data) data = true;
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ [type]: data }));
    } else {
      console.warn("🔹 WebSocket is not open. Message not sent:", type, data);
    }
  } catch (error) {
    console.error("🔹 Error sending message:", error);
  }
}

function addListener(type, callback) {
  listeners[type] = callback;
}

// Export functions for external use
export { connect, sendMsg, addListener };
