import { app as e } from "../../../scripts/app.js";
import { api as t } from "../../../scripts/api.js";
let photoshopConneted = !1,
  QuickEdit_LoadImage = "",
  photoshopNode = [],
  creatednode = "",
  workflowSwitcher = "",
  rndrModeSwitcher = "";
function addNode(t, r, s) {
  s = { select: !0, shiftY: 0, before: !1, ...(s || {}) };
  let o = LiteGraph.createNode(t);
  return e.graph.add(o), (o.pos = [s.before ? r.pos[0] - o.size[0] - 30 : r.pos[0] + r.size[0] + 30, r.pos[1] + s.shiftY]), s.select && e.canvas.selectNode(o, !1), o;
}
e.registerExtension({
  name: "PhotoshopToComfyUINode",
  onProgressUpdate(e) {
    if (!this.connected) return;
    let t = e.detail.prompt;
    if (((this.currentPromptExecution = t), t?.errorDetails)) {
      let r = `${t.errorDetails?.exception_type} ${t.errorDetails?.node_id || ""} ${t.errorDetails?.node_type || ""}`;
      (this.progressTextEl.innerText = r), this.progressNodesEl.classList.add("-error"), this.progressStepsEl.classList.add("-error");
      return;
    }
  },
  async nodeCreated(t) {
    if ((workflowSwitcher || (workflowSwitcher = search4title("\uD83D\uDCC1 WorkFlows")), rndrModeSwitcher || (rndrModeSwitcher = search4title("⚙️ Render Setting")), t?.comfyClass === "🔹Photoshop ComfyUI Plugin")) {
      connect(), (creatednode = t), photoshopNode.push(creatednode), (t.imgs = []);
      let r = new Image();
      t.imgs.push(r),
        (r.onload = () => {
          e.graph.setDirtyCanvas(!0);
        }),
        (r.src = "");
    }
  },
  createMenu(e, t) {
    e.prototype.getExtraMenuOptions = async function (e, r) {
      if (this.imgs) {
        let s;
        null != this.imageIndex ? (s = this.imgs[this.imageIndex]) : null != this.overIndex && (s = this.imgs[this.overIndex]),
          s &&
            r.unshift({
              content: "\uD83D\uDC2CQuick Edit + Mask",
              callback: async () => {
                console.log("\uD83D\uDC2C this: ", this), "LoadImage" === t.name ? CutomLoadImage(this) : "PreviewImage" === t.name && ((QuickEdit_LoadImage = addNode("LoadImage", this)), sendMsg("PreviewImage", this.images[0].filename));
              },
            });
      }
    };
  },
});
let search4type = (t) => e.graph._nodes.find((e) => e.type === t),
  search4title = (t) => e.graph._nodes.find((e) => e.title === t);
function RefreshPreviews() {
  let t = e.graph._nodes.filter((e) => void 0 !== e.imgs);
  for (let r of t) r.imgs[0].src = r.imgs[0].src + "1";
}
let url2Base64 = async (e) => {
    let t = await fetch(e),
      r = await t.blob(),
      s = await new Promise((e, t) => {
        let s = new FileReader();
        (s.onloadend = () => e(s.result.substring(22))), (s.onerror = t), s.readAsDataURL(r);
      });
    return s;
  },
  CutomLoadImage = (e) => {
    e.title = "\uD83D\uDC2CLoad Image";
    let t = e.widgets?.[0],
      r = t._real_value?.replace(/ \[input\]$/, "");
    console.log("\uD83D\uDC2C imageFileName: ", r), sendMsg("QuickEdit", r);
  },
  genrateStatus = "genrated",
  isProcessing = !1,
  socket = "";
