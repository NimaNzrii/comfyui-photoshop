import asyncio
import websockets
import json
import base64
import os
import shutil
from contextlib import asynccontextmanager
import platform as platform
import subprocess

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
    fetch_result = subprocess.run(['git', 'fetch'], capture_output=True, text=True)
    print(fetch_result.stdout)
    if fetch_result.returncode != 0:
        print(f"_PS_ Fetch error: {fetch_result.stderr}")
        return
    
    reset_result = subprocess.run(['git', 'reset', '--hard', 'origin/main'], capture_output=True, text=True)
    print(reset_result.stdout)
    if reset_result.returncode != 0:
        print(f"_PS_ Reset error: {reset_result.stderr}")
        return

# Find the plugin version
for folder_name in os.listdir("Install_Plugin"):
    if folder_name.startswith('3e6d64e0_') and not folder_name.startswith('3e6d64e0_PS') and not folder_name.endswith('.ccx'):
        local_plugin_folder = folder_name 

if local_plugin_folder:
    pluginver = local_plugin_folder.replace('3e6d64e0_', '')

# Helper Functions
def check_path_exists(path):
    if not os.path.exists(path):
        raise Exception(f"_PS_ The path does not exist: {path}")

def install_plugin():
    try:
        if os.name == 'nt':
            adobe_plugins_storage = os.path.expanduser(r'~\AppData\Roaming\Adobe\UXP\Plugins\External')
            plugins_info_path = os.path.expanduser(r'~\AppData\Roaming\Adobe\UXP\PluginsInfo\v1')
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
        if local_plugin_folder:
            shutil.copytree(os.path.join("Install_Plugin", local_plugin_folder), os.path.join(adobe_plugins_storage, local_plugin_folder))
        else:
            print("_PS_ No plugin folder found to install.")
            return
        
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
        
        print(f"_PS_ Installed plugin in {adobe_plugins_storage} and updated PS.json")
        print("_PS_ RESTART YOUR PHOTOSHOP AND LAUNCH THE PLUGIN")
        
    except Exception as e:
        print(f"_PS_ Got Error: {e}")

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

if local_plugin_folder and pluginver:
    ispluginUpdate()
else:
    print("_PS_ No local plugin folder found, skipping update check.")

class WebSocketServer:
    def __init__(self):
        self.mainDir = os.path.dirname(os.path.dirname(os.getcwd()))
        self.tempDir = os.path.join(self.mainDir, "temp")
        self.inputDir = os.path.join(self.mainDir, "input")
        
        self.comfyUi_clients = []  
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
                client_address = websocket.remote_address
                if client_address not in self.comfyUi_clients and client_address != self.photoshop:
                    print("Render Finished")
                    # print(f"_PS_ Error handling connection from {client_address}: {e}")

    async def route_message(self, websocket, message):
        if message == "render":
            await self.handle_render_done(websocket)
        elif message == "imComfyui":
            await self.handle_imComfyui(websocket)
        elif message == "imPhotoshop":
            print("imPhotoshop")
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
        self.comfyUi_clients.append(websocket.remote_address)
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
        if websocket.remote_address in clients:
            del clients[websocket.remote_address]
        if websocket.remote_address in self.comfyUi_clients:
            print(f"_PS_ ComfyUi Tab closed")
            self.comfyUi_clients.remove(websocket.remote_address)
        elif websocket.remote_address == self.photoshop:
            print(f"_PS_ Photoshop closed")
            self.photoshop = "photoshop"
            await self.send_to_comfyUi("photoshopConnected", False)
        if websocket.remote_address == self.rendernode:
            self.rendernode = None

    async def send_file_to_photoshop(self, filepath, action):
        check_path_exists(filepath)
        with open(filepath, 'rb') as f:
            file_data = base64.b64encode(f.read()).decode()
        await self.send_to_photoshop(action, file_data)

    async def send_to_photoshop(self, action, data):
        if self.photoshop == "photoshop":
            print("_PS_ Photoshop is not connected")
            return
        if self.photoshop not in clients:
            print("_PS_ Photoshop client not found")
            return
        websocket = clients[self.photoshop]['websocket']
        await websocket.send(json.dumps({"action": action, "data": data}))

    async def send_to_comfyUi(self, action, data, client_address=None):
        if client_address:
            if client_address not in clients:
                print(f"_PS_ ComfyUi client {client_address} not found")
                return
            websocket = clients[client_address]['websocket']
            await websocket.send(json.dumps({"action": action, "data": data}))
        else:
            for client in self.comfyUi_clients:
                if client in clients:
                    websocket = clients[client]['websocket']
                    await websocket.send(json.dumps({"action": action, "data": data}))
                else:
                    print(f"_PS_ ComfyUi client {client} not found")

    async def from_comfyUi(self, message):
        data = json.loads(message)
        if data.get('type') == 'mask':
            mask_data = data.get('mask')
            mask_filename = os.path.join(self.tempDir, 'mask.png')
            with open(mask_filename, 'wb') as f:
                f.write(base64.b64decode(mask_data))
            await mask_save_semaphore.release()

    async def from_photoshop(self, message):
        data = json.loads(message)
        if data.get('type') == 'mask':
            mask_data = data.get('mask')
            mask_filename = os.path.join(self.inputDir, 'mask.png')
            with open(mask_filename, 'wb') as f:
                f.write(base64.b64decode(mask_data))
            await self.send_to_comfyUi('maskReceived', True)

    async def run(self):
        while self.first_start or self.restart_attempts < self.max_restarts:
            self.first_start = False
            try:
                async with websockets.serve(self.handle_connection, "0.0.0.0", 8765):
                    print("_PS_ server started")
                    await asyncio.Future()
            except Exception as e:
                print(f"WebSocket server error: {e}")
                self.restart_attempts += 1
                print(f"Restart attempt {self.restart_attempts}/{self.max_restarts}")

if __name__ == "__main__":
    server = WebSocketServer()
    asyncio.run(server.run())
