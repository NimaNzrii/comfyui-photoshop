from PIL import Image
import numpy as np
import torch
import time
import tempfile 
from photoshop import PhotoshopConnection


class PhotoshopToComfyUINode:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "password": ("STRING", {"default": "12341234"}),
                "wait_for_photoshop_changes": ("BOOLEAN", {"default": False})
            }
        }
    
    RETURN_TYPES = ("IMAGE", "INT", "INT")
    RETURN_NAMES = ("IMAGE", "width", "height")
    FUNCTION = "load_to_comfy_ui"
    CATEGORY = "image"
    
    def Photoshop_import(self, password):
        self.path = tempfile.gettempdir().replace("\\", "/")+'/temp_image.jpg'
        try:
            with PhotoshopConnection(password=password) as ps_conn:
                ps_conn.execute(f'var saveFile = new File("{self.path}");'
                            'var jpegOptions = new JPEGSaveOptions();'
                            'jpegOptions.quality = 10;'
                            'activeDocument.saveAs(saveFile, jpegOptions, true);')

        except Exception as e:
            print("Your photoshop Password is incorrect or it didn't launch")
        return False


    def handler(conn):
        return True  # This terminates subscription
                
    def Waitforchange(self, password):
        while True:
            try:
                with PhotoshopConnection(password=password) as conn:
                    conn.subscribe('imageChanged', self.Photoshop_import, block=True)
                    conn.execute(f'var saveFile = new File("{self.path}");'
                                 'var jpegOptions = new JPEGSaveOptions();'
                                 'jpegOptions.quality = 10;'
                                 'activeDocument.saveAs(saveFile, jpegOptions, true);')
                break  # در صورت عدم بروز خطا، از حلقه خارج شوید
            except Exception as e:
                print(f"An error occurred: {e}")
                time.sleep(0.5)  
                self.Photoshop_import(password)


    def load_to_comfy_ui(self, password, wait_for_photoshop_changes):
        self.Photoshop_import(password)

        if wait_for_photoshop_changes:
            self.Waitforchange(password)
            
        try:
            i = Image.open(self.path)
            i.verify()
            i = Image.open(self.path)
            
        except OSError as e:
            print("Load fail")
            time.sleep(0.05)

            try:
                i = Image.open(self.path)
                print("Try again!")
                    
            except OSError as e:
                print("Image doesn't exist!")
                i = Image.new(mode='RGB', size=(512, 512), color=(0, 0, 0))

        if not i:
            return
            
        
        image=i.convert('RGB')
        image = np.array(image).astype(np.float32) / 255.0
        image = torch.from_numpy(image)[None,]


        width, height = i.size
        return (image, width, height)
        

    @classmethod
    def IS_CHANGED(cls, image_path):
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()


NODE_CLASS_MAPPINGS = {
    "PhotoshopToComfyUI": PhotoshopToComfyUINode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PhotoshopToComfyUI": "Photoshop to ComfyUI"
}
