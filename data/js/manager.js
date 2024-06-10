import { app as app } from "../../../scripts/app.js";
import { api as api } from "../../../scripts/api.js";
import { connect, sendMsg, addListener, photoshopConnected } from "./connection.js";

let QuickEdit_LoadImage = "";
let workflowSwitcher = "";
let rndrModeSwitcher = "";

addListener("photoshopConnected", () => {
  if (rndrModeSwitcher) sendMsg("Send_workflow", SwitcherWidgetNames(workflowSwitcher));
  if (rndrModeSwitcher) sendMsg("Send_rndrMode", SwitcherWidgetNames(rndrModeSwitcher));
});

addListener("quickSave", () => {
  RefreshPreviews();
});

addListener("workflow", (data) => {
  workflowSwitcher.widgets[data].callback();
});

addListener("alert", (data) => {
  alert(data);
});

addListener("queue", (data) => {
  if (!isProcessing) {
    if (search4title("🔹Photoshop ComfyUI Plugin")) {
      isProcessing = true;
      (function processQueue() {
        if (genrateStatus == "genrated") {
          app.queuePrompt();
          isProcessing = false;
        } else {
          setTimeout(processQueue, 100);
        }
      })();
    } else {
      console.log("🔹Photoshop Node doesn't Exist");
    }
  }
});

addListener("rndrMode", (data) => {
  rndrModeSwitcher.widgets[data].callback();
});

function RefreshPreviews() {
  let nodes = app.graph._nodes.filter((node) => node.imgs !== undefined);
  for (let node of nodes) {
    node.imgs[0].src = node.imgs[0].src + "1";
  }
}

const search4type = (type) => app.graph._nodes.find((node) => node.type === type);
const search4title = (title) => app.graph._nodes.find((node) => node.title === title);
const search4titlestartwith = (title) => app.graph._nodes.find((node) => node.title.startsWith(title));

const SwitcherWidgetNames = (switcher) => {
  try {
    let widgetNames = [];
    let widgets = switcher.widgets;
    widgets.forEach((widget) => {
      if (widget.value) {
        widgetNames.push({ name: String(widget.name.replace("Enable ", "")), selected: true });
      } else {
        widgetNames.push({ name: String(widget.name.replace("Enable ", "")) });
      }
    });
    return widgetNames;
  } catch (error) {
    console.error("🔹Error in SwitcherWidgetNames:", error);
  }
};

// Register extension with ComfyUI
app.registerExtension({
  name: "PhotoshopToComfyUINode",
  onProgressUpdate(event) {
    if (!this.connected) return;
    let prompt = event.detail.prompt;
    this.currentPromptExecution = prompt;
    if (prompt?.errorDetails) {
      let errorText = `${prompt.errorDetails?.exception_type} ${prompt.errorDetails?.node_id || ""} ${prompt.errorDetails?.node_type || ""}`;
      this.progressTextEl.innerText = errorText;
      this.progressNodesEl.classList.add("-error");
      this.progressStepsEl.classList.add("-error");
      return;
    }
  },
  async nodeCreated(node) {
    if (!workflowSwitcher) {
      workflowSwitcher = search4title("📁 WorkFlows");
    }
    if (!rndrModeSwitcher) {
      rndrModeSwitcher = search4title("⚙️ Render Setting");
    }
    if (node?.comfyClass === "🔹Photoshop ComfyUI Plugin") {
      connect();
    }
  },
});

async function getWorkflow(name) {
  console.log("name: ", name);
  const response = await api.fetchApi(`/PSworkflows/${encodeURIComponent(name)}`, { cache: "no-store" });
  console.log("response: ", response);
  return await response.json();
}

export async function loadWorkflow(workflowName) {
  try {
    const workflowData = await getWorkflow(workflowName);
    app.loadGraphData(workflowData);
  } catch (error) {
    console.error(`Failed to load workflow ${workflowName}:`, error);
    alert(`Failed to load workflow ${workflowName}`);
  }
}

let genrateStatus = "genrated";
let isProcessing = false;

api.addEventListener("execution_start", ({ detail }) => {
  genrateStatus = "genrating";
  sendMsg("render_status", "genrating");
});
api.addEventListener("executing", ({ detail }) => {
  if (!detail) {
    genrateStatus = "genrated";
    isProcessing = false;
    sendMsg("render_status", "genrated");
  }
});
api.addEventListener("execution_error", ({ detail }) => {
  genrateStatus = "genrate_error";
  sendMsg("render_status", "genrate_error");
});
api.addEventListener("progress", ({ detail: { value, max } }) => {
  let progress = Math.floor((value / max) * 100);
  if (!isNaN(progress) && progress >= 0 && progress <= 100) {
    sendMsg("progress", progress);
  }
});
