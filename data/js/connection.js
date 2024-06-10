let socket = null;
let photoshopConnected = false;
let listeners = {};

// Function to establish WebSocket connection
function connect() {
  try {
    socket = new WebSocket("ws://127.0.0.1:8765");
    socket.addEventListener("open", () => {
      console.log("🔹 Connected to the server.");
      socket.send("imComfyui");
    });
    socket.addEventListener("message", (event) => {
      let message = JSON.parse(event.data);
      // console.log(message);
      handleMessage(message);
    });
    socket.addEventListener("close", () => {
      console.error("Trying again");
      setTimeout(connect, 5000);
    });
  } catch {
    setTimeout(connect, 5000);
  }
}

function handleMessage(message) {
  for (let [type, callback] of Object.entries(listeners)) {
    if (message[type] !== undefined) {
      callback(message[type]);
    }
  }
}

function sendMsg(type, data) {
  if (!data) data = true;
  try {
    socket.send(JSON.stringify({ [type]: data }));
    // console.log("sent ", type, data);
  } catch (error) {
    console.error("🔹Error sending message:", error);
  }
}

function addListener(type, callback) {
  listeners[type] = callback;
}

export { connect, sendMsg, addListener, photoshopConnected };
