import importlib
import os
import folder_paths

# Define the path to the 'py' directory
py = os.path.join(
    folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop", "py"
)

# List of modules
node_list = ["nodePlugin", "nodeRemoteConnection"]
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Import each module from the 'py' directory
for module_name in node_list:
    spec = importlib.util.spec_from_file_location(
        module_name, os.path.join(py, f"{module_name}.py")
    )
    imported_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(imported_module)
    NODE_CLASS_MAPPINGS.update(imported_module.NODE_CLASS_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(imported_module.NODE_DISPLAY_NAME_MAPPINGS)

# Import 'Backend' module
backend_spec = importlib.util.spec_from_file_location(
    "Backend", os.path.join(py, "Backend.py")
)
backend_module = importlib.util.module_from_spec(backend_spec)
backend_spec.loader.exec_module(backend_module)

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
WEB_DIRECTORY = "js"
