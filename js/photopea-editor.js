import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyDialog, $el } from "../../scripts/ui.js";
import { ComfyApp } from "../../scripts/app.js";
import { ClipspaceDialog } from "../../extensions/core/clipspace.js";

let nodetosave = null;
function appendMenuOption(nodeType, callbackFn) {
  const originalMenuOptions = nodeType.prototype.getExtraMenuOptions;
  nodeType.prototype.getExtraMenuOptions = function () {
    const options = originalMenuOptions.apply(this, arguments);
    callbackFn.apply(this, arguments);
    return options;
  };
}

function convertImgToBase64(imgUrl, cb) {
  fetch(imgUrl)
    .then((res) => res.blob())
    .then((blob) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      fileReader.onloadend = () => {
        const base64Str = fileReader.result;
        cb(base64Str);
      };
    });
}

async function uploadImgFile(formData) {
  try {
    const response = await api.fetchApi("/upload/image", {
      method: "POST",
      body: formData,
    });
    if (response.status === 200) {
      const result = await response.json();
      nodetosave.imgs[0] = new Image();
      nodetosave.imgs[0].src = `view?filename=${result.name}&subfolder=${result.subfolder}&type=${result.type}`;
    } else {
      alert(response.status + " - " + response.statusText);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

class PhotopeaEditorModal extends ComfyDialog {
  static instance = null;

  static getInstance() {
    if (!PhotopeaEditorModal.instance) {
      PhotopeaEditorModal.instance = new PhotopeaEditorModal();
    }
    return PhotopeaEditorModal.instance;
  }

  constructor() {
    super();
    this.modalElement = null;
    this.iframeElement = null;
    this.iframeWrapper = null;
    this.isLayoutInitialized = false; // این باید اینجا تعریف بشه
  }

  buildButtons() {
    return [];
  }

  createButton(label, onClick) {
    const buttonElem = document.createElement("button");
    buttonElem.classList.add("psbtn");
    buttonElem.innerText = label;
    buttonElem.addEventListener("click", onClick);
    return buttonElem;
  }

  createLeftAlignedButton(label, onClick) {
    const leftButton = this.createButton(label, onClick);
    return leftButton;
  }

  createRightAlignedButton(label, onClick) {
    const rightButton = this.createButton(label, onClick);
    return rightButton;
  }

  layoutModal() {
    const self = this;

    const footerPanel = document.createElement("div");
    footerPanel.classList.add("footer-panel");
    this.modalElement.appendChild(footerPanel);

    self.fullscreenBtn = this.createLeftAlignedButton("Fullscreen", () => {
      self.toggleFullscreenMode();
    });
    self.fullscreenBtn.classList.add("ps-btn");

    const cancelBtn = this.createRightAlignedButton("Cancel", () => {
      self.close();
    });
    cancelBtn.classList.add("ps-cancel-btn");

    self.saveBtn = this.createRightAlignedButton("Save", () => {
      self.saveImage(self);
    });
    self.saveBtn.classList.add("ps-btn");

    self.saveSelectionAsMaskBtn = this.createRightAlignedButton("Save selection as mask", () => {
      self.saveSelectionAsMask(self);
    });
    self.saveSelectionAsMaskBtn.classList.add("ps-btn");

    footerPanel.appendChild(self.saveSelectionAsMaskBtn);
    footerPanel.appendChild(self.fullscreenBtn);
    footerPanel.appendChild(self.saveBtn);
    footerPanel.appendChild(cancelBtn);
  }

  show() {
    // Clean up any existing modal element
    if (this.modalElement) {
      document.body.removeChild(this.modalElement);
    }

    // Create a new modal element
    this.modalElement = $el("div.comfy-modal", { parent: document.body }, [$el("div.comfy-modal-content", [...this.buildButtons()])]);

    if (!this.isLayoutInitialized) {
      this.layoutModal();
      this.isLayoutInitialized = true;
    }

    if (ComfyApp.clipspace_return_node) {
      this.saveBtn.innerText = "Save";
    } else {
      this.saveBtn.innerText = "Save";
    }

    this.iframeElement = $el("iframe", {
      src: `https://www.photopea.com/`,
      style: { border: "none", width: "100%", height: "100%" },
    });

    this.iframeWrapper = document.createElement("div");
    this.iframeWrapper.classList.add("iframe-wrapper");
    this.modalElement.appendChild(this.iframeWrapper);
    this.modalElement.classList.add("comfy-modal-layout");
    this.iframeWrapper.appendChild(this.iframeElement);

    this.iframeElement.onload = () => {
      const imgSrc = ComfyApp.clipspace.imgs[ComfyApp.clipspace["selectedIndex"]].src;
      convertImgToBase64(imgSrc, (base64Url) => {
        this.sendMessageToPhotopea(`app.open("${base64Url}", null, false);`, "*");
      });
    };
  }

  close() {
    if (this.iframeWrapper) {
      this.modalElement.removeChild(this.iframeWrapper);
      this.iframeWrapper = null;
    }
    if (this.modalElement) {
      document.body.removeChild(this.modalElement);
      this.modalElement = null;
    }
    this.isLayoutInitialized = false;
    super.close();
  }

  async saveImage(self) {
    const saveCommand = 'app.activeDocument.saveToOE("png");';
    const [data, done] = await self.sendMessageToPhotopea(saveCommand);
    const imgBlob = new Blob([data], { type: "image/png" });
    const formData = new FormData();

    const filename = "clipspace-ComfyUI-Photoshop-" + performance.now() + ".png";

    ComfyApp.copyToClipspace(nodetosave);

    if (nodetosave.widgets) {
      const widgetIdx = nodetosave.widgets.findIndex((widget) => widget.name === "image");
      if (widgetIdx >= 0) nodetosave.widgets[widgetIdx].value = `ComfyUI-Photoshop/${filename} [input]`;
    }

    formData.append("image", imgBlob, filename);
    formData.append("subfolder", "ComfyUI-Photoshop");
    await uploadImgFile(formData);

    ComfyApp.onClipspaceEditorSave();
    this.close();
  }

  toggleFullscreenMode() {
    if (this.modalElement.style.width === "100vw") {
      this.modalElement.style.width = "85vw";
      this.modalElement.style.height = "85vh";
      this.fullscreenBtn.innerText = "Fullscreen";
    } else {
      this.modalElement.style.width = "100vw";
      this.modalElement.style.height = "100vh";
      this.fullscreenBtn.innerText = "Exit Fullscreen";
    }
  }
  async saveSelectionAsMask(self) {
    const script = `
    var doc = app.activeDocument;
    doc.flatten();
    var layer = doc.activeLayer;
    doc.selection.invert();  
    doc.selection.clear();
    
    `;
    await self.sendMessageToPhotopea(script);
    self.saveBtn.click();
  }

  async sendMessageToPhotopea(msgContent) {
    const request = new Promise((resolve, reject) => {
      const responses = [];
      const handleMessage = (res) => {
        responses.push(res.data);
        if (res.data === "done") {
          window.removeEventListener("message", handleMessage);
          resolve(responses);
        }
      };
      window.addEventListener("message", handleMessage);
    });
    this.iframeElement.contentWindow.postMessage(msgContent, "*");
    return await request;
  }
}

app.registerExtension({
  name: "🔹 ComfyUI Photoshop",
  init(appInstance) {
    const showModal = () => {
      const modal = PhotopeaEditorModal.getInstance();
      modal.show();
    };

    const isValidContext = () => ComfyApp.clipspace && ComfyApp.clipspace.imgs && ComfyApp.clipspace.imgs.length > 0;
    ClipspaceDialog.registerButton("Photopea Editor", isValidContext, showModal);
  },

  async beforeRegisterNodeDef(nodeType, nodeInfo, appInstance) {
    // appendMenuOption(nodeType, function (_, menuOptions) {
    //   menuOptions.unshift({
    //     content: "🔹 log node info",
    //     callback: () => {
    //       console.log(nodeType);
    //       console.log(appInstance);
    //       console.log(nodeInfo);
    //     },
    //   });
    // });

    if (Array.isArray(nodeInfo.output) && (nodeInfo.output.includes("MASK") || nodeInfo.output.includes("IMAGE")) && nodeInfo.name !== "🔹Photoshop ComfyUI Plugin") {
      appendMenuOption(nodeType, function (_, menuOptions) {
        menuOptions.unshift({
          content: "🔹 Photopea Editor",
          callback: () => {
            ComfyApp.copyToClipspace(this);
            ComfyApp.clipspace_return_node = this;
            nodetosave = this;

            const modal = PhotopeaEditorModal.getInstance();
            modal.show();
          },
        });
      });
    } else if (nodeInfo.input?.hidden?.extra_pnginfo) {
      appendMenuOption(nodeType, function (_, menuOptions) {
        menuOptions.unshift({
          content: "🔹 Photopea Editor",
          callback: () => {
            ComfyApp.copyToClipspace(this);

            const loadImageNode = addNode("LoadImage", this, { nodeName: "🔹Load Image" });
            ComfyApp.pasteFromClipspace(loadImageNode);

            ComfyApp.clipspace_return_node = loadImageNode;
            nodetosave = loadImageNode;

            const modal = PhotopeaEditorModal.getInstance();
            modal.show();
          },
        });
      });
    }
  },
});

function addNode(nodeType, referenceNode, options) {
  options = { select: true, shiftY: 0, before: false, nodeName: "", ...options };

  let newNode = LiteGraph.createNode(nodeType);
  app.graph.add(newNode);

  newNode.pos = [options.before ? referenceNode.pos[0] - newNode.size[0] - 30 : referenceNode.pos[0] + referenceNode.size[0] + 30, referenceNode.pos[1] + options.shiftY];

  if (options.select) {
    app.canvas.selectNode(newNode, false);
  }

  if (options.nodeName) {
    newNode.title = options.nodeName;
  }

  return newNode;
}

// Styles
const style = document.createElement("style");
style.innerHTML = `
  .comfy-modal-layout {
    display: flex;
    flex-direction: column;
    width: 80vw;
    height: 80vh;
    max-width: 100vw;
    max-height: 100vh;
    padding: 0;
    z-index: 8888;
  }
  .iframe-wrapper {
    flex: 1;
    padding-bottom: 40px;
    background: #474747;
  }
  .footer-panel {
    display: flex;
    justify-content: space-between;
    position: absolute;
    bottom: 0;
    right: 0px;
    height: 38px;
  }
  .psbtn {
    margin: 4px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .ps-cancel-btn {
    border-color: #482626 !important;
    background-color: #262627 !important;
    font-size: 14px !important;
    color: #ac7b7b !important;
  }
  .ps-btn{
    background-color: #262627 !important;
    font-size: 14px !important;
  }
`;
document.head.appendChild(style);
