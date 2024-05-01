import importlib
import subprocess
import os
import folder_paths
import sys

default_directory = os.getcwd()
node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
os.chdir(node_path)

venv_path = "venv"

if not os.path.exists(venv_path):
    print("Installing venv...")
    subprocess.run([sys.executable, '-m', 'virtualenv', venv_path], shell=True) 
    print("Installing requirements...")
    subprocess.run([os.path.join(venv_path, 'Scripts', 'python.exe'), '-m', 'pip', 'install', '-r', 'requirements.txt'], shell=True)
    print("Installed successfully")



popup_window_path = os.path.join(node_path,'Backend.py')
python_path = os.path.join(node_path,'venv', 'Scripts', 'python.exe')
Python_patch = os.path.abspath(python_path)
subprocess.Popen([Python_patch, popup_window_path])

os.chdir(default_directory)



try:
    from photoshop import PhotoshopConnection
except ImportError:
    subprocess.run(["python.exe", "-m", "pip", "uninstall", "photoshop"])
    subprocess.run(["python.exe", "-m", "pip", "uninstall", "photoshop-connection"])
    subprocess.run(["python.exe", "-m", "pip", "install", "photoshop-connection"])

node_list = ["node-Photoshop", "node-Photoshop-noplugin"]

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

for module_name in node_list:
    imported_module = importlib.import_module(".{}".format(module_name), __name__)

    NODE_CLASS_MAPPINGS = {**NODE_CLASS_MAPPINGS, **imported_module.NODE_CLASS_MAPPINGS}
    NODE_DISPLAY_NAME_MAPPINGS = {
        **NODE_DISPLAY_NAME_MAPPINGS,
        **imported_module.NODE_DISPLAY_NAME_MAPPINGS,
    }

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]

WEB_DIRECTORY = "js"
