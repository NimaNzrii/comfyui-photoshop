import { app as app } from "../../../scripts/app.js";
import { api as api } from "../../../scripts/api.js";
import { sendMsg, addListener } from "./connection.js";

let QuickEdit_LoadImage = "";
let workflowSwitcher = "";
let rndrModeSwitcher = "";

addListener("photoshopConnected", () => {
  console.log("🔹photoshopConnected");
  try {
    if (workflowSwitcher) sendMsg("Send_workflow", SwitcherWidgetNames(workflowSwitcher));
    if (rndrModeSwitcher) sendMsg("Send_rndrMode", SwitcherWidgetNames(rndrModeSwitcher));
  } catch (error) {
    console.error("🔹 Error in photoshopConnected listener:", error);
  }
});

addListener("workflow", (data) => {
  try {
    workflowSwitcher.widgets[data].callback();
  } catch (error) {
    console.error("🔹 Error in workflow listener:", error);
  }
});

addListener("alert", (data) => {
  try {
    alert(data);
  } catch (error) {
    console.error("🔹 Error in alert listener:", error);
  }
});

addListener("queue", (data) => {
  try {
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
        console.log("🔹 Photoshop Node doesn't Exist");
      }
    }
  } catch (error) {
    console.error("🔹 Error in queue listener:", error);
  }
});

addListener("rndrMode", (data) => {
  try {
    rndrModeSwitcher.widgets[data].callback();
  } catch (error) {
    console.error("🔹 Error in rndrMode listener:", error);
  }
});

const search4type = (type) => {
  try {
    return app.graph._nodes.find((node) => node.type === type);
  } catch (error) {
    console.error("🔹 Error in search4type:", error);
  }
};
const search4typeMulti = (type) => {
  try {
    return app.graph._nodes.filter((node) => node.type === type);
  } catch (error) {
    console.error("🔹 Error in search4type:", error);
  }
};
const search4class = (type) => {
  return app.graph._nodes.find((node) => node.class === type);
};

const search4title = (title) => {
  try {
    return app.graph._nodes.find((node) => node.title === title);
  } catch (error) {
    console.error("🔹 Error in search4title:", error);
  }
};

const search4titlestartwith = (title) => {
  try {
    return app.graph._nodes.find((node) => node.title.startsWith(title));
  } catch (error) {
    console.error("🔹 Error in search4titlestartwith:", error);
  }
};

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
    console.error("🔹 Error in SwitcherWidgetNames:", error);
  }
};

// Register extension with ComfyUI
app.registerExtension({
  name: "PhotoshopToComfyUINode",
  async beforeRegisterNodeDef(nodeType, nodeInfo, appInstance) {
    if (nodeInfo.category === "Photoshop") {
      appendMenuOption(nodeType, (_, menuOptions) => {
        menuOptions.unshift({
          content: "🔹 Install PS Plugin V1.6.0 (auto)🔮",
          callback: () => sendMsg("install_plugin"),
        });
      });
    }
  },

  onProgressUpdate(event) {
    try {
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
    } catch (error) {
      console.error("🔹 Error in onProgressUpdate:", error);
    }
  },

  async nodeCreated(node) {
    try {
      if (!workflowSwitcher) {
        const nodes = search4typeMulti("Fast Groups Muter (rgthree)");
        nodes.forEach((node) => {
          if (node.color === "#2b4557" || node.bgcolor === "#2b4557" || node.title === "📁 WorkFlows") {
            workflowSwitcher = node;
            console.log("workflowSwitcher: ", workflowSwitcher);
            return;
          }
        });
      }

      if (!rndrModeSwitcher) {
        const nodes = search4typeMulti("Fast Groups Muter (rgthree)");
        nodes.forEach((node) => {
          if (node.color === "#4e5e4e" || node.bgcolor === "#4e5e4e" || node.title === "⚙️ Render Setting") {
            rndrModeSwitcher = node;
            console.log("rndrModeSwitcher: ", rndrModeSwitcher);
            return;
          }
        });
      }
    } catch (error) {
      console.error("🔹 Error in nodeCreated:", error);
    }
  },
});

async function getWorkflow(name) {
  try {
    console.log("name: ", name);
    const response = await api.fetchApi(`/ps/workflows/${encodeURIComponent(name)}`, { cache: "no-store" });
    console.log("response: ", response);
    return await response.json();
  } catch (error) {
    console.error("🔹 Error in getWorkflow:", error);
  }
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
  try {
    genrateStatus = "genrating";
    sendMsg("render_status", "genrating");
  } catch (error) {
    console.error("🔹 Error in execution_start listener:", error);
  }
});
api.addEventListener("executing", ({ detail }) => {
  try {
    if (!detail) {
      genrateStatus = "genrated";
      isProcessing = false;
      sendMsg("render_status", "genrated");
    }
  } catch (error) {
    console.error("🔹 Error in executing listener:", error);
  }
});
api.addEventListener("execution_error", ({ detail }) => {
  try {
    genrateStatus = "genrate_error";
    sendMsg("render_status", "genrate_error");
  } catch (error) {
    console.error("🔹 Error in execution_error listener:", error);
  }
});
api.addEventListener("progress", ({ detail: { value, max } }) => {
  try {
    let progress = Math.floor((value / max) * 100);
    if (!isNaN(progress) && progress >= 0 && progress <= 100) {
      sendMsg("progress", progress);
    }
  } catch (error) {
    console.error("🔹 Error in progress listener:", error);
  }
});

export function appendMenuOption(nodeType, callbackFn) {
  const originalMenuOptions = nodeType.prototype.getExtraMenuOptions;
  nodeType.prototype.getExtraMenuOptions = function () {
    const options = originalMenuOptions.apply(this, arguments);
    callbackFn.apply(this, arguments);
    return options;
  };
}
