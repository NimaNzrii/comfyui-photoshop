import importlib
import os
import folder_paths
import sys

py = os.path.join(
    folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop", "py"
)
sys.path.append(py)

node_list = ["nodePlugin", "nodeRemoteConnection"]
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

for module_name in node_list:
    imported_module = importlib.import_module(module_name)
    NODE_CLASS_MAPPINGS.update(imported_module.NODE_CLASS_MAPPINGS)
    NODE_DISPLAY_NAME_MAPPINGS.update(imported_module.NODE_DISPLAY_NAME_MAPPINGS)


importlib.import_module("BackEnd")
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
WEB_DIRECTORY = "js"
