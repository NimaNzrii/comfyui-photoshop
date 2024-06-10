import asyncio
import websockets
import json
import base64
import os
import shutil
from contextlib import asynccontextmanager
import platform as platform

# Global Variables
local_plugin_folder = None
pluginver = None
clients = {}
mask_save_semaphore = asyncio.Semaphore(0)

# Set up paths
current_path = os.path.dirname(os.path.abspath(__file__))
comfui_path = os.path.abspath(os.path.join(current_path, '..', '..'))
input_path = os.path.join(comfui_path, "input")
os.chdir(current_path)




def forcePull():
    import subprocess
    fetch_result = subprocess.run(['git', 'fetch'], capture_output=True, text=True)
    print(fetch_result.stdout)
    if fetch_result.returncode != 0:
        print(f"Fetch error: {fetch_result.stderr}")
        return
    
    reset_result = subprocess.run(['git', 'reset', '--hard', 'origin/main'], capture_output=True, text=True)
    print(reset_result.stdout)
    if reset_result.returncode != 0:
        print(f"Reset error: {reset_result.stderr}")
        return

# Find the plugin version
for folder_name in os.listdir("Install_Plugin"):
    if folder_name.startswith('3e6d64e0_') and not folder_name.startswith('3e6d64e0_PS')  and not folder_name.endswith('.ccx') :
        local_plugin_folder = folder_name 
pluginver = local_plugin_folder.replace('3e6d64e0_', '')

# Helper Functions
def check_path_exists(path):
    if not os.path.exists(path):
        raise Exception(f"_PS_ The path does not exist: {path}")

def install_plugin():
    try:
        if os.name == 'nt':
            adobe_plugins_storage = os.path.expanduser('~\\AppData\\Roaming\\Adobe\\UXP\\Plugins\\External')
            plugins_info_path = os.path.expanduser('C:\\Users\\user\\AppData\\Roaming\\Adobe\\UXP\\PluginsInfo\\v1')
        elif os.name == 'posix' and platform.system() == 'Darwin':
            adobe_plugins_storage = os.path.expanduser('~/Library/Application Support/Adobe/UXP/Plugins/External')
            plugins_info_path = os.path.expanduser('~/Library/Application Support/Adobe/UXP/PluginsInfo/v1')
        elif os.name == 'posix':
            return "This script does not support Linux."
        else:
            return "Unsupported operating system."
        
        # Ensure the directories exist
        os.makedirs(adobe_plugins_storage, exist_ok=True)
        os.makedirs(plugins_info_path, exist_ok=True)

        # Remove any existing plugin directories
        for folder_name in os.listdir(adobe_plugins_storage):
            if folder_name.startswith('3e6d64e0'):
                shutil.rmtree(os.path.join(adobe_plugins_storage, folder_name))

        # Copy the plugin to the storage path
        shutil.copytree(os.path.join("Install_Plugin", local_plugin_folder), os.path.join(adobe_plugins_storage, local_plugin_folder))
        
        ps_json_path = os.path.join(plugins_info_path, 'PS.json')

        new_plugin_entry = {
            "hostMinVersion": "22.5.0",
            "name": "ComfyUI for adobe Photoshop",
            "path": f"$localPlugins\\External\\{local_plugin_folder}",
            "pluginId": "3e6d64e0",
            "status": "enabled",
            "type": "uxp",
            "versionString": pluginver
        }

        # Check if PS.json exists
        if os.path.exists(ps_json_path):
            with open(ps_json_path, 'r') as f:
                data = json.load(f)
            
            # Remove existing entries with the same pluginId
            data['plugins'] = [plugin for plugin in data['plugins'] if plugin['pluginId'] != "3e6d64e0"]
            
            data['plugins'].append(new_plugin_entry)
        else:
            # If PS.json does not exist, create it with the new plugin entry
            data = {"plugins": [new_plugin_entry]}
        
        # Write the (updated or newly created) data back to PS.json
        with open(ps_json_path, 'w') as f:
            json.dump(data, f, indent=2)
        print ("")
        print (f"_PS_ Installed plugin in {adobe_plugins_storage} and updated PS.json")
        print ("")
        
        print ("_PS_ RESTART YOUR PHOTOSHOP AND LAUNCH THE PLUGIN")
        
        print ("")
        

    except Exception as e:
        print (f"_PS_ Got Error: {e}")

def ispluginUpdate():
    version_file_path = './data/config.json'
    check_path_exists(version_file_path)
    with open(version_file_path, 'r') as version_file:
        file_version = json.load(version_file).get('pluginVer')
        
    if file_version < pluginver:
        print("_PS_ Plugin is not updated, installing. . .")
        install_plugin()
    else: 
        print("_PS_ Plugin is update")

ispluginUpdate()

