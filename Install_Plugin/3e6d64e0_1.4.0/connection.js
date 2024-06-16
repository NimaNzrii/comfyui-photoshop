let workflowList = null;
ipField.value = "127.0.0.1";
let socket;
let connectState = false;
let changeip = false;
let connectionCheckInterval;

const initWebSocket = async () => {
  if (connectState) {
    console.log("Closing existing socket...");
    socket.removeEventListener("close", handleSocketClose);
    socket.removeEventListener("message", handleSocketMessage);
    socket.removeEventListener("open", handleSocketOpen);
    socket.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    socket = null;
    updateIPStatus("Not Connected");
  }

  try {
    console.log("Attempting to connect to IP:", ipField.value);
    socket = new WebSocket(`ws://${ipField.value}:8765`);
    socket.addEventListener("open", handleSocketOpen);
    socket.addEventListener("message", handleSocketMessage);
    socket.addEventListener("close", handleSocketClose);

    // Add a periodic check for connection
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

const handleSocketOpen = (event) => {
  connectState = true;
  console.log("connectState: ", connectState);
  socket.send("imPhotoshop");
  console.log(`Connected to ${ipField.value}`);
  updateIPStatus("Connected");
};

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
  if (msg.progress) progressBar.style.width = `${msg.progress}%`;

  if (msg.Send_workflow) {
    try {
      let htmlChange = "";
      workflowList = msg.Send_workflow;

      workflowList.forEach((workflow) => {
        htmlChange += `<sp-menu-item>${workflow.name}</sp-menu-item>`;
        if (workflow.selected) {
          workFlowDropDown.placeholder = "Preset: " + workflow.name;
        }
      });
      workFlowOptions.innerHTML = htmlChange;
    } catch (error) {
      console.error("Error:", error);
    }
  }
  if (msg.Send_rndrMode) {
    try {
      let htmlChange = "";
      const renderModeList = msg.Send_rndrMode;

      renderModeList.forEach((workflow) => {
        htmlChange += `<sp-menu-item>${workflow.name}</sp-menu-item>`;
        if (workflow.selected) rndrModeDropDown.placeholder = "Render: " + workflow.name;
      });
      rndrModeOptions.innerHTML = htmlChange;
      console.log("Updated render mode options:", htmlChange);
    } catch (error) {
      console.error("Error:", error);
    }
  }
};

const handleSocketClose = async (event) => {
  await closeSocket();
  connectState = false;
  console.error(`Socket closed. Disconnected from ${ipField.value}:8765`);
  updateIPStatus("Not Connected");
  if (!changeip) {
    setTimeout(() => {
      console.log(`Trying to reconnect to ${ipField.value}:8765`);
      initWebSocket();
    }, 5000);
  }
  changeip = false;
};

const sendMessage = async (name, message) => {
  if (connectState) {
    if (name === "queue") {
      message = true;
      console.log("queeeeeeeeeeeeeeeeeeeeeeeeeeeeeee: ");
    }
    socket.send(JSON.stringify({ [name]: message }));
  } else {
    updateIPStatus("Not Connected");
    console.log("Not connected");
  }
};

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

ipResetButton.addEventListener("click", async () => {
  ipField.value = "127.0.0.1";
  changeip = true;
  UpdateWebview();
  await saveConfigFile();
  console.log(`Reset IP: ${ipField.value}`);
  await initWebSocket();
});

window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.close();
    updateIPStatus("Not Connected");
  }
});
