// Verify Values Function
const verifyValues = () => {
  if (!sliderValInput.value) sliderValInput.value = "45";
  sliderForground.style.height = `${sliderValInput.value * 0.92}%`;
  sliderTxt.innerText = `${sliderValInput.value}`;

  if (!seedInput.value || isNaN(seedInput.value)) seedInput.value = "1379";
  if (!maxResField.value || isNaN(maxResField.value)) maxResField.value = "1024";
  if (!minResField.value || isNaN(minResField.value)) minResField.value = "320";
};

(async () => {
  dataFolder = await localFileSystem.getDataFolder();
  await loadConfigFile();
  await loadBackgroundImage();
  await initWebSocket();
})();
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
  verifyValues(); // فراخوانی در جای مناسب
};

// Save Config File
const saveConfigFile = async () => {
  try {
    verifyValues(); // فراخوانی در جای مناسب

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
  console.log("canvasChanged: ");
  canvasunsavedchanges = true;
  await smtchanged();
};

const maskchnaged = async () => {
  maskunsavedchanges = true;
  await smtchanged();
};

let previousHistoryState = null;
let previousSelectionBounds = null;

const checkHistoryState = () => {
  if (app.documents?.length) {
    const currentHistoryState = app.activeDocument.activeHistoryState;
    if (currentHistoryState.id !== previousHistoryState?.id) {
      const historyStates = app.activeDocument.historyStates;
      const activeIndex = historyStates.findIndex((state) => state.id === currentHistoryState);

      const currentSelectionBounds = app.activeDocument.selection.bounds;
      if (!!currentSelectionBounds !== !!previousSelectionBounds) {
        maskchnaged();
        previousSelectionBounds = currentSelectionBounds;
      }

      if (currentHistoryState.name != "Mask Sent to AI") {
        if (app.activeDocument.selection.bounds) maskchnaged();

        canvasChanged();
      }
      previousHistoryState = currentHistoryState;
    }
  }
};

async function smtchanged() {
  if (realtimeMode) await renderbutton.click();
}
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
