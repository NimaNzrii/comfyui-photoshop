import asyncio
import websockets
import json
import base64
from PIL import Image
import subprocess, os, platform
import os
import shutil 



# پیدا کردن مسیر فوتوشاپ بصورت خودکار
with open("data.json", "r") as file:
    data = json.load(file)
    
if not os.path.exists(data.get("dataDir")):
    roaming_path = None
    external_found = False  

    plugin_path=None

    def check_path_existence(path):
        if not os.path.exists(path):
            print("🔷 No, the path does not exist.", path)

    adobe_path = os.path.expanduser('~\\AppData\\Roaming\\Adobe\\UXP\\PluginsStorage')
    check_path_existence(adobe_path)

    def check_forplugin(path):
        global external_found 
        global plugin_path
        
        for root, dirs, files in os.walk(path, topdown=True):
            dirs.sort(reverse=True) 
            for directory in dirs:
                if directory.isdigit():
                    external_folder_path = os.path.join(root, directory, "External","3e6d64e0", "PluginData")
                    if os.path.exists(external_folder_path):
                        external_found = True
                        # print(f"Photoshop plugin is installed in this directory: {external_folder_path}.")
                        plugin_path = external_folder_path
                        break
            if external_found:
                break

        if not external_found:
            print("🔷 Photoshop plugin didn't install! Please install it first.")

    for root, dirs, files in os.walk(adobe_path):
        for directory in dirs:
            if directory == "PHSPBETA":
                roaming_path = os.path.join(adobe_path, "PHSPBETA")
                check_forplugin(roaming_path)
            elif directory == "PHSP":
                roaming_path = os.path.join(adobe_path, "PHSP")
                check_forplugin(roaming_path)

    with open(os.path.join("data.json"), "w") as file:
        file.write(json.dumps({"dataDir": str(plugin_path)}))
# پیدا کردن مسیر فوتوشاپ بصورت خودکار




