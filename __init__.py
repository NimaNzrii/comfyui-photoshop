import importlib
import subprocess
import os
import folder_paths
import sys
import platform

pythonExe = sys.executable #default python file dir
pyDir = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop", "py")
backDir = os.path.join(pyDir, 'Backend.py')

sys.path.append(pyDir) #import http_server.py to comfyui system path

if platform.system() in ["Linux", "Darwin"]:
    process = subprocess.Popen([pythonExe, backDir], cwd=pyDir)
elif platform.system() == "Windows":
    process = subprocess.Popen([pythonExe, backDir], shell=True, cwd=pyDir)

node_list = ["node-Photoshop", "node-Photoshop-noplugin"]
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']

for module_name in node_list:
    try:
        imported_module = importlib.import_module(module_name)
        NODE_CLASS_MAPPINGS.update(imported_module.NODE_CLASS_MAPPINGS)
        NODE_DISPLAY_NAME_MAPPINGS.update(imported_module.NODE_DISPLAY_NAME_MAPPINGS)
    except ImportError as e:
        print(f"_PS_ Error importing {module_name}: {e}")

importlib.import_module("http_server")
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
WEB_DIRECTORY = "js"
