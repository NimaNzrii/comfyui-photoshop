import importlib
import subprocess
import os
import folder_paths
import sys

node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
if not os.path.exists(node_path):
    print("✨ Node path does not exist!")
    
venv_path = os.path.join(node_path, "venv")

if not os.path.exists(venv_path):
    print("✨ Installing venv...")
    subprocess.run([sys.executable, '-m', 'virtualenv', venv_path], shell=True)
    print("✨ Installing requirements...")
    requirements_path = os.path.join(node_path, 'requirements.txt')
    subprocess.run([os.path.join(venv_path, 'Scripts', 'python.exe'), '-m', 'pip', 'install', '-r', requirements_path], shell=True)
    print("✨ Installed successfully")

backend_path = os.path.join(node_path, 'Backend.py')
python_path = os.path.join(venv_path, 'Scripts', 'python.exe')


if not os.path.exists(venv_path):
    print("✨ venv_path does not exist!")

if not os.path.exists(python_path):
    print("✨ Python path does not exist!")
    
if not os.path.exists(backend_path):
    print("✨ Backend.py path does not exist!")

subprocess.Popen([python_path, backend_path])


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
