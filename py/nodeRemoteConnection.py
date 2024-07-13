from PIL import Image, ImageOps
import numpy as np
import torch
import tempfile
import os
import base64
import subprocess


class PhotoshopConnections:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "Selection_To_Mask": ("BOOLEAN", {"default": False}),
                "password": ("STRING", {"default": "12341234"}),
                "Server": ("STRING", {"default": "127.0.0.1"}),
                "port": ("STRING", {"default": "49494"}),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("Photoshop Canvas", "Mask")
    FUNCTION = "PS_Execute"
    CATEGORY = "Photoshop"

    def PS_Execute(self, Selection_To_Mask, password, Server, port):
        try:
            from photoshop import PhotoshopConnection
        except:
            subprocess.run(
                ["python", "-m", "pip", "uninstall", "photoshop"], check=True
            )
            subprocess.run(
                ["python", "-m", "pip", "uninstall", "photoshop-connection"], check=True
            )
            subprocess.run(
                ["python", "-m", "pip", "install", "photoshop-connection"], check=True
            )

        self.TmpDir = tempfile.gettempdir().replace("\\", "/")
        self.ImgDir = f"{self.TmpDir}/temp_image.jpg"
        self.MaskDir = f"{self.TmpDir}/temp_image_mask.jpg"

        ImgScript = f"""var saveFile = new File("{self.ImgDir}"); var jpegOptions = new JPEGSaveOptions(); jpegOptions.quality = 10; activeDocument.saveAs(saveFile, jpegOptions, true);"""

        Maskscript = f"""try{{var e=app.activeDocument,a=e.selection.bounds,t=e.activeHistoryState,i=e.artLayers.add(),s=new SolidColor,r=e.artLayers.add(),l=new SolidColor,c=new File("{{self.MaskDir}}"),n=new JPEGSaveOptions;function o(){{s.rgb.hexValue="000000",l.rgb.hexValue="FFFFFF",e.activeLayer=r,e.selection.fill(l),e.activeLayer=i,e.selection.selectAll(),e.selection.fill(s),n.quality=1,e.saveAs(c,n,!0),e.activeHistoryState=t}}e.suspendHistory("Mask Applied","main()")}}catch(y){{File("{{self.MaskDir}}").remove()}}"""

        with PhotoshopConnection(password=password, host=Server, port=port) as ps_conn:
            ps_conn.execute(ImgScript)
            if Selection_To_Mask:
                ps_conn.execute(Maskscript)

        self.SendImg(Selection_To_Mask)
        return (self.image, self.mask, self.width, self.height)

    def SendImg(self, Selection_To_Mask):
        self.loadImg(self.ImgDir)
        self.image = self.i.convert("RGB")
        self.image = np.array(self.image).astype(np.float32) / 255.0
        self.image = torch.from_numpy(self.image)[None,]
        self.width, self.height = self.i.size

        if Selection_To_Mask:
            self.loadImg(self.MaskDir)
            self.i = ImageOps.exif_transpose(self.i)
            self.mask = np.array(self.i.getchannel("B")).astype(np.float32) / 255.0
            self.mask = torch.from_numpy(self.mask)
        else:
            self.i = Image.new(mode="RGB", size=(1, 1), color=(0, 0, 0))
            self.i = ImageOps.exif_transpose(self.i)
            self.mask = np.array(self.i.getchannel("B")).astype(np.float32) / 255.0
            self.mask = torch.from_numpy(self.mask)

    def loadImg(self, path):
        try:
            self.i = Image.open(path)
            self.i.verify()
            self.i = Image.open(path)
        except:
            self.i = Image.new(mode="RGB", size=(1, 1), color=(0, 0, 0))
        if not self.i:
            return

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


NODE_CLASS_MAPPINGS = {"🔹 Photoshop RemoteConnection": PhotoshopConnections}

NODE_DISPLAY_NAME_MAPPINGS = {"PhotoshopConnection": "🔹 Photoshop RemoteConnection"}
