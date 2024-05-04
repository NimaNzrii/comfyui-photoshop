import importlib
import subprocess
import os
import folder_paths
import sys

def get_python_executable(venv_path):
    if sys.platform.startswith('win'):
        return os.path.join(venv_path, 'Scripts', 'python.exe')
    else:
        return os.path.join(venv_path, 'bin', 'python')

node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
venv_path = os.path.join(node_path, "venv")

if not os.path.exists(node_path):
    print(f"✨ Node path does not exist: {node_path}")

if not os.path.exists(venv_path):
    print("✨ Installing venv...")
    if sys.platform.startswith('win'):
        subprocess.run([sys.executable, '-m', 'virtualenv', venv_path], shell=True, check=True)
    else:
        subprocess.run([sys.executable, '-m', 'venv', venv_path], check=True)
    print("✨ Installing requirements...")
    requirements_path = os.path.join(node_path, 'requirements.txt')
    python_executable = get_python_executable(venv_path)
    subprocess.run([python_executable, '-m', 'pip', 'install', '-r', requirements_path], check=True)
    print("✨ Installed successfully")

backend_path = os.path.join(node_path, 'Backend.py')
python_path = get_python_executable(venv_path)

if not os.path.exists(backend_path):
    print(f"✨ Backend.py path does not exist: {backend_path}")

try:
    from photoshop import PhotoshopConnection
except ImportError:
    subprocess.run([python_executable, "-m", "pip", "uninstall", "photoshop"], check=True)
    subprocess.run([python_executable, "-m", "pip", "uninstall", "photoshop-connection"], check=True)
    subprocess.run([python_executable, "-m", "pip", "install", "photoshop-connection"], check=True)

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
