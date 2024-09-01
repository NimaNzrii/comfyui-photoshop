import { app as app } from "../../../scripts/app.js";
import { api as api } from "../../../scripts/api.js";
import { sendMsg, addListener } from "./connection.js";
import { photoshopNode } from "./nodestyle.js";

export const nodever = "1.9.3";
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
      if (photoshopNode.length > 0) {
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
          content: "🔹 Install PS Plugin V" + nodever,
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
        let errorText = `${prompt.errorDetails?.exception_type} ${prompt.errorDetails?.node_id || ""} ${
          prompt.errorDetails?.node_type || ""
        }`;
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
        if (
          node.comfyClass == "Fast Groups Muter (rgthree)" &&
          ((await node.color) == "#2b4557" ||
            (await node.bgcolor) == "#2b4557" ||
            (await node?.title?.startsWith("📁")))
        ) {
          workflowSwitcher = node;
          console.log("🔹 workflowSwitcher detected: ", workflowSwitcher);
          workflowswitcherchecker();
          return;
        }
      }

      if (!rndrModeSwitcher) {
        if (
          node.comfyClass == "Fast Groups Muter (rgthree)" &&
          ((await node.color) == "#4e5e4e" ||
            (await node.bgcolor) == "#4e5e4e" ||
            (await node?.title?.startsWith("⚙️")))
        ) {
          rndrModeSwitcher = node;
          console.log("🔹 rndrModeSwitcher detected: ", rndrModeSwitcher);
          rndrswitcherchecker();
          return;
        }
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
  const supportedLocales = ["ja-JP", "ko-KR", "zh-TW", "zh-CN"];
  let currentLocale = localStorage.getItem("AGL.Locale");

  if (!supportedLocales.includes(currentLocale)) {
    currentLocale = "en-US";
  }

  console.log("🔹 Load workflow for this language:", currentLocale);
  workflowName = workflowName + "_" + currentLocale;
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

function workflowswitcherchecker() {
  let previousWorkflowWidgets = JSON.stringify(workflowSwitcher?.widgets);

  setInterval(() => {
    try {
      const currentWorkflowWidgets = JSON.stringify(workflowSwitcher?.widgets);
      if (currentWorkflowWidgets !== previousWorkflowWidgets) {
        console.log("Workflow switcher widgets have changed");
        sendMsg("Send_workflow", SwitcherWidgetNames(workflowSwitcher));
        previousWorkflowWidgets = currentWorkflowWidgets;
      }
    } catch (error) {
      console.error("🔹 Error in workflow switcher widget change detection:", error);
    }
  }, 3000);
}

function rndrswitcherchecker() {
  let previousRndrModeWidgets = JSON.stringify(rndrModeSwitcher?.widgets);

  setInterval(() => {
    try {
      const currentRndrModeWidgets = JSON.stringify(rndrModeSwitcher?.widgets);
      if (currentRndrModeWidgets !== previousRndrModeWidgets) {
        console.log("Render mode switcher widgets have changed");
        sendMsg("Send_rndrMode", SwitcherWidgetNames(rndrModeSwitcher));
        previousRndrModeWidgets = currentRndrModeWidgets;
      }
    } catch (error) {
      console.error("🔹 Error in render mode switcher widget change detection:", error);
    }
  }, 3000);
}
