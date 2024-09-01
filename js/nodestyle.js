import { connect, sendMsg } from "./connection.js";
import { loadWorkflow, nodever } from "./manager.js";
import { app as app } from "../../../scripts/app.js";
import { api as api } from "../../../scripts/api.js";

export let photoshopNode = [];
let setupdone = false;
let connectdone = false;
let disabledrow = false;
const canvasImage = await api.fetchApi(`/ps/inputs/PS_canvas.png`);
const maskImage = await api.fetchApi(`/ps/inputs/PS_mask.png`);

function setBackgroundImageContain(node, canvasUrl, maskUrl) {
  if (node.mode === 2) {
    return;
  }

  const fetchImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => reject(`Failed to load image: ${url}`);
    });
  };

  Promise.all([fetchImage(canvasUrl), fetchImage(maskUrl)])
    .then(([canvasImg, maskImg]) => {
      const drawImage = () => {
        if (!disabledrow) {
          if (node.properties && node.properties["Disable Preview"]) {
            node.onDrawBackground = null;
            node.setDirtyCanvas(true, true);
            return;
          }

          const aspectRatio = canvasImg.width / canvasImg.height;
          const nodeAspectRatio = node.size[0] / node.size[1];

          let drawWidth, drawHeight, drawX, drawY;
          if (aspectRatio > nodeAspectRatio) {
            drawWidth = node.size[0];
            drawHeight = drawWidth / aspectRatio;
            drawX = 0;
            drawY = node.size[1] - drawHeight;
          } else {
            drawHeight = node.size[1];
            drawWidth = drawHeight * aspectRatio;
            drawX = (node.size[0] - drawWidth) / 2;
            drawY = 0;
          }

          node.onDrawBackground = function (ctx) {
            ctx.drawImage(canvasImg, drawX, drawY, drawWidth, drawHeight);
            ctx.globalAlpha = 0.7;
            ctx.globalCompositeOperation = "darken";
            ctx.drawImage(maskImg, drawX, drawY, drawWidth, drawHeight);
            ctx.globalCompositeOperation = "source-over";
          };
          node.setDirtyCanvas(true, true);
        }
      };

      drawImage();
      node.onResize = drawImage;
    })
    .catch((error) => {
      console.error("🔹 Error:", error);
      node.onDrawBackground = null;
      node.setDirtyCanvas(true, true);
    });
}

async function previewonthenode(node) {
  const timestamp = new Date().getTime();
  const canvasImageUrl = `${canvasImage.url}?v=${timestamp}`;
  const maskImageUrl = `${maskImage.url}?v=${timestamp}`;
  setBackgroundImageContain(node, canvasImageUrl, maskImageUrl);
}

function drawUpdateTextAndRoundedStroke(ctx, node) {
  ctx.fillStyle = "blue";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Update Available!", node.size[0] / 2, -45);

  const radius = 8;
  const offsetY = -28;
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(radius, offsetY);
  ctx.lineTo(node.size[0] - radius, offsetY);
  ctx.arcTo(node.size[0], offsetY, node.size[0], radius + offsetY, radius);
  ctx.lineTo(node.size[0], node.size[1] - radius);
  ctx.arcTo(node.size[0], node.size[1], node.size[0] - radius, node.size[1], radius);
  ctx.lineTo(radius, node.size[1]);
  ctx.arcTo(0, node.size[1], 0, node.size[1] - radius, radius);
  ctx.lineTo(0, radius + offsetY);
  ctx.arcTo(0, offsetY, radius, offsetY, radius);
  ctx.closePath();
  ctx.stroke();
}

function createWatchedObject(obj, onChange) {
  return new Proxy(obj, {
    set(target, property, value) {
      if (target[property] !== value) {
        target[property] = value;
        onChange(property, value);
      }
      return true;
    },
  });
}

async function addBooleanProperty(node) {
  if (!node.properties) {
    node.properties = {};
  }

  const properties = {
    "Disable Preview": false,
    "Dont Hide Buttons": false,
  };

  node.properties = createWatchedObject(properties, async (property, newValue) => {
    if (property === "Disable Preview") {
      const timestamp = new Date().getTime();
      const canvasImageUrl = `${canvasImage.url}?v=${timestamp}`;
      const maskImageUrl = `${maskImage.url}?v=${timestamp}`;
      setBackgroundImageContain(node, canvasImageUrl, maskImageUrl);
      console.log("canvasImageUrl: ", canvasImageUrl);
      console.log("maskImageUrl: ", maskImageUrl);
    }
  });
}

