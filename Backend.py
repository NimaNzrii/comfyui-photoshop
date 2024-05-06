e='.'
d='localhost'
c='input'
b='PHSP'
a='PHSPBETA'
R='data.json'
K='websocket'
J=open
I='dataDir'
H=Exception
E=True
D=str
C=None
A=print
import asyncio as L,websockets as S,json as G,base64 as T
from PIL import Image as U
import subprocess as V,os as B,platform as W,os as B,shutil as f
with J(R,'r')as P:g=G.load(P)
if not B.path.exists(g.get(I)):
	M=C;N=False;Q=C
	def h(path):
		if not B.path.exists(path):A('🔷 No, the path does not exist.',path)
	O=B.path.expanduser('~\\AppData\\Roaming\\Adobe\\UXP\\PluginsStorage');h(O)
	def X(path):
		global N;global Q
		for(G,C,H)in B.walk(path,topdown=E):
			C.sort(reverse=E)
			for D in C:
				if D.isdigit():
					F=B.path.join(G,D,'External','3e6d64e0','PluginData')
					if B.path.exists(F):N=E;Q=F;break
			if N:break
		if not N:A("🔷 Photoshop plugin didn't install! Please install it first.")
	for(k,i,l)in B.walk(O):
		for Y in i:
			if Y==a:M=B.path.join(O,a);X(M)
			elif Y==b:M=B.path.join(O,b);X(M)
	with J(B.path.join(R),'w')as P:P.write(G.dumps({I:D(Q)}))
F={}
class Z:
	def __init__(A):
		A.mainDir=B.getcwd()
		for D in range(2):A.mainDir=B.path.dirname(A.mainDir)
		A.tempDir=B.path.join(A.mainDir,'temp');A.inputDir=B.path.join(A.mainDir,c);A.comfyUi=C;A.photoshop=C;A.positive=C;A.negative=C;A.seed=C;A.slider=C;A.image=C;A.mask=C;A.dataDir=C;A.renderDir=C;A.progress=C;A.openWithPS=C;A.QuickEdit=C;A.render_status=C;A.render=C;A.quickSave=C;A.i=0;A.workspace=C
	async def handle_connection(B,websocket,path):
		J='photoshopConnected';I='comfyuiConnected';C=websocket
		try:
			F[C.remote_address]={K:C}
			while E:
				G=await C.recv()
				if G=='imComfyui':
					B.comfyUi=C.remote_address;A('🔷 Photoshop node added'+D(B.comfyUi));await B.sendPhotoshop(I,E)
					if B.sendPhotoshop:await B.sendComfyUi(J,E)
				elif G=='imPhotoshop':
					B.photoshop=C.remote_address;A('🔷 Photoshop launched'+D(B.photoshop));await B.sendComfyUi(J,E)
					if B.comfyUi:await B.sendPhotoshop(I,E)
				elif G=='done':B.sendComfyUi('render_status','genrated')
				elif C.remote_address==B.comfyUi:await B.fromComfyui(G)
				elif C.remote_address==B.photoshop:await B.fromPhotoshop(G)
		except H as L:A(f"🔷 error handle_connection: {L}");await B.remove_connection(C)
		finally:await C.close()
	async def remove_connection(D,websocket):
		B=websocket
		try:
			del F[B.remote_address]
			if B.remote_address==D.comfyUi:A(f"🔷 ComfyUi Tab closed {B.remote_address} ");D.comfyUi=C;await B.close()
			elif B.remote_address==D.photoshop:A(f"🔷 Photoshop closed {B.remote_address} ");D.photoshop=C;await B.close()
			else:A(f"🔷 {B.remote_address} disconnected");await B.close()
		except ValueError:pass
	async def fromPhotoshop(C,message):
		M=message;L='quickSave';K='workspace'
		try:
			F=G.loads(M)
			if F.get(L):await C.sendComfyUi(L,E)
			if F.get(K):await C.sendComfyUi(K,F.get(K))
			if F.get(I):
				C.dataDir=F.get(I);C.renderDir=B.path.join(C.dataDir,'render.png')
				with J(B.path.join(R),'w')as N:N.write(G.dumps({I:D(C.dataDir)}))
			if not F.get(I)and not F.get(K)and not F.get(L):await C.sendComfyUi('',M)
		except H as O:A(f"🔷 error fromPhotoshop: {O}");await C.restart_websocket_server()
	async def fromComfyui(C,message):
		S='height';R='width';Q='PreviewImage';O='QuickEdit';I=message
		try:
			F=G.loads(I)
			if F.get(Q):
				K=F.get(Q);E=B.path.join(C.tempDir,K);X=B.path.join(C.inputDir,K)
				if B.path.exists(E):f.copyfile(E,X);await C.sendComfyUi('tempToInput',K)
			elif F.get(O):
				dir=B.path.join(C.mainDir,c,F.get(O).replace('/','\\'))
				if not B.path.exists(dir):A('🔷 not available',dir)
				else:L,M=U.open(dir).size;A('🔷 dir',dir);await C.sendPhotoshop(O,dir);await C.sendPhotoshop(R,L);await C.sendPhotoshop(S,M)
			elif F.get('openWithPS'):
				Y=T.b64decode(C.openWithPS);C.i+=1;P='Dolpin_Ai_openWithPS'+D(C.i)+'.psd';A('🔷 filename',P);E=B.path.join(C.tempDir,P);A('🔷 file_path',E)
				with J(E,'wb')as N:N.write(Y)
				A('🔷 psd')
				if W.system()=='Darwin':V.call(('open',E))
				elif W.system()=='Windows':B.startfile(E)
				else:V.call(('xdg-open',E))
			else:await C.sendPhotoshop('',I)
		except H as Z:A(f"🔷 error fromComfyui: {Z}");await C.restart_websocket_server()
		if I.startswith('rndr'):
			a=T.b64decode(I[4:]);E=f"{C.dataDir}/render.png"
			with J(E,'wb')as N:N.write(a)
			L,M=U.open(E).size;await C.sendPhotoshop(R,L);await C.sendPhotoshop(S,M)
	async def sendComfyUi(B,name,message):
		C=message
		try:
			if B.comfyUi in F:
				if name=='':await F[B.comfyUi][K].send(D(C))
				else:E=G.dumps({name:D(C)});await F[B.comfyUi][K].send(D(E))
			else:A('🔷 comfyUi Not Connected')
		except H as I:A(f"🔷 error sendComfyUi: {I}")
	async def sendPhotoshop(B,name,message):
		C=message
		try:
			if B.photoshop in F:
				if name=='':await F[B.photoshop][K].send(D(C))
				else:E=G.dumps({name:D(C)});await F[B.photoshop][K].send(D(E))
			else:A('🔷 Photoshop Not Connected')
		except H as I:A(f"🔷 error sendComfyUi: {I}")
	async def restart_websocket_server(C):
		try:
			B=Z()
			async with S.serve(B.handle_connection,d,8765):A('🔷 WebSocket server restarted and waiting for messages')
		except H as D:A(e);L.sleep(5)
async def j():
	try:
		B=Z()
		async with S.serve(B.handle_connection,d,8765):await L.Future()
	except H as C:A(e);L.sleep(5)
L.run(j())