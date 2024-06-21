from server import PromptServer
from aiohttp import web
import os
import json
import sys
import folder_paths

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)),".."))

# Set the directory for workflows
nodepath = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop", "data", "workflows")
workflows_directory = os.path.join(nodepath, '..', "custom_nodes", "comfyui-photoshop", "data", "workflows")

# Define the directory for PS inputs
ps_inputs_directory = os.path.join(folder_paths.get_folder_paths("custom_nodes")[0], "comfyui-photoshop", "data", "ps_inputs")

@PromptServer.instance.routes.get("/PSworkflows")
async def get_workflows(request):
    files = []
    for dirpath, directories, file in os.walk(workflows_directory):
        for file in file:
            if file.endswith(".json"):
                files.append(os.path.relpath(os.path.join(dirpath, file), workflows_directory))
    return web.json_response(list(map(lambda f: os.path.splitext(f)[0].replace("\\", "/"), files)))

@PromptServer.instance.routes.get("/PSworkflows/{name:.+}")
async def get_workflow(request):
    file = os.path.abspath(os.path.join(workflows_directory, request.match_info["name"] + ".json"))
    if os.path.commonpath([file, workflows_directory]) != workflows_directory:
        return web.Response(status=403)

    return web.FileResponse(file)

@PromptServer.instance.routes.post("/PSworkflows")
async def save_workflow(request):
    json_data = await request.json()
    file = os.path.abspath(os.path.join(workflows_directory, json_data["name"] + ".json"))
    if os.path.commonpath([file, workflows_directory]) != workflows_directory:
        return web.Response(status=403)

    if os.path.exists(file) and ("overwrite" not in json_data or json_data["overwrite"] == False):
        return web.Response(status=409)

    sub_path = os.path.dirname(file)
    if not os.path.exists(sub_path):
        os.makedirs(sub_path)

    with open(file, "w") as f:
        f.write(json.dumps(json_data["workflow"]))

    return web.Response(status=201)

# Add routes for PS inputs
@PromptServer.instance.routes.get("/PSinputs/PS_canvas.png")
async def get_ps_canvas(request):
    file = os.path.abspath(os.path.join(ps_inputs_directory, "PS_canvas.png"))
    if os.path.commonpath([file, ps_inputs_directory]) != ps_inputs_directory:
        return web.Response(status=403)

    return web.FileResponse(file)

@PromptServer.instance.routes.get("/PSinputs/PS_mask.png")
async def get_ps_mask(request):
    file = os.path.abspath(os.path.join(ps_inputs_directory, "PS_mask.png"))
    if os.path.commonpath([file, ps_inputs_directory]) != ps_inputs_directory:
        return web.Response(status=403)

    return web.FileResponse(file)
