import importlib
import subprocess
import os
import folder_paths
import sys

python_executable= sys.executable
node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
backend_path = os.path.join(node_path, 'Backend.py')
requirements_path = os.path.join(node_path, 'requirements.txt')

#remove venv method
venv_path = os.path.join(node_path, "venv")
if os.path.exists(venv_path):
    print("_PS_ removing venv method")
    import shutil
    shutil.rmtree(venv_path)

def verifyReq():
    with open(requirements_path, 'r') as file:
        requirements = file.readlines()
        requirements = [line.strip() for line in requirements]

    try:
        installed_packages_list = subprocess.check_output([python_executable, '-m', 'pip', 'list']).decode()    
    except:
        subprocess.run([python_executable, '-m', 'pip', 'install', '--upgrade', 'pip'], check=True)
        subprocess.run([python_executable, '-m', 'pip', 'install', '--upgrade', 'pip','setuptools'], check=True)
        installed_packages_list = subprocess.check_output([python_executable, '-m', 'pip', 'list']).decode()
        
    installed_packages = {line.split()[0].lower() for line in installed_packages_list.split('\n')[2:] if line}
    missing_packages = [pkg for pkg in requirements if pkg.lower() not in installed_packages]
    
    if missing_packages:
        print("_PS_ The following packages are missing:")
        print("\n".join(missing_packages))
        installReq()
    else:
        print("_PS_ All packages are installed.")

def installReq():
    subprocess.run([python_executable, '-m', 'pip', 'cache', 'purge'], check=True)
    subprocess.run([python_executable, '-m', 'pip', 'install', '--upgrade', 'pip'], check=True)
    subprocess.run([python_executable, '-m', 'pip', 'install', '--upgrade', 'pip','setuptools'], check=True)
    subprocess.run([python_executable, '-m', 'pip', 'install', '-r', requirements_path], check=True)

verifyReq()

print("_PS_ backend_path", backend_path)

default_directory = os.getcwd()
node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")

os.chdir(node_path)
subprocess.Popen([python_executable, backend_path],shell=True)
os.chdir(default_directory)

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