function addRemoveButtons(node, add) {
  try {
    if (add) {
      addButton(node, "Load SD 1.5", "temp-button", () => loadWorkflow("sd15"));
      addButton(node, "Load sdxl (coming Soon...)", "temp-button", () => alert("We will drop it this week!"));
    } else {
      node.widgets = node.widgets.filter((widget) => widget.className !== "temp-button");
      node.setDirtyCanvas(true, true);
    }
  } catch (error) {
    console.error("🔹 Error in addRemoveButtons:", error);
  }
}

function handleMouseEvents(node) {
  const originalOnDrawForeground = node.onDrawForeground;

  node.onMouseEnter = () => {
    node.onDrawForeground = function (ctx) {
      if (originalOnDrawForeground) originalOnDrawForeground.call(this, ctx);
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, node.size[0], node.size[1]);
    };
    const tempButtonExists = node.widgets && node.widgets.some((widget) => widget.className === "temp-button");
    if (!tempButtonExists) {
      addRemoveButtons(node, true);
    }
    node.setDirtyCanvas(true, true);
  };

  node.onMouseLeave = () => {
    node.onDrawForeground = originalOnDrawForeground;
    if (!node.properties || !node.properties["Dont Hide Buttons"]) {
      addRemoveButtons(node, false);
    }
    node.setDirtyCanvas(true, true);
  };
}

// Define the setup function
function setup() {
  if (photoshopNode.length > 0 && !setupdone) {
    if (!connectdone) {
      connect();
      checkForNewVersion(nodever);
      connectdone = true;
    }
    setTimeout(() => {
      photoshopNode.forEach((node) => previewonthenode(node));
      setupdone = true;
    }, 6000);
  }
}

// Register extension with ComfyUI
app.registerExtension({
  name: "PhotoshopToComfyUINode2",
  setup: setup, // Reference the setup function here
  async nodeCreated(node) {
    try {
      if (node?.comfyClass === "🔹Photoshop ComfyUI Plugin") {
        photoshopNode.push(node);
        addBooleanProperty(node);
        handleMouseEvents(node);
        if (node.properties && node.properties["Dont Hide Buttons"]) addRemoveButtons(node, true);
        setupdone = false;
        setup();
      }
    } catch (error) {
      console.error("🔹 Error in nodeCreated:", error);
    }
  },
});

api.addEventListener("execution_start", () => photoshopNode.forEach((node) => previewonthenode(node)));

let versionUrl = "https://raw.githubusercontent.com/NimaNzrii/comfyui-photoshop/main/data/PreviewFiles/version.json";

const checkForNewVersion = async (nodever) => {
  try {
    const response = await fetch(versionUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch version information");
    }
    const data = await response.json();
    const latestVersion = data.version;
    console.log("🔹 latestVersion: ", latestVersion);
    const forceUpdate = data.force_update;

    if (latestVersion > nodever) {
      console.log(`🔹 New version available: ${latestVersion}`);

      if (forceUpdate) {
        photoshopNode.forEach((node) => {
          const existingButton = node.widgets?.find((widget) => widget.className === "update-ps-plugin-button");
          if (!existingButton) {
            const originalSize = [...node.size];
            addButton(node, "Click Here To Update🔥", "update-button", () => sendMsg("pullupdate", true));
            node.size = originalSize;

            const originalDrawForeground = node.onDrawForeground;
            node.onDrawForeground = function (ctx) {
              if (originalDrawForeground) originalDrawForeground.call(this, ctx);
              drawUpdateTextAndRoundedStroke(ctx, this);
            };
          }
        });
      } else {
        console.log("You are using the latest version.");
      }
    }
  } catch (error) {
    console.error("🔹 Error checking for new version:", error);
  }
};

function addButton(node, btntxt, class__name, func) {
  try {
    disabledrow = true;
    const originalSize = [...node.size];
    const button = node.addWidget("button", btntxt, null, func);
    button.className = class__name;
    const afterbtnHeight = node.size[1];
    if (originalSize[1] < afterbtnHeight) node.size = [originalSize[0], afterbtnHeight];
    else node.size = originalSize;
    node.setDirtyCanvas(true, true);
    disabledrow = false;
    node.onResize();
  } catch (error) {
    console.error("🔹 Error in addButton:", error);
  }
}
