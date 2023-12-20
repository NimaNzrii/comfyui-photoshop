import importlib
import subprocess
# import os

# directory_path = r".\ComfyUI\custom_nodes\comfyui-popup_preview"

# if not os.path.exists(directory_path):
#     print("comfyui-popup_preview installing")
#     subprocess.run(["git", "clone", "https://github.com/NimaNzrii/comfyui-popup_preview.git", directory_path], shell=True)
#     print("comfyui-popup_preview cloned successfully!")
# else:
#     print("Directory already exists!")

try:
    from photoshop import PhotoshopConnection
except ImportError:
    subprocess.run(["python.exe", "-m", "pip", "uninstall", "photoshop"])
    subprocess.run(["python.exe", "-m", "pip", "uninstall", "photoshop-connection"])
    subprocess.run(["python.exe", "-m", "pip", "install", "photoshop-connection"])

node_list = [ 
    "photoshop"
]

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

for module_name in node_list:
    imported_module = importlib.import_module(".{}".format(module_name), __name__)

    NODE_CLASS_MAPPINGS = {**NODE_CLASS_MAPPINGS, **imported_module.NODE_CLASS_MAPPINGS}
    NODE_DISPLAY_NAME_MAPPINGS = {**NODE_DISPLAY_NAME_MAPPINGS, **imported_module.NODE_DISPLAY_NAME_MAPPINGS}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