function connect() {
  try {
    (socket = new WebSocket("ws://127.0.0.1:8765")).addEventListener("open", (e) => {
      console.log("\uD83D\uDC2C Connected to the server."), socket.send("imComfyui");
    }),
      socket.addEventListener("message", (t) => {
        let r = JSON.parse(t.data);
        if (
          (r.previewImageBase64 &&
            photoshopNode.forEach((e) => {
              e.imgs[0].src = "data:image/jpeg;base64," + r.previewImageBase64;
            }),
          r.photoshopConnected && (photoshopConneted = !0),
          r.quickSave && RefreshPreviews(),
          r.Get_workflow && workflowSwitcher && rndrModeSwitcher && (sendMsg("Send_workflow", SwitcherWidgetNames(workflowSwitcher)), sendMsg("Send_rndrMode", SwitcherWidgetNames(rndrModeSwitcher))),
          r.workflow && workflowSwitcher.widgets[r.workflow].callback(),
          r.rndrMode && rndrModeSwitcher.widgets[r.rndrMode].callback(),
          r.tempToInput &&
            (function e() {
              QuickEdit_LoadImage ? ((QuickEdit_LoadImage.title = "\uD83D\uDC2CLoad Image"), (QuickEdit_LoadImage.widgets_values = r.tempToInput), (QuickEdit_LoadImage.widgets[0]._real_value = r.tempToInput), (QuickEdit_LoadImage.widgets[0].value = r.tempToInput), (QuickEdit_LoadImage.imgs[0].src = `/view?filename=${r.tempToInput}&type=input&subfolder=&rand=0.1`)) : setTimeout(() => e(), 50);
            })(),
          r.getSetting)
        ) {
          let s = search4type("KSampler");
          s || (s = search4type("KSampler (Efficient)")), s || (s = search4type("KSamplerAdvanced")), s || (s = search4type("KSampler Adv. (Efficient)")), s || (s = search4type("KSampler SDXL (Eff.)"));
          let o = [];
          for (let a = 0; a < s.widgets.length; a++) {
            let i = { type: String(s.widgets[a].type), name: String(s.widgets[a].name), value: String(s.widgets[a].value || ""), combo: s.widgets[a].options.values || "" };
            o.push(i);
          }
          let n = { id: s.id, nodeName: s.title, widgets: { ...o, length: s.widgets.length } };
          sendMsg("node", n);
        }
        r.queue &&
          !isProcessing &&
          (search4type("🔹Photoshop ComfyUI Plugin")
            ? ((isProcessing = !0),
              !(function t() {
                "genrated" == genrateStatus ? (e.queuePrompt(), (isProcessing = !1)) : setTimeout(t, 100);
              })())
            : console.log("🔹Photoshop Node doesn't Exist"));
      }),
      socket.addEventListener("close", (e) => {
        console.error("Trying again"), setTimeout(connect, 5e3);
      });
  } catch {
    setTimeout(connect, 5e3);
  }
}
let sendMsg = (e, t) => {
    socket.send(JSON.stringify({ [e]: t }));
  },
  SwitcherWidgetNames = (e) => {
    try {
      let t = [],
        r = e.widgets;
      return (
        r.forEach((e) => {
          e.value ? t.push({ name: String(e.name.replace("Enable ", "")), selected: !0 }) : t.push({ name: String(e.name.replace("Enable ", "")) });
        }),
        t
      );
    } catch (s) {
      console.error("Error e:", s);
    }
  };
t.addEventListener("execution_start", ({ detail: e }) => {
  (genrateStatus = "genrating"), sendMsg("render_status", "genrating");
}),
  t.addEventListener("executing", ({ detail: e }) => {
    e || ((genrateStatus = "genrated"), (isProcessing = !1), sendMsg("render_status", genrateStatus));
  }),
  t.addEventListener("execution_error", ({ detail: e }) => {
    (genrateStatus = "genrate_error"), sendMsg("render_status", "genrate_error");
  }),
  t.addEventListener("progress", ({ detail: { value: e, max: t } }) => {
    let r = Math.floor((e / t) * 100);
    !isNaN(r) && r >= 0 && r <= 100 && sendMsg("progress", r);
  });