clients={}
class WebSocketServer:
    def __init__(self):
        self.mainDir = os.getcwd() 
        for _ in range(2):
            self.mainDir = os.path.dirname(self.mainDir)
        self.tempDir= os.path.join(self.mainDir , "temp")
        self.inputDir= os.path.join(self.mainDir , "input")
        
        self.comfyUi = None
        self.photoshop = None
        
        self.positive=None
        self.negative=None
        self.seed=None
        self.slider=None
        self.image=None
        self.mask=None
        self.dataDir=None
        self.renderDir=None
        
        self.progress =None
        self.openWithPS = None
        self.QuickEdit = None
        self.render_status = None
        self.render=None
        self.quickSave=None
        self.i=0
        self.workspace=None

        
    async def handle_connection(self, websocket, path):
        try:
            clients[websocket.remote_address] = {'websocket': websocket}

            while True:
                message = await websocket.recv()
                
                if message == "imComfyui":
                    self.comfyUi = websocket.remote_address
                    print("🔷 Photoshop node added" + str(self.comfyUi))
                    await self.sendPhotoshop("comfyuiConnected",True)
                    
                    # برای اینکه هرکی بدونه کیا کانکتن           
                    if self.sendPhotoshop: 
                        await self.sendComfyUi("photoshopConnected",True)
                                        
                elif message == "imPhotoshop":
                    self.photoshop = websocket.remote_address
                    print("🔷 Photoshop launched" + str(self.photoshop))
                    await self.sendComfyUi("photoshopConnected",True)
                    
                    if self.comfyUi: 
                        await self.sendPhotoshop("comfyuiConnected",True)
                    
                    
                elif message == "done":
                    self.sendComfyUi("render_status","genrated")
                          
                else: 
                    if websocket.remote_address == self.comfyUi:
                        await self.fromComfyui(message)
                    elif websocket.remote_address == self.photoshop:
                        await self.fromPhotoshop(message)
        except Exception as e:
                print(f"🔷 error handle_connection: {e}")
                await self.remove_connection(websocket)
        finally:
            await websocket.close()


    async def remove_connection(self, websocket):
        try:
            del clients[websocket.remote_address]
            if websocket.remote_address == self.comfyUi:
                print(f"🔷 ComfyUi Tab closed {websocket.remote_address} ")
                self.comfyUi = None
                await websocket.close()
            elif websocket.remote_address == self.photoshop:
                print(f"🔷 Photoshop closed {websocket.remote_address} ")
                self.photoshop = None
                await websocket.close()
            else:
                print(f"🔷 {websocket.remote_address} disconnected")
                await websocket.close()
        except ValueError:
            pass
        
    ############################# GET ################################
    
    
    
    
    
    
    
    
    
    ############## from Photoshop##############
    ##########################################
    async def fromPhotoshop(self, message):      
        try:
            data = json.loads(message)            

            if data.get("quickSave"): 
                await self.sendComfyUi("quickSave",True)
                                
            if data.get("workspace"): 
                await self.sendComfyUi("workspace",data.get("workspace"))

            if data.get("dataDir"): 
                self.dataDir = data.get("dataDir")
                self.renderDir = os.path.join(self.dataDir,"render.png")
                with open(os.path.join("data.json"), "w") as file:
                    file.write(json.dumps({"dataDir": str(self.dataDir)}))
            if not data.get("dataDir") and not data.get("workspace") and not data.get("quickSave"):
                await self.sendComfyUi("", message)

                
        except Exception as e:
            print(f"🔷 error fromPhotoshop: {e}")
            await self.restart_websocket_server()




    ############## from Comfyui ##############
    ##########################################
    async def fromComfyui(self, message):      
        try:  
            # print("🔷 message", message)
            data = json.loads(message)

                
            if data.get("PreviewImage"): 
                imageName = data.get("PreviewImage")

                file_path = os.path.join(self.tempDir,imageName)
                destination_path = os.path.join(self.inputDir, imageName)
                if os.path.exists(file_path):
                
                    shutil.copyfile(file_path, destination_path)
                    await self.sendComfyUi("tempToInput", imageName)
                
            # elif data.get('render_status')=="genrated":
            #     await self.sendPhotoshop("", message)
            #     width, height = Image.open(self.renderDir).size
            #     await self.sendPhotoshop("width",width)
            #     await self.sendPhotoshop("height",height)


            elif data.get('QuickEdit'):
                dir=os.path.join(self.mainDir, "input", data.get('QuickEdit').replace("/", "\\")) 
                if not os.path.exists(dir):
                    print("🔷 not available", dir)
                else:
                    width, height = Image.open(dir).size
                    print("🔷 dir", dir)
                    await self.sendPhotoshop("QuickEdit", dir)
                    await self.sendPhotoshop("width",width)
                    await self.sendPhotoshop("height",height)
                
            elif data.get('openWithPS'):
                    openimageBase64 = base64.b64decode(self.openWithPS)
                    # save as psd
                    self.i+=1
                    filename= "Dolpin_Ai_openWithPS"+ str(self.i)+ ".psd"
                    print("🔷 filename", filename)
                    file_path = os.path.join(self.tempDir,filename)
                    print("🔷 file_path", file_path)
                    
                    with open(file_path, "wb") as file:
                        file.write(openimageBase64)
                    # open psd file
                    print("🔷 psd")
                    if platform.system() == 'Darwin':
                        subprocess.call(('open', file_path))
                    elif platform.system() == 'Windows':
                        os.startfile(file_path)
                    else:                
                        subprocess.call(('xdg-open', file_path))
            
            
            else:
                await self.sendPhotoshop("", message)
                    
                                        
            # if render:
            #     print("🔷 render", render)
            #     image_binary = base64.b64decode(render)      
            #     file_path = f"{self.dataDir}/render.png"
            #     print("🔷 self.dataDir", self.dataDir)
            #     with open(file_path, "wb") as file:
            #         file.write(image_binary)
            #     # send width and height
            #     width, height = Image.open(file_path).size
            #     await self.sendPhotoshop(json.dumps({"width": str(width),"height": str(height)}))
            #     render=None
            
        except Exception as e:
            print(f"🔷 error fromComfyui: {e}")
            await self.restart_websocket_server()

        
                
            
            
        if message.startswith("rndr"):
            image_binary = base64.b64decode(message[4:])      
            file_path = f"{self.dataDir}/render.png"
            with open(file_path, "wb") as file:
                file.write(image_binary)
            # send width and height
            width, height = Image.open(file_path).size
            await self.sendPhotoshop("width", width)
            await self.sendPhotoshop("height", height)

            
                

            
    ############################# Send #############################
    
    async def sendComfyUi(self, name, message):
        try:
            if self.comfyUi in clients:
                if name =="":
                    await clients[self.comfyUi]['websocket'].send(str(message))
                else:
                    data=json.dumps({name: str(message)})
                    await clients[self.comfyUi]['websocket'].send(str(data))
            else:
                print("🔷 comfyUi Not Connected")
        except Exception as e:
            print(f"🔷 error sendComfyUi: {e}")
    
    async def sendPhotoshop(self, name, message):
        # print("🔷 name", name)
        # print("🔷 message", message)
        try:
            if self.photoshop in clients:
                if name =="":
                    await clients[self.photoshop]['websocket'].send(str(message))
                else:
                    data=json.dumps({name: str(message)})
                    await clients[self.photoshop]['websocket'].send((str(data)))
            else: print("🔷 Photoshop Not Connected")
        except Exception as e:
            print(f"🔷 error sendComfyUi: {e}")
            
            
       
    async def restart_websocket_server(self):
        try:
            server = WebSocketServer()
            async with websockets.serve(server.handle_connection, "localhost", 8765):
                print("🔷 WebSocket server restarted and waiting for messages")
        except Exception as e:
            # print(f"🔷 An error occurred during WebSocket server restart: {e}")
            print("🔷 Restarting the server in 5 seconds...")
            asyncio.sleep(5)
     
            
            


async def main():
    try:
        server = WebSocketServer()
        async with websockets.serve(server.handle_connection, "localhost", 8765):
            # print("🔷 Server is running and waiting for messages")
            await asyncio.Future()  # run forever
    except Exception as e:
        # print(f"🔷 An error occurred: {e}")
        print("🔷 Restarting the server in 5 seconds...")
        asyncio.sleep(5)

asyncio.run(main())

