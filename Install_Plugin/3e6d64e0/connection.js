let workflowList = null;
ipField.value = "127.0.0.1";
let socket;
let connectState = false;
let changeip = false;
let connectionCheckInterval;

// Generate a unique client ID
const generateClientId = () => {
  return `client-${Math.random().toString(36).substr(2, 9)}`;
};

const clientId = generateClientId();

// Initialize WebSocket
const initWebSocket = async () => {
  if (connectState) {
    console.log("Closing existing socket...");
    await closeSocket();
  }

  try {
    console.log("Attempting to connect to IP:", ipField.value);
    socket = new WebSocket(`ws://${ipField.value}:8188/ps/ws?clientId=${clientId}&platform=ps`);
    console.log(`ws://${ipField.value}:8188?clientId=${clientId}&platform=ps`);
    socket.addEventListener("open", handleSocketOpen);
    socket.addEventListener("message", handleSocketMessage);
    socket.addEventListener("close", handleSocketClose);

    // Periodic check for connection
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    connectionCheckInterval = setInterval(checkConnectionStatus, 5000);
  } catch (error) {
    updateIPStatus("Not Connected");
    console.error("Exception:", error);
    connectState = false;
  }
};

// Check connection status periodically
const checkConnectionStatus = () => {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    console.error("Socket appears to be disconnected, attempting to reconnect...");
    connectState = false;
    updateIPStatus("Not Connected");

    if (!changeip) {
      initWebSocket();
    }
  }
};

// Handle WebSocket open event
const handleSocketOpen = (event) => {
  connectState = true;
  console.log("Connected to", ipField.value);
  updateIPStatus("Connected");
};

// Handle WebSocket message event
const handleSocketMessage = async (event) => {
  const msg = JSON.parse(event.data);
  console.log("Received message:", msg);

  if (msg.render) {
    saveBase64AsPngFile(msg.render, "render.png");
    progressBar.style.width = "0%";
    progressBarBack.classList.add("hidden");
  }

  if (msg.comfyuiConnected) return;

  if (msg.node) createSetting(msg.node);

  if (msg.render_status === "generating") {
    progressBarBack.classList.remove("hidden");
  }

  if (msg.progress) {
    progressBar.style.width = `${msg.progress}%`;
  }

  if (msg.Send_workflow) {
    updateDropdown(workFlowOptions, msg.Send_workflow, "Preset: ", workFlowDropDown);
  }

  if (msg.Send_rndrMode) {
    updateDropdown(rndrModeOptions, msg.Send_rndrMode, "Render: ", rndrModeDropDown);
  }
};

// Update dropdown options
const updateDropdown = (dropdown, list, placeholderPrefix, dropDownElement) => {
  try {
    let htmlChange = "";
    list.forEach((item) => {
      htmlChange += `<sp-menu-item>${item.name}</sp-menu-item>`;
      if (item.selected) {
        dropDownElement.placeholder = placeholderPrefix + item.name;
      }
    });
    dropdown.innerHTML = htmlChange;
  } catch (error) {
    console.error("Error:", error);
  }
};

// Handle WebSocket close event
const handleSocketClose = async (event) => {
  await closeSocket();
  connectState = false;
  console.error(`Socket closed. Disconnected from ${ipField.value}:8188`);
  updateIPStatus("Not Connected");

  if (!changeip) {
    setTimeout(() => {
      console.log(`Trying to reconnect to ${ipField.value}:8188`);
      initWebSocket();
    }, 5000);
  }

  changeip = false;
};

// Close WebSocket connection
const closeSocket = async () => {
  if (socket) {
    socket.removeEventListener("close", handleSocketClose);
    socket.removeEventListener("message", handleSocketMessage);
    socket.removeEventListener("open", handleSocketOpen);
    socket.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    socket = null;
  }
};

// Send message through WebSocket
const sendMessage = async (name, message = true) => {
  console.log("message: ", message);
  console.log("name: ", name);
  if (connectState) {
    socket.send(JSON.stringify({ [name]: message }));
  } else {
    updateIPStatus("Not Connected");
    console.log("Not connected");
  }
};

// Apply new IP address
ipApplyButton.addEventListener("click", async () => {
  try {
    if (ipField.value === "") ipResetButton.click();
    await saveConfigFile();
    console.log(`Applying new IP: ${ipField.value}`);
    UpdateWebview();
    await initWebSocket();
  } catch (error) {
    console.error("Exception:", error);
    connectState = false;
  }
});

// Reset IP address to default
ipResetButton.addEventListener("click", async () => {
  ipField.value = "127.0.0.1";
  changeip = true;
  UpdateWebview();
  await saveConfigFile();
  console.log(`Reset IP: ${ipField.value}`);
  await initWebSocket();
});

// Close WebSocket before unloading the page
window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.close();
    updateIPStatus("Not Connected");
  }
});
