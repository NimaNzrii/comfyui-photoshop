let dataFolder;
let realtimeMode = false;
let seed;
let renderWidth = 0;
let renderHeight = 0;
let unsendchanged = true;

let anim = true;
let start = true;
let selectionArea = null;
maxResField.value = 1024;
minResField.value = 320;

let maskunsavedchanges = true;
let canvasunsavedchanges = true;
let configunsavedchanges = true;
// slider
let isDragging = false;
let offsetY = 0;

const onDragStart = function (e) {
  isDragging = true;
  offsetY = e.clientY - sliderForground.getBoundingClientRect().top;
  onDrag(e);
};

const onDrag = function (e) {
  if (isDragging) {
    let newHeight;
    const maxheight = 92;
    const bgRect = sliderForground.parentElement.getBoundingClientRect();
    newHeight = Math.round(((bgRect.bottom - e.clientY) / bgRect.height) * 100);
    newHeight = Math.min(maxheight, Math.max(1, newHeight));
    sliderForground.style.height = `${newHeight}%`;

    sliderValInput.value = String(Math.round(newHeight * (100 / maxheight)));
    sliderTxt.innerText = `${sliderValInput.value}`;
  }
};
const onDragStop = () => {
  isDragging = false;
  configunsavedchanges = true;
  smtchanged();
};

function addNeg2UI() {
  if (show_negative_input.checked) {
    // چک کن که آیا عنصر قبلاً اضافه شده یا نه
    if (document.getElementsByClassName("ngpr").length === 0) {
      const negativeInputHTML = '<sp-textfield id="negativeInput" class="prompt ngpr" placeholder="Negative Prompt"></sp-textfield>';
      const promptSection = document.getElementById("promptsection");
      promptSection.insertAdjacentHTML("beforeend", negativeInputHTML);
      negativeInput = createSyncedInputObject("#negativeInput");
    }
  } else {
    const negativeInputs = document.getElementsByClassName("ngpr");
    // حذف تمام عناصر با کلاس ngpr
    while (negativeInputs.length > 0) {
      negativeInputs[0].remove();
    }
  }
}
show_negative_input.addEventListener("change", addNeg2UI);

sliderBackground.addEventListener("mouseup", onDragStop);
sliderBackground.addEventListener("mousedown", onDragStart);
sliderBackground.addEventListener("mouseleave", onDragStop);
sliderBackground.addEventListener("mousemove", onDrag);
// // slider Element // //

// // Funcuinallity of Controller Buttons // //

renderbutton.addEventListener("mouseenter", async () => {
  tooltip.classList.remove("hidden");
});

renderbutton.addEventListener("mouseout", async () => {
  tooltip.classList.add("hidden");
});

renderbutton.addEventListener("click", async () => {
  console.log("click: ");
  if (maskunsavedchanges) await saveMask();

  if (canvasunsavedchanges) await saveImage();

  if (configunsavedchanges) await saveConfigFile();

  await sendMessage("queue");
});

realtime_mode.addEventListener("change", async () => {
  realtimeMode = realtime_mode.checked;
  await smtchanged();
});
// // Funcuinallity of Controller Buttons // //

promptbtn.addEventListener("click", () => {
  iconprompt.classList.toggle("icon-prompt-active");
  promptbtn.classList.toggle("style-btn");

  iconpreset.classList.remove("icon-preset-active");
  presetbtn.classList.remove("style-btn");

  presetContainer.classList.toggle("hidden");
  promptContainer.classList.add("hidden");

  anim = presetContainer.classList.contains("hidden") ? true : false;
});
presetbtn.addEventListener("click", () => {
  iconpreset.classList.toggle("icon-preset-active");
  presetbtn.classList.toggle("style-btn");

  iconprompt.classList.remove("icon-prompt-active");
  promptbtn.classList.remove("style-btn");

  promptContainer.classList.toggle("hidden");
  presetContainer.classList.add("hidden");

  anim = promptContainer.classList.contains("hidden") ? true : false;
});

workFlowOptions.addEventListener("mouseenter", () => {
  anim = false;
  iconpreset.classList.add("icon-preset-active");
  presetbtn.classList.add("style-btn");

  iconprompt.classList.remove("icon-prompt-active");
  promptbtn.classList.remove("style-btn");

  promptContainer.classList.remove("hidden");
  presetContainer.classList.add("hidden");
});
rndrModeOptions.addEventListener("mouseenter", () => {
  anim = false;
  iconpreset.classList.add("icon-preset-active");
  presetbtn.classList.add("style-btn");

  iconprompt.classList.remove("icon-prompt-active");
  promptbtn.classList.remove("style-btn");

  promptContainer.classList.remove("hidden");
  presetContainer.classList.add("hidden");
});

// // Hover on Controller Element // //

settingPanelButton.addEventListener("click", function () {
  openPanelById("settingpanel");
});

ComfuiPanelButton.addEventListener("click", function () {
  openPanelById("comfypanel");
});

let isCover = true;
previewsizebtn.addEventListener("click", function () {
  if (isCover) {
    body.style.backgroundSize = `contain`;
    iconpreviewsize.classList.add("icon-previewsize-Active");
  } else {
    body.style.backgroundSize = `cover`;
    iconpreviewsize.classList.remove("icon-previewsize-Active");
  }
  isCover = !isCover;
});

startButton.addEventListener("click", function () {
  startPage.classList.add("hidden");
});

seedRandomBtn.addEventListener("click", () => {
  seedInput.value = BigInt(Math.round(Math.random() * 100000000)).toString();
  configunsavedchanges = true;
  renderbutton.click();
});

// seedIncreaseButton.addEventListener("click", () => {
//   seedInput.value = (BigInt(seedInput.value) + 1n).toString();
// });

// seedDecreaseButton.addEventListener("click", () => {
//   seedInput.value = (BigInt(seedInput.value) - 1n).toString();
// });

workFlowDropDown.addEventListener("change", async (evt) => {
  if (evt.target.selectedIndex >= 0) {
    console.log(`Selected item: ${evt.target.selectedIndex}`);
    sendMessage("workflow", String(evt.target.selectedIndex));
    await smtchanged();
  }
});
rndrModeDropDown.addEventListener("change", async (evt) => {
  if (evt.target.selectedIndex >= 0) {
    console.log(`Selected item: ${evt.target.selectedIndex}`);
    sendMessage("rndrMode", String(evt.target.selectedIndex));
    anim = true;
    await smtchanged();
  }
});

reloadButton.addEventListener("click", () => {
  window.location.reload();
});

const updateIPStatus = (status) => {
  ipStatus.textContent = status;
  ipStatus.style.color = status === "Connected" ? "green" : "red";
};

setInterval(checkHistoryState, 100);

renderbutton.addEventListener("contextmenu", function (event) {
  event.preventDefault();
  seedRandomBtn.click();
});

const UpdateWebview = () => {
  webviewComfy.src = "http://" + ipField.value + ":8188";
};

const handleInputChange = async () => {
  configunsavedchanges = true;
  await smtchanged();
};

positiveInput.addEventListener("change", handleInputChange);

seedInput.addEventListener("change", handleInputChange);
negativeInput.addEventListener("change", handleInputChange);

sliderValInput.addEventListener("input", function () {
  sliderForground.style.height = `${sliderValInput.value * 0.92}%`;
  sliderTxt.innerText = `${sliderValInput.value}`;
});
