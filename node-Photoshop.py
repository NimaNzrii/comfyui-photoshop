import hashlib
import asyncio
import websockets
import json
import base64
import os
import time
import torch
import numpy as np
from PIL import Image, ImageOps
from io import BytesIO
import folder_paths
import sys
import torchvision.transforms.functional as tf

sys.stdout.reconfigure(encoding='utf-8')
current_path = os.path.dirname(os.path.abspath(__file__))
comfui_path = os.path.abspath(os.path.join(current_path, '..', '..'))
input_path = os.path.join(comfui_path, "input")

def is_changed_file(filepath):
    try:
        with open(filepath, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()
        if not hasattr(is_changed_file, "file_hashes"):
            is_changed_file.file_hashes = {}
        if filepath in is_changed_file.file_hashes:
            if is_changed_file.file_hashes[filepath] == file_hash:
                return False
        is_changed_file.file_hashes[filepath] = file_hash
        return float("NaN")
    except Exception as e:
        print(f"Error in is_changed_file for {filepath}: {e}")
        return False

class PhotoshopToComfyUI:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    RETURN_TYPES = ("IMAGE", "MASK", "FLOAT", "INT", "STRING", "STRING", "INT", "INT")
    RETURN_NAMES = ("Canvas", "Mask", "Slider", "Seed", "+", "-", "W", "H")
    FUNCTION = "PS_Execute"
    CATEGORY = "Photoshop"

    def PS_Execute(self):
        self.LoadDir()
        self.loadConfig()
        self.SendImg()

        sliderValue = self.slider / 100

        return (
            self.canvas,
            self.mask,
            sliderValue,
            int(self.seed),
            self.psPrompt,
            self.ngPrompt,
            int(self.width),
            int(self.height),
        )

    def LoadDir(self, retry_count=0):
        try:
            nodepath = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
            print("nodepath", nodepath)

            self.canvasDir = os.path.join(input_path, "PS_canvas.png")
            self.maskImgDir = os.path.join(input_path, "PS_mask.png")
            self.configJson = os.path.join(nodepath, "data", "config.json")
        except:
            time.sleep(0.5)
            if retry_count < 4:
                self.LoadDir(retry_count + 1)
            else:
                raise Exception("Failed to load directory after 5 attempts. \n 🔴 Make sure you have installed and started the Photoshop Plugin Successfully. \n 🔴 otherwise you can restart your Photoshop and your plugin to fix this problem.")

    def loadConfig(self, retry_count=0):
        try:
            with open(self.configJson, "r") as file:
                self.ConfigData = json.load(file)
        except:
            time.sleep(0.5)
            if retry_count < 4:
                self.loadConfig(retry_count + 1)
            else:
                raise Exception("Failed to load config after 5 attempts. \n 🔴 Make sure you have installed and started the Photoshop Plugin Successfully. \n 🔴 otherwise you can restart your Photoshop and your plugin to fix this problem.")
            
        self.psPrompt = self.ConfigData["positive"]
        self.ngPrompt = self.ConfigData["negative"]
        self.seed = self.ConfigData["seed"]
        self.slider = self.ConfigData["slider"]

    def SendImg(self):
        self.loadImg(self.canvasDir)
        self.canvas = self.i.convert("RGB")
        self.canvas = np.array(self.canvas).astype(np.float32) / 255.0
        self.canvas = torch.from_numpy(self.canvas)[None,]
        self.width, self.height = self.i.size 

        self.loadImg(self.maskImgDir)
        self.i = ImageOps.exif_transpose(self.i)
        self.mask = np.array(self.i.getchannel("B")).astype(np.float32) / 255.0
        self.mask = torch.from_numpy(self.mask)

    def loadImg(self, path):
        try:
            with open(path, "rb") as file:
                img_data = file.read()
            self.i = Image.open(BytesIO(img_data))
            self.i.verify()
            self.i = Image.open(BytesIO(img_data))
        except:
            self.i = Image.new(mode="RGB", size=(24, 24), color=(0, 0, 0))
        if not self.i:
            return

    @classmethod
    def IS_CHANGED(cls):
        try:
            nodepath = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
            configJson = os.path.join(nodepath, "data", "config.json")
            canvasDir = os.path.join(input_path, "PS_canvas.png")
            maskImgDir = os.path.join(input_path, "PS_mask.png")

            config_changed = is_changed_file(configJson)
            canvas_changed = is_changed_file(canvasDir)
            mask_changed = is_changed_file(maskImgDir)

            return config_changed or canvas_changed or mask_changed
        except Exception as e:
            print("Error in IS_CHANGED:", e)
            return 0

class ComfyUIToPhotoshop:
    INPUT_TYPES = lambda: {
        "required": {
            "output": ("IMAGE", )
        }
    }
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "execute"
    CATEGORY = "Photoshop"

    async def send2backend(self, message):
        async with websockets.connect("ws://127.0.0.1:8765") as websocket:
            await websocket.send(message)
            await websocket.close()

    def svimg(self, img: torch.Tensor):
        try:
            nodepath = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
            renderDir = os.path.join(nodepath, "data", "render.png")
            
            if len(img.shape) == 4 and img.shape[0] == 1:
                img = img.squeeze(0)
            if len(img.shape) != 3 or img.shape[2] != 3:
                raise ValueError(
                    f"Input image must have 3 channels and a 3-dimensional shape, but got {img.shape}"
                )

            img = img.permute(2, 0, 1)
            img = img.clamp(0, 1).numpy() * 255
            img = img.astype('uint8')
            img = Image.fromarray(img.transpose(1, 2, 0))

            with BytesIO() as output:
                img.save(output, format="PNG")
                output.seek(0)
                img_no_metadata = Image.open(output)
                img_no_metadata.save(renderDir, format="PNG")

            return "render"
        except Exception as e:
            print(f"_PS_ An error occurred: {e}")
            return "error"

    def execute(self, output: torch.Tensor):
        try:
            assert isinstance(output, torch.Tensor)
            self.image = output
            self.svimg(self.image)
            asyncio.run(self.send2backend("render"))
        except Exception as e:
            print(f"_PS_ error on send2Ps: {e}")
        return ()

NODE_CLASS_MAPPINGS = {
    "🔹Photoshop ComfyUI Plugin": PhotoshopToComfyUI,
    "🔹SendTo Photoshop Plugin": ComfyUIToPhotoshop,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PhotoshopToComfyUI": "🔹Photoshop ComfyUI Plugin",
    "SendToPhotoshop": "🔹Send To Photoshop",
}
