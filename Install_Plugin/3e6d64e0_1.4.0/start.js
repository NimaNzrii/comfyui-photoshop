const { app, core } = require("photoshop");
const { localFileSystem } = require("uxp").storage;
const fs = require("uxp").storage.localFileSystem;
const imaging = require("photoshop").imaging;
core.suppressResizeGripper({
  type: "panel",
  target: "mainpanel",
  value: true,
});

// ___________________________________________________ //
// ____________________Variables______________________ //
// ___________________________________________________ //
const $ = document,
  body = $.querySelector("#body"),
  sliderContainer = $.querySelector(".sliderContainer"),
  startPage = $.querySelector(".startPage"),
  startButton = $.querySelector("#startButton"),
  mainpanel = $.querySelector("#mainpanel"),
  iconpreviewsize = $.querySelector("#iconpreviewsize"),
  previewsizebtn = $.querySelector("#previewsizebtn"),
  seedRandomBtn = $.querySelector("#seedRandomBtn"),
  iconplay = $.querySelector("#iconplay"),
  iconprompt = $.querySelector("#iconprompt"),
  iconpreset = $.querySelector("#iconpreset"),
  presetcon = $.querySelector("#presetcon"),
  sliderTxt = $.querySelector("#sliderTxt"),
  playBtnContainer = $.querySelector("#playBtnContainer"),
  menuModalBack = $.querySelector("#menuModalBack"),
  presetbtn = $.querySelector("#presetbtn"),
  rndrContainer = $.querySelector("#rndrContainer"),
  ApplyBtn = $.querySelector("#ApplyBtn"),
  EditModemodalBackdrop = $.querySelector("#EditModemodalBackdrop"),
  sliderContainerBackground = $.querySelector(".sliderContainerBackground"),
  settingPanelButton = $.querySelector("#settingPanelButton"),
  promptbtn = $.querySelector("#promptbtn"),
  negativeContainer_Hover = $.querySelector("#negativeContainer_Hover"),
  controlContainer_Background = $.querySelector(".controlContainer_Background"),
  promptContainer = $.querySelector("#promptContainer"),
  renderbutton = $.querySelector("#renderbutton"),
  sliderBackground = $.querySelector("#sliderBackground"),
  sliderForground = $.querySelector("#sliderForground"),
  addToLayersBtn = $.querySelector("#addToLayersBtn"),
  subscribe = $.querySelector("#subscribe"),
  progressBar = $.querySelector(".progressBar"),
  progressBarBack = $.querySelector(".progressBarBack"),
  allbtns = $.querySelector("#allbtns"),
  ComfuiPanelButton = $.querySelector("#ComfuiPanelButton"),
  webviewComfy = $.querySelector("#webviewComfy"),
  ipStatus = $.querySelector("#ipStatus"),
  presetContainer = $.querySelector("#presetContainer"),
  maxResField = $.querySelector("#maxResField"),
  fixMaskEdge = $.querySelector("#fixMaskEdge"),
  minResField = $.querySelector("#minResField "),
  renderimageApply = $.querySelector("#renderimageApply"),
  tooltip = $.querySelector("#tooltip"),
  sliderValInput = $.querySelector("#sliderValInput"),
  show_negative_input = $.querySelector("#show_negative_input"),
  disable_all_animations = $.querySelector("#disable_all_animations"),
  never_hide_slider = $.querySelector("#never_hide_slider"),
  reloadButton = $.querySelector("#reloadButton"),
  promptsection = $.querySelector("#promptsection"),
  buttonlist = $.querySelector(".buttonlist");

// Add a click event listener to the button
startButton.addEventListener("click", function () {
  body.appendChild(Object.assign(document.createElement("script"), { src: "backend.js" }));
  body.appendChild(Object.assign(document.createElement("script"), { src: "front.js" }));
  body.appendChild(Object.assign(document.createElement("script"), { src: "animation.js" }));
  body.appendChild(Object.assign(document.createElement("script"), { src: "connection.js" }));
  body.appendChild(Object.assign(document.createElement("script"), { src: "PS_actions.js" }));

  // Hide the start button after it's clicked
  document.querySelector(".startPage").classList.add("hidden");
});
function createSyncedInputObject(selector) {
  const inputs = document.querySelectorAll(selector);
  const eventListeners = {};
  const properties = ["value", "checked", "innerHTML", "placeholder", "selectedIndex"];

  const syncedInput = {
    addEventListener(eventType, callback) {
      if (!eventListeners[eventType]) {
        eventListeners[eventType] = [];
      }
      eventListeners[eventType].push(callback);

      inputs.forEach((input) => {
        input.addEventListener(eventType, callback);
      });
    },
    syncAllAttributes(sourceElement) {
      inputs.forEach((input) => {
        if (input !== sourceElement) {
          // کپی کردن تمام ویژگی‌ها از sourceElement به input
          for (let attr of sourceElement.attributes) {
            if (attr && attr.name) {
              // چک کردن وجود ویژگی و نام آن
              input.setAttribute(attr.name, attr.value);
            }
          }

          // ویژگی‌های خاص که به صورت مستقیم قابل تنظیم نیستند
          properties.forEach((prop) => {
            input[prop] = sourceElement[prop];
          });
        }
      });
    },
  };

  // ایجاد getter و setter برای هر ویژگی در properties
  properties.forEach((prop) => {
    Object.defineProperty(syncedInput, prop, {
      get() {
        return inputs[0]?.[prop] || "";
      },
      set(value) {
        inputs.forEach((input) => {
          input[prop] = value;
        });
      },
    });
  });

  // افزودن رویداد 'change' به هر ورودی
  inputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      syncedInput.syncAllAttributes(event.target);
      console.log(`${selector} attributes synced.`);
    });
  });

  return syncedInput;
}

const positiveInput = createSyncedInputObject("#positiveInput");
let negativeInput = createSyncedInputObject("#negativeInput");
const seedInput = createSyncedInputObject("#seedInput");
const realtime_mode = createSyncedInputObject("#realtime_mode");
const ipApplyButton = createSyncedInputObject("#ipApplyButton");
const ipResetButton = createSyncedInputObject("#ipResetButton");
const ipField = createSyncedInputObject("#ipField");

const workFlowDropDown = createSyncedInputObject("#workFlowDropDown");
const workFlowOptions = createSyncedInputObject("#workFlowOptions");
const rndrModeDropDown = createSyncedInputObject("#rndrModeDropDown");
const rndrModeOptions = createSyncedInputObject("#rndrModeOptions");

const pluginVersion = require("uxp").versions.plugin;
