const { batchPlay } = require("photoshop").action;

let renderCount = 0;
const addToLayer = function () {
  if (app.documents?.length) {
    try {
      const bounds = app.activeDocument.selection.bounds;
      const avgRes = (app.activeDocument.height + app.activeDocument.width) / 2;

      const newheight = (app.activeDocument.height / renderHeight) * 100;
      const newwidth = (app.activeDocument.width / renderWidth) * 100;
      app.activeDocument.suspendHistory(async (context) => {
        await core.executeAsModal(async () => {
          const imgFile = await dataFolder.getEntry("render.png");

          const imgFilePath = imgFile.nativePath.replace(/\\/g, "/");
          entry = await fs.createSessionToken(await fs.getEntryWithUrl(`file://${imgFilePath}`));

          renderCount++;
          if (bounds) {
            if (fixMaskEdge.checked) {
              await batchPlay(
                [
                  { _obj: "expand", by: { _unit: "pixelsUnit", _value: avgRes * 0.016 }, selectionModifyEffectAtCanvasBounds: false, _options: { dialogOptions: "dontDisplay" } },
                  { _obj: "feather", radius: { _unit: "pixelsUnit", _value: avgRes * 0.008 }, selectionModifyEffectAtCanvasBounds: false, _options: { dialogOptions: "dontDisplay" } },
                ],
                {}
              );
            }
            await batchPlay(
              [
                {
                  _obj: "make",
                  _target: [{ _ref: "layer" }],
                  using: { _obj: "layer", name: "TempLayerForMasking" },
                  layerID: 120,
                  _options: { dialogOptions: "dontDisplay" },
                },
                {
                  _obj: "make",
                  new: { _class: "channel" },
                  at: { _ref: "channel", _enum: "channel", _value: "mask" },
                  using: { _enum: "userMaskEnabled", _value: "revealSelection" },
                  _options: { dialogOptions: "dontDisplay" },
                },
              ],
              {}
            );
          }
          await batchPlay(
            [
              {
                _obj: "placeEvent",
                target: { _path: entry, _kind: "local" },
              },
              {
                _obj: "set",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                to: { _obj: "layer", name: "render " + renderCount },
                _options: {
                  dialogOptions: "dontDisplay",
                },
              },
              {
                _obj: "set",
                _target: [{ _ref: "channel", _property: "selection" }],
                to: { _enum: "ordinal", _value: "allEnum" },
                _options: { dialogOptions: "dontDisplay" },
              },
              {
                _obj: "align",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                using: { _enum: "alignDistributeSelector", _value: "ADSCentersV" },
                alignToCanvas: false,
                _options: { dialogOptions: "dontDisplay" },
              },
              {
                _obj: "align",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                using: { _enum: "alignDistributeSelector", _value: "ADSCentersH" },
                alignToCanvas: false,
                _options: { dialogOptions: "dontDisplay" },
              },
              {
                _obj: "set",
                _target: [{ _ref: "channel", _property: "selection" }],
                to: { _enum: "ordinal", _value: "none" },
                _options: { dialogOptions: "dontDisplay" },
              },
            ],

            {}
          );

          // Get the placed layer dimensions
          const docWidth = app.activeDocument.width;
          const docHeight = app.activeDocument.height;
          const placedLayer = app.activeDocument.activeLayers[0];
          const placedLayerWidth = placedLayer.bounds.width;
          const placedLayerHeight = placedLayer.bounds.height;

          // Check if the placed image is smaller than the document
          if (placedLayerWidth < docWidth || placedLayerHeight < docHeight) {
            const scaleX = (docWidth / placedLayerWidth) * 100;
            const scaleY = (docHeight / placedLayerHeight) * 100;

            await batchPlay(
              [
                {
                  _obj: "transform",
                  freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
                  width: { _unit: "percentUnit", _value: scaleX },
                  height: { _unit: "percentUnit", _value: scaleY },
                  _options: { dialogOptions: "dontDisplay" },
                },
              ],
              {}
            );
          }

          if (bounds) {
            setTimeout(() => {}, 100);
            await batchPlay(
              [
                {
                  _obj: "make",
                  new: { _class: "channel" },
                  at: {
                    _ref: [
                      { _ref: "channel", _enum: "channel", _value: "mask" },
                      { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
                    ],
                  },
                  using: {
                    _ref: [
                      { _ref: "channel", _enum: "channel", _value: "mask" },
                      { _ref: "layer", _name: "TempLayerForMasking" },
                    ],
                  },
                  duplicate: true,
                  _options: { dialogOptions: "dontDisplay" },
                },
                {
                  _obj: "select",
                  _target: [{ _ref: "layer", _name: "TempLayerForMasking" }],
                  makeVisible: false,
                  layerID: [158],
                  _options: { dialogOptions: "dontDisplay" },
                },
                {
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  layerID: [158],
                  _options: { dialogOptions: "dontDisplay" },
                },
                {
                  _obj: "select",
                  _target: [{ _ref: "layer", _name: "render " + renderCount }],
                  makeVisible: false,
                  _options: { dialogOptions: "dontDisplay" },
                },
              ],
              {}
            );
          }
        });
      }, "Added to Layer");
    } catch (error) {
      console.log("error", error);
    }
  }
};
addToLayersBtn.addEventListener("click", () => addToLayer());

// // Save Settings To Json File // //

// //quicksaveCurrentImage();
// async function quicksaveCurrentImage() {
//   try {
//     app.activeDocument.suspendHistory(async (context) => {
//       let beforeSnapshot = app.activeDocument.activeHistoryState;
//       await core.executeAsModal(async () => {
//         const layerCount = app.activeDocument.layers.length;
//         console.log("Layer count: ", layerCount);
//         if (layerCount > 1) {
//           await batchPlay(
//             [
//               { _obj: "selectAllLayers", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }], _options: { dialogOptions: "dontDisplay" } },
//               { _obj: "mergeLayersNew", _options: { dialogOptions: "dontDisplay" } },
//             ],
//             {}
//           );
//         }
//         if (app.activeDocument.selection.bounds) {
//           await batchPlay([{ _obj: "delete", _options: { dialogOptions: "dontDisplay" } }], {});
//         }
//         await batchPlay([{ _obj: "save", saveStage: { _enum: "saveStageType", _value: "saveSucceeded" }, _options: { dialogOptions: "dontDisplay" } }], {});
//       });

//       app.activeDocument.activeHistoryState = beforeSnapshot;
//     }, "QucikEdit Applied");
//   } catch (error) {
//     console.log("error", error);
//   }
// }

// async function openImage(path) {
//   let entry = await fs.getEntryWithUrl(`file:/${path}`); // TESTING -> DIRECT_PATH
//   let token = fs.createSessionToken(entry);
//   try {
//     await core.executeAsModal(async () => {
//       await batchPlay([{ _obj: "open", null: { _path: token, _kind: "local" }, _options: { dialogOptions: "dontDisplay" } }], {});
//     });
//   } catch (error) {
//     console.log("error", error);
//   }
// }

const calculateNewDimensions = (width, height) => {
  let maxRes = parseInt(maxResField.value, 10);
  let minRes = parseInt(minResField.value, 10);

  let newWidth = width;
  let newHeight = height;

  if (width < minRes || height < minRes) {
    if (width < height) {
      newWidth = minRes;
      newHeight = (minRes * height) / width;
    } else {
      newHeight = minRes;
      newWidth = (minRes * width) / height;
    }
  } else if (width > maxRes || height > maxRes) {
    if (width > height) {
      newWidth = maxRes;
      newHeight = (maxRes * height) / width;
    } else {
      newHeight = maxRes;
      newWidth = (maxRes * width) / height;
    }
  }

  return { newWidth, newHeight };
};

const saveMask = async () => {
  try {
    app.activeDocument.suspendHistory(async (context) => {
      let beforeSnapshot = app.activeDocument.activeHistoryState;
      const docWidth = app.activeDocument.width;
      const docHeight = app.activeDocument.height;

      let { newWidth, newHeight } = calculateNewDimensions(docWidth, docHeight);

      await core.executeAsModal(async () => {
        await batchPlay(
          [
            { _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } },
            { _obj: "make", _target: [{ _ref: "layer", layerID: 85 }], _options: { dialogOptions: "dontDisplay" } },
            { _obj: "make", _target: [{ _ref: "contentLayer" }], using: { _obj: "contentLayer", type: { _obj: "solidColorLayer", color: { _obj: "RGBColor", red: 255, green: 255, blue: 255 } } }, _options: { dialogOptions: "dontDisplay" } },
            { _obj: "set", _target: [{ _ref: "channel", _property: "selection" }], to: { _enum: "ordinal", _value: "none" }, _options: { dialogOptions: "dontDisplay" } },
            { _obj: "make", _target: [{ _ref: "contentLayer" }], using: { _obj: "contentLayer", type: { _obj: "solidColorLayer", color: { _obj: "RGBColor", red: 0, green: 0, blue: 0 } } } },
            { _obj: "move", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }], to: { _ref: "layer", _index: 1 }, adjustment: false, version: 5, layerID: [85], _options: { dialogOptions: "dontDisplay" } },
          ],
          {}
        );
      });

      let options = {
        documentID: app.activeDocument.id,
        targetSize: { height: newHeight, width: newWidth },
        componentSize: 8,
        applyAlpha: true,
        colorProfile: "sRGB IEC61966-2.1",
        colorSpace: "RGB",
      };

      let pixels = await imaging.getPixels(options);
      let jpgBase64 = await imaging.encodeImageData({
        imageData: pixels.imageData,
        format: "jpg",
        quality: 1,
        base64: true,
      });

      await sendMessage("maskBase64", jpgBase64);

      pixels.imageData.dispose();
      app.activeDocument.activeHistoryState = beforeSnapshot;
    }, "Mask Sent to AI");
  } catch (error) {
    console.log("error", error);
  }
  maskunsavedchanges = false;
  console.log("saved Mask: ");
};

const saveImage = async () => {
  try {
    await core.executeAsModal(async () => {
      if (app.activeDocument === undefined) {
        throw "No open document";
      }
      const docWidth = app.activeDocument.width;
      const docHeight = app.activeDocument.height;

      let { newWidth, newHeight } = calculateNewDimensions(docWidth, docHeight);

      let options = {
        documentID: app.activeDocument.id,
        targetSize: { height: newHeight, width: newWidth },
        componentSize: 8,
        applyAlpha: true,
        colorProfile: "sRGB IEC61966-2.1",
        colorSpace: "RGB",
      };

      let pixels = await imaging.getPixels(options);
      let pngBase64 = await imaging.encodeImageData({
        imageData: pixels.imageData,
        base64: true,
      });

      await sendMessage("canvasBase64", pngBase64);

      pixels.imageData.dispose();
      canvasunsavedchanges = false;
    });
  } catch (error) {
    console.log("error", error);
  }
};