class WebSocketServer:
    def __init__(self):
        self.mainDir = os.path.dirname(os.path.dirname(os.getcwd()))
        self.tempDir = os.path.join(self.mainDir, "temp")
        self.inputDir = os.path.join(self.mainDir, "input")
        
        self.comfyUi_clients = []  # List of ComfyUI clients
        self.photoshop = "photoshop"
        self.rendernode = None
        self.first_start = True
        self.restart_attempts = 0
        self.max_restarts = 5

    @asynccontextmanager
    async def manage_connection(self, websocket):
        clients[websocket.remote_address] = {'websocket': websocket}
        try:
            yield
        finally:
            await self.remove_connection(websocket)

    async def handle_connection(self, websocket, path):
        async with self.manage_connection(websocket):
            try:
                while True:
                    message = await websocket.recv()
                    await self.route_message(websocket, message)
            except Exception as e:
                print(f"Error handling connection: {e}")

    async def route_message(self, websocket, message):
        if message == "render done":
            await self.handle_render_done(websocket)
        elif message == "imComfyui":
            await self.handle_imComfyui(websocket)
        elif message == "imPhotoshop":
            await self.handle_imPhotoshop(websocket)
        elif websocket.remote_address in self.comfyUi_clients:
            await self.from_comfyUi(message)
        elif websocket.remote_address == self.photoshop:
            await self.from_photoshop(message)

    async def handle_render_done(self, websocket):
        self.rendernode = websocket.remote_address
        await self.send_file_to_photoshop("render.png", "render")
        await websocket.close()
        self.rendernode = None

    async def handle_imComfyui(self, websocket):
        self.comfyUi_clients.append(websocket.remote_address)  # Append to the end of the list
        print(f"_PS_ Node found in workflow: {websocket.remote_address}")
        await self.send_to_photoshop("comfyuiConnected", True)
        await self.send_to_comfyUi("photoshopConnected", True, websocket.remote_address)
        await self.send_to_comfyUi("pluginver", pluginver)
        

    async def handle_imPhotoshop(self, websocket):
        self.photoshop = websocket.remote_address
        print(f"_PS_ Photoshop Connected: {self.photoshop}")
        await self.send_to_comfyUi("photoshopConnected", True)
        await self.send_to_photoshop("comfyuiConnected", True)

    async def remove_connection(self, websocket):
        del clients[websocket.remote_address]
        if websocket.remote_address in self.comfyUi_clients:
            print(f"_PS_ ComfyUi Tab closed")
            self.comfyUi_clients.remove(websocket.remote_address)  # Remove the closed connection from the list
        elif websocket.remote_address == self.photoshop:
            print(f"_PS_ Photoshop closed")
            self.photoshop = "photoshop"
        await websocket.close()

    async def from_photoshop(self, message):
        try:
            data = json.loads(message)
            await self.handle_photoshop_data(data)
        except Exception as e:
            print(f"_PS_ error fromPhotoshop: {e}")
            await self.restart_websocket_server()

    async def handle_photoshop_data(self, data):
        if "canvasBase64" in data:
            await self.save_file(data["canvasBase64"], 'PS_canvas.png')

        if "maskBase64" in data:
            await self.save_file(data["maskBase64"], 'PS_mask.png')
            mask_save_semaphore.release()

        if "configdata" in data:
            await self.save_config(data["configdata"])
            print("data[", json.dumps(data["configdata"], ensure_ascii=False))

        if "quickSave" in data:
            await self.send_to_comfyUi("quickSave", True)

        if "workspace" in data:
            await self.send_to_comfyUi("workspace", data["workspace"])

        if not any(key in data for key in ["configdata", "maskBase64", "canvasBase64", "workspace", "quickSave"]):
            await self.send_to_comfyUi("", json.dumps(data))

    async def from_comfyUi(self, message):
        try:
            data = json.loads(message)
            await self.handle_comfyUi_data(data)
        except Exception as e:
            print(f"_PS_ error fromComfyui: {e}")
            await self.restart_websocket_server()

    async def handle_comfyUi_data(self, data):
        if "PreviewImage" in data:
            await self.handle_preview_image(data["PreviewImage"])
            
        elif "pullupdate" in data:
            await self.send_to_comfyUi("alert", "Updating, please Restart comfyui after update")
            forcePull()
            
            
        else:
            await self.send_to_photoshop("", json.dumps(data))

    async def handle_preview_image(self, image_name):
        file_path = os.path.join(self.tempDir, image_name)
        destination_path = os.path.join(self.inputDir, image_name)
        if check_path_exists(file_path):
            shutil.copyfile(file_path, destination_path)
            await self.send_to_comfyUi("tempToInput", image_name)

    async def save_file(self, data, filename):
        data = base64.b64decode(data)
        with open(os.path.join(input_path, filename), "wb") as file:
            file.write(data)

    async def save_config(self, config_data):
        with open(os.path.join(current_path, "data", 'config.json'), "w", encoding='utf-8') as file:
            json.dump(config_data, file, ensure_ascii=False)

    async def send_to_comfyUi(self, name, message, recipient=None):
        if not message:
            message = True
        recipient = recipient or self.comfyUi_clients[-1] if self.comfyUi_clients else None
        if recipient:
            await self.send_message(recipient, name, message)

    async def send_to_photoshop(self, name, message):
        if not message:
            message = True
        await self.send_message(self.photoshop, name, message)

    async def send_message(self, recipient, name, message):
        try:
            if recipient in clients:
                data = json.dumps({name: message}) if name else message
                await clients[recipient]['websocket'].send(data)
            else:
                if name not in ["comfyuiConnected", "photoshopConnected"]:
                    print(f"_PS_ {recipient} Not Connected")
        except Exception as e:
            print(f"_PS_ error send_message: {e}")

    async def send_file_to_photoshop(self, filename, name):
        try:
            with open(os.path.join(current_path, "data", filename), 'rb') as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            await self.send_to_photoshop(name, encoded_string)
        except Exception as e:
            print(f"Error reading or sending {filename}: {e}")

    async def restart_websocket_server(self):
        while self.restart_attempts < self.max_restarts:
            try:
                async with websockets.serve(self.handle_connection, "0.0.0.0", 8765):
                    if self.first_start:
                        print("_PS_ Starting server...")
                        self.first_start = False
                    else:
                        print("_PS_ Restarting server...")
                    await asyncio.Future()  # run forever
            except Exception as e:
                self.restart_attempts += 1
                print(f"_PS_ Retrying to start the server... ({self.restart_attempts}/{self.max_restarts})")
                await asyncio.sleep(5)
        print("_PS_ Server failed to start after several attempts.")
        
server = WebSocketServer()
asyncio.run(server.restart_websocket_server())
