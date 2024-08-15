import os
import platform
import subprocess
import sys
import uuid
import json
import base64
from aiohttp import web, WSMsgType
import folder_paths
from server import PromptServer

# Set up paths
nodepath = os.path.join(
    folder_paths.get_folder_paths("custom_nodes")[0],
    "comfyui-photoshop",
)
workflows_directory = os.path.join(nodepath, "data", "workflows")
ps_inputs_directory = os.path.join(
    folder_paths.get_folder_paths("custom_nodes")[0],
    "comfyui-photoshop",
    "data",
    "ps_inputs",
)

clients = {}
photoshop_users = []
comfyui_users = []


# Utility functions
def force_pull():
    fetch_result = subprocess.run(
        ["git", "fetch"], capture_output=True, text=True, cwd=nodepath
    )
    print(fetch_result.stdout)
    if fetch_result.returncode != 0:
        print(f"# PS: Fetch error: {fetch_result.stderr}")
        return

    reset_result = subprocess.run(
        ["git", "reset", "--hard", "origin/main"],
        capture_output=True,
        text=True,
        cwd=nodepath,
    )
    print(reset_result.stdout)
    if reset_result.returncode != 0:
        print(f"# PS: Reset error: {reset_result.stderr}")
        return


def install_plugin():
    installer_path = os.path.join(nodepath, "Install_Plugin", "installer.py")
    subprocess.run([sys.executable, installer_path])


async def save_file(data, filename):
    data = base64.b64decode(data)
    with open(os.path.join(ps_inputs_directory, filename), "wb") as file:
        file.write(data)


async def save_config(data):
    with open(
        os.path.join(ps_inputs_directory, "config.json"),
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(data, file, ensure_ascii=False)


async def send_message(users, type, message=True):
    try:
        if not users:
            print("# PS: PS not connected")
            return "PS not connected"

        latest_user = users[-1]
        if latest_user in clients:
            ws = clients[latest_user]["ws"]
            data = json.dumps({type: message}) if type else message
            await ws.send_str(data)
        else:
            print(f"# PS: User {latest_user} not connected")
    except Exception as e:
        print(f"# PS: error send_message: {e}")


# Websocket handler
@PromptServer.instance.routes.get("/ps/ws")
async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    client_id = request.query.get("clientId", str(uuid.uuid4()))
    platform = request.query.get("platform", "unknown")
    clients[client_id] = {"ws": ws, "platform": platform}

    if platform == "ps":
        photoshop_users.append(client_id)
        print(f"# PS: {client_id} Photoshop Connected")
        await send_message(comfyui_users, "photoshopConnected")

    elif platform == "cm":
        comfyui_users.append(client_id)
        if len(photoshop_users) > 0:
            await send_message(comfyui_users, "photoshopConnected")

    async for msg in ws:
        if msg.type == WSMsgType.TEXT:
            await handle_message(client_id, platform, msg.data)
        elif msg.type == WSMsgType.ERROR:
            print(f"# PS: Connection error from client {client_id}: {ws.exception()}")

    await handle_disconnect(client_id, platform)
    return ws


async def handle_message(client_id, platform, data):
    msg = json.loads(data)

    if platform == "cm":
        try:
            if "pullupdate" in msg:
                await send_message(
                    comfyui_users,
                    "alert",
                    "Updating, please Restart comfyui after update",
                )
                force_pull()
            elif "install_plugin" in msg:
                result = install_plugin()
                if result:
                    await send_message(comfyui_users, "alert", result)
            else:
                await send_message(photoshop_users, "", json.dumps(msg))
        except Exception as e:
            print(f"# PS: error fromComfyui: {e}")

    elif platform == "ps":
        try:
            # ابتدا پردازش کلیدهای دیگر
            if "canvasBase64" in msg:
                await save_file(msg["canvasBase64"], "PS_canvas.png")
            if "maskBase64" in msg:
                await save_file(msg["maskBase64"], "PS_mask.png")
            if "configdata" in msg:
                await save_config(msg["configdata"])
            if "workspace" in msg:
                await send_message(comfyui_users, "workspace", msg["workspace"])

            # بررسی وجود کلید queue
            if "queue" in msg and msg["queue"]:
                # در نهایت ارسال پیام queue به سمت comfyui
                await send_message(comfyui_users, "queue", msg["queue"])

            # سایر پیام‌های معمولی که کلید خاصی ندارند
            if not any(
                key in msg
                for key in [
                    "configdata",
                    "maskBase64",
                    "canvasBase64",
                    "workspace",
                    "queue",
                ]
            ):
                await send_message(comfyui_users, "", json.dumps(msg))
        except Exception as e:
            print(f"# PS: error fromComfyui: {e}")


async def handle_disconnect(client_id, platform):
    del clients[client_id]
    if platform == "ps":
        photoshop_users.remove(client_id)
        print(f"# PS: User {client_id} disconnected from Photoshop (ps)")
    elif platform == "cm":
        comfyui_users.remove(client_id)
        print(f"# PS: User {client_id} disconnected from ComfyUI (cm)")


@PromptServer.instance.routes.get("/ps/workflows/{name:.+}")
async def get_workflow(request):
    file = os.path.abspath(
        os.path.join(workflows_directory, request.match_info["name"] + ".json")
    )
    if os.path.commonpath([file, workflows_directory]) != workflows_directory:
        return web.Response(status=403)
    return web.FileResponse(file)


@PromptServer.instance.routes.get("/ps/inputs/{filename}")
async def get_workflow(request):
    file = os.path.abspath(
        os.path.join(ps_inputs_directory, request.match_info["filename"])
    )
    if os.path.commonpath([file, ps_inputs_directory]) != ps_inputs_directory:
        return web.Response(status=403)
    return web.FileResponse(file)


@PromptServer.instance.routes.get("/ps/renderdone")
async def handle_render_done(request):
    print("# PS: render done")
    try:
        filename = request.rel_url.query.get("filename")
        patch = os.path.join(folder_paths.get_temp_directory(), filename)

        with open(patch, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        await send_message(photoshop_users, "render", encoded_string)
    except Exception as e:
        print(f"# PS: Error reading or sending render.png: {e}")
    return web.Response(text="Render sent to ps")
