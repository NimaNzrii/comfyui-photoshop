(async () => {
  dataFolder = await localFileSystem.getDataFolder();
  await loadConfigFile();
  await loadBackgroundImage();
  await initWebSocket();
})();

// Load Config File
const loadConfigFile = async () => {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const configFile = await dataFolder.getEntry("config.json");

      if (configFile) {
        const { positive, negative, seed, slider, ip, maxres, minres, disableanimations, neverhideslider, shownegative, fixMask } = JSON.parse(await configFile.read());

        positiveInput.value = String(positive);
        negativeInput.value = String(negative);
        seedInput.value = String(seed);
        sliderValInput.value = String(slider);
        maxResField.value = String(maxres);
        minResField.value = String(minres);

        disable_all_animations.checked = disableanimations;
        never_hide_slider.checked = neverhideslider;
        show_negative_input.checked = shownegative;
        fixMaskEdge.checked = fixMask;

        addNeg2UI();
        if (!disable_all_animations.checked) {
          playanimation();
        }

        if (ip) {
          ipField.value = ip;
          UpdateWebview();
        }
        console.log(`Config loaded successfully on attempt ${attempt}`);
        break;
      }
    } catch (err) {
      console.error(`Error while loading config on attempt ${attempt}:`, err);
      if (attempt === maxAttempts) {
        console.error("Failed to load config after 5 attempts");
      }
    }
  }
  manageAnimation();
  if (!sliderValInput.value) sliderValInput.value = "45";
  sliderForground.style.height = `${sliderValInput.value * 0.92}%`;
  sliderTxt.innerText = `${sliderValInput.value}`;
  if (!seedInput.value) seedInput.value = "1379";
  if (!maxResField.value) maxResField.value = "1024";
  if (!minResField.value) minResField.value = "320";
};

// // loading Config // //

// BackGround Image Loader //
let i = 0;
const loadBackgroundImage = async () => {
  try {
    i++;
    imgFile = await dataFolder.getEntry("render.png");
    body.style.backgroundImage = "url('" + imgFile.url + "?v=" + i + "')";
  } catch (err) {
    body.style.backgroundImage = "url('./icons/defaultImg.jpg')";
  }
};

// _____________________________________________________ //
// ______________Custom Events Back-End________________ //
// ___________________________________________________ //

// // Save Settings To Json File // //
const saveConfigFile = async () => {
  try {
    if (!sliderValInput.value) sliderValInput.value = "0.1";
    if (!seedInput.value) seedInput.value = "1379";
    if (!maxResField.value) maxResField.value = "1024";
    if (!minResField.value) minResField.value = "320";

    const file = await dataFolder.createFile("config.json", {
      overwrite: true,
    });

    let dataToSave = {
      positive: positiveInput.value,
      negative: negativeInput.value,
      seed: seedInput.value,
      slider: parseFloat(sliderValInput.value),
      pluginVer: pluginVersion,
    };

    await sendMessage("configdata", dataToSave);

    dataToSave = {
      positive: positiveInput.value,
      negative: negativeInput.value,
      seed: seedInput.value,
      slider: sliderValInput.value,
      pluginVer: pluginVersion,
      ip: ipField.value,
      maxres: maxResField.value,
      minres: minResField.value,
      disableanimations: disable_all_animations.checked,
      neverhideslider: never_hide_slider.checked,
      shownegative: show_negative_input.checked,
      fixMask: fixMaskEdge.checked,
    };

    await file.write(JSON.stringify(dataToSave));
    console.log("dataToSave: ", dataToSave);
    configunsavedchanges = false;
  } catch (err) {
    console.error("Error while saving data:", err);
  }
};
const openPanelById = async (panelId) => {
  try {
    const uxp = require("uxp");
    const plugins = Array.from(uxp.pluginManager.plugins);

    const currentPlugin = plugins.find((plugin) => plugin.id === uxp.entrypoints._pluginInfo.id);
    console.log("currentPlugin: ", currentPlugin);

    if (currentPlugin) {
      await currentPlugin.showPanel(panelId);
    } else {
      console.error("No plugin found");
    }
  } catch (error) {
    console.error("Error opening panel:", error);
  }
};

////////////////////////////////////
////////////////////////////////////
////////////////////////////////////

function base64ToArrayBuffer(base64) {
  var binaryString = window.atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function saveBase64AsPngFile(base64, fileName) {
  try {
    let arrayBuffer = base64ToArrayBuffer(base64);
    let pluginFolder = await fs.getDataFolder();
    let file = await pluginFolder.createFile(fileName, { overwrite: true });
    await file.write(arrayBuffer);

    console.log("Render saved successfully");
    loadBackgroundImage();
  } catch (error) {
    console.error("Error saving file:", error);
  }
}

////////////////////////////////////
///////////////////////////////////
//////////////////////////////////

const canvasChanged = async () => {
  canvasunsavedchanges = true;
  await smtchanged();
};

const maskchnaged = async () => {
  maskunsavedchanges = true;
  await smtchanged();
};

let previousHistoryState = null;
const checkHistoryState = () => {
  if (app.documents?.length) {
    const ignoreList = ["New Layer", "Enter Quick Mask", "Object Selection", "Lasso", "Polygonal Lasso", "Elliptical Marquee", "Rectangular Marquee", "Quick Selection", "Exit Quick Mask", "Select Inverse", "Select Canvas", "Load Selection", "Border", "Smooth", "Expand", "Contract", "Feather", "Grow", "Similar", "Free Transform Selection", "Select Sky", "Select Subject", "Focus Area", "Color Range", "Path Tool", "Selection Change", "Deselect", "Move Selection", "Mask Sent to AI"];

    const currentHistoryState = app.activeDocument.activeHistoryState.id;
    if (currentHistoryState !== previousHistoryState) {
      selectionArea = app.activeDocument.selection.bounds;

      // MaskButton.classList.toggle("hidden", !selectionArea);
      // Masktxtcontainer.classList.toggle("hidden", !selectionArea);
      const historyStates = app.activeDocument.historyStates;
      const currentHistoryName = app.activeDocument.activeHistoryState.name;
      const activeIndex = historyStates.findIndex((state) => state.id === currentHistoryState);

      if (!ignoreList.includes(currentHistoryName) || (activeIndex < historyStates.length - 1 && !ignoreList.includes(historyStates[activeIndex + 1].name))) {
        canvasChanged();
      } else if (ignoreList.includes(currentHistoryName) && !(currentHistoryName == "Enter Quick Mask") && !(currentHistoryName == "Mask Sent to AI")) {
        maskchnaged();
      }
      previousHistoryState = currentHistoryState;
    }
  }
};

async function smtchanged() {
  if (realtimeMode) await renderbutton.click();
}
