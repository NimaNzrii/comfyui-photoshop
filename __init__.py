import importlib
import subprocess
import os
import folder_paths
import sys
import pkg_resources
import shutil

sys.stdout.reconfigure(encoding='utf-8')

def installvenv():
    print("_PS_ Installing venv...")
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'virtualenv'], check=True)
    if sys.platform.startswith('win'):
        subprocess.run([sys.executable, '-m', 'virtualenv', venv_path], shell=True, check=True)
    else:
        subprocess.run([sys.executable, '-m', 'venv', venv_path], check=True)

    python_executable = get_python_executable(venv_path)
    if not os.path.exists(python_executable):
        raise FileNotFoundError(f"_PS_ Python executable path does not exist: {python_executable}")
    else: 
        print(f"_PS_ Python executable installed successfully at {python_executable}")

    print("_PS_ Installing requirements...")
    subprocess.run([python_executable, '-m', 'pip', 'cache', 'purge'], check=True)
    subprocess.run([python_executable, '-m', 'pip', 'install', '--upgrade', 'pip'], check=True)
    subprocess.run([python_executable, '-m', 'pip', 'install', '--upgrade', 'pip','setuptools'], check=True)
    requirements_path = os.path.join(node_path, 'requirements.txt')
    subprocess.run([python_executable, '-m', 'pip', 'install', '-r', requirements_path], check=True)
    print("_PS_ Requirements installed successfully")

def get_python_executable(venv_path):
    if sys.platform.startswith('win'):
        return os.path.join(venv_path, 'Scripts', 'python.exe')
    else:
        return os.path.join(venv_path, 'bin', 'python')


try:
    node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")
    venv_path = os.path.join(node_path, "venv")

    if not os.path.exists(node_path):
        raise FileNotFoundError(f"_PS_ Node path does not exist: {node_path}")


    if os.path.exists(venv_path):
        python_executable = get_python_executable(venv_path)
        requirements_path = os.path.join(node_path, 'requirements.txt')

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

            shutil.rmtree(venv_path)
            print(f"_PS_ Virtual environment at {venv_path} has been removed.")
            installvenv()
        else:
            print("All packages are installed.")
    else:
        installvenv()

    backend_path = os.path.join(node_path, 'Backend.py')
    python_path = get_python_executable(venv_path)

    print("_PS_ python_path", python_path)
    print("_PS_ backend_path", backend_path)

    if not os.path.exists(python_path):
        raise FileNotFoundError(f"_PS_ python_path path does not exist")

    if not os.path.exists(backend_path):
        raise FileNotFoundError(f"_PS_ Backend.py path does not exist")

    default_directory = os.getcwd()
    node_path = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop")

    print("_PS_ node_path", node_path)

    os.chdir(node_path)
    subprocess.Popen([python_path, backend_path])
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

except FileNotFoundError as e:
    print(str(e))
except subprocess.CalledProcessError as e:
    print(f"_PS_ An error occurred while running a subprocess: {e}")
except Exception as e:
    print(f"_PS_ An unexpected error occurred: {e}")
