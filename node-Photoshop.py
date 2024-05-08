from PIL import Image, ImageOps
import numpy as np
import torch
import os
import time
import base64
import torchvision.transforms.functional as tf
from io import BytesIO
import json
import os
import folder_paths
import hashlib
import sys
sys.stdout.reconfigure(encoding='utf-8')

class PhotoshopToComfyUI:
    @classmethod
    def INPUT_TYPES(cls):
        return { "required": {
            "enable_masking": ("BOOLEAN", {"default": "true"})
            }}

    RETURN_TYPES = ("IMAGE", "MASK","FLOAT",  "INT", "STRING", "STRING",)
    RETURN_NAMES = ("Photoshop Canvas", "Mask", "Slider", "Seed", "Positive Prompt", "Negative Prompt")
    FUNCTION = "PS_Execute"
    CATEGORY = "Photoshop"

    def PS_Execute(self, enable_masking):



        self.LoadDir()
        self.loadConfig()
        self.enable_masking=enable_masking
        
        self.SendImg()
        
        
        sliderValue= self.slider / 100

        return (
            self.canvas,
            self.mask,
            sliderValue,
            int(self.seed),
            self.psPrompt,
            self.ngPrompt,
        )

    def LoadDir(self, retry_count=0):
        try:
            node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
            with open(os.path.join(node_path,"data.json"), "r") as file:
                data = json.load(file)

            PluginData_path = data.get("dataDir", None)
            self.canvasDir = os.path.join(PluginData_path, "canvas")
            self.maskImgDir = os.path.join(PluginData_path, "mask")
            self.configJson = os.path.join(PluginData_path, "config.json")
        except:
            time.sleep(0.5)
            if retry_count < 4:  # 5 attempts in total
                self.LoadDir(retry_count + 1)
            else:
                raise Exception("Failed to load directory after 5 attempts. \n 🔴 Make sure you have installed and started the Photoshop Plugin Succesfully. \n 🔴 otherwise you can restart your photosop and your plugin to Fix this problem")


    def loadConfig(self, retry_count=0):
        try:
            with open(self.configJson, "r") as file:
                self.ConfigData = json.load(file)
        except:
            time.sleep(0.5)
            if retry_count < 4:  # 5 attempts in total
                self.loadConfig(retry_count + 1)
            else:
                raise Exception("Failed to load directory after 5 attempts. \n 🔴 Make sure you have installed and started the Photoshop Plugin Succesfully. \n 🔴 otherwise you can restart your photosop and your plugin to Fix this problem")

            
        self.psPrompt = self.ConfigData["postive"]
        self.ngPrompt = self.ConfigData["negative"]
        self.seed = self.ConfigData["seed"]
        self.slider = self.ConfigData["slider"]

    def SendImg(self ):
        self.loadImg(self.canvasDir)
        self.canvas = self.i.convert("RGB")
        self.canvas = np.array(self.canvas).astype(np.float32) / 255.0
        self.canvas = torch.from_numpy(self.canvas)[None,]
        self.width, self.height = self.i.size

        if self.enable_masking:
            self.loadImg(self.maskImgDir)
        else:
            self.loadImg("")
        self.i = ImageOps.exif_transpose(self.i)
        self.mask = np.array(self.i.getchannel("B")).astype(np.float32) / 255.0
        self.mask = torch.from_numpy(self.mask)

    def loadImg(self, path):
        try:
            with open(path, "r") as file:
                base64_data = file.read()
            img_data = base64.b64decode(base64_data)

            self.i = Image.open(BytesIO(img_data))
            self.i.verify()
            self.i = Image.open(BytesIO(img_data))
        except:
            self.i = Image.new(mode="RGB", size=(24, 24), color=(0, 0, 0))
        if not self.i:
            return

    @staticmethod
    def IS_CHANGED(mask_hash= 0, config_hash= 0):
        canvas_hash= 0
        node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
        with open(os.path.join(node_path, "data.json"), "r") as file:
            data = json.load(file)

            PluginData_path = data.get("dataDir", None)
            canvasDir = os.path.join(PluginData_path, "canvas")
            maskImgDir = os.path.join(PluginData_path, "mask")
            configJson = os.path.join(PluginData_path, "config.json")

            if os.path.exists(canvasDir):
                with open(canvasDir, "rb") as canvasDir_file:
                    canvas_content = canvasDir_file.read()
                    canvas_hash = hashlib.sha256(canvas_content).hexdigest()

            if os.path.exists(configJson):
                with open(configJson, "rb") as configJson_file:
                    config_content = configJson_file.read()
                    config_hash = hashlib.sha256(config_content).hexdigest()

            if os.path.exists(maskImgDir):
                with open(maskImgDir, "rb") as mask_file:
                    mask_content = mask_file.read()
                    mask_hash = hashlib.sha256(mask_content).hexdigest()

        
        
        return canvas_hash
        
        
        



class ComfyUIToPhotoshop:
    INPUT_TYPES = lambda:{ "required": {
            "image": ("IMAGE", ) 
            }}
    RETURN_TYPES = ()
    OUTPUT_NODE = True
    FUNCTION = "execute"
    CATEGORY = "Photoshop"

    def execute(self, image: torch.Tensor):
        node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
        with open(os.path.join(node_path,"data.json"), "r") as file:
            data = json.load(file)

        PluginData_path = data.get("dataDir", None)
        
        self.saveImgDir = os.path.join(PluginData_path, "render.png")
        assert isinstance(image, torch.Tensor)
        self.image = image
        self.save_image(self.image, self.saveImgDir)
        return ()

    def save_image(self, img: torch.Tensor, subpath):
        try:
            if len(img.shape) == 4 and img.shape[0] == 1:
                img = img.squeeze(0)
            if len(img.shape) != 3 or img.shape[2] != 3:
                raise ValueError(
                    f"Input image must have 3 channels and a 3-dimensional shape, but got {img.shape}"
                )

            img = img.permute(2, 0, 1)
            -img.clamp(0, 1)
            img = tf.to_pil_image(img)

            img.save(subpath, format="JPEG", quality=100)
        except:
            time.sleep(0.1)
            self.save_image(self.image, self.saveImgDir)

    @classmethod
    def IS_CHANGED(cls, ImgDir, MaskDir):
        with open(ImgDir, "rb") as img_file:
            if os.path.exists(MaskDir):
                with open(MaskDir, "rb") as mask_file:
                    return base64.b64encode(mask_file.read()).decode(
                        "utf-8"
                    ) + base64.b64encode(img_file.read()).decode("utf-8")
            else:
                return base64.b64encode(img_file.read()).decode("utf-8")


NODE_CLASS_MAPPINGS = {
    "🔹Photoshop ComfyUI Plugin": PhotoshopToComfyUI,
    "🔹SendTo Photoshop Plugin": ComfyUIToPhotoshop,
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "PhotoshopToComfyUI": "🔹Photoshop ComfyUI Plugin",
    "SendToPhotoshop": "🔹Send To Photoshop",
}
