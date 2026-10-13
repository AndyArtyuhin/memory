import numpy as np, trimesh
from PIL import Image
NU,NV=128,64
lons=np.linspace(-np.pi,np.pi,NU+1); lats=np.linspace(np.pi/2,-np.pi/2,NV+1)
LO,LA=np.meshgrid(lons,lats)
P=np.stack([np.cos(LA)*np.sin(LO),np.sin(LA),np.cos(LA)*np.cos(LO)],-1).reshape(-1,3)*0.5
# turn the photographed side (+Z) to the top (+Y): standard Y-up model, best side up
P=np.stack([P[:,0],P[:,2],-P[:,1]],-1)
UV=np.stack([LO/(2*np.pi)+.5, LA/np.pi+.5],-1).reshape(-1,2)
F=[]
for j in range(NV):
    for i in range(NU):
        a=j*(NU+1)+i; b=a+1; c=a+NU+1; d=c+1
        F.append([a,c,b]); F.append([b,c,d])
F=np.array(F)
mesh=trimesh.Trimesh(P,F,vertex_normals=P/0.5,process=False)
# check winding: face normals should point outward
fc=mesh.triangles_center; fn=mesh.face_normals
ok=(np.einsum('ij,ij->i',fc,fn)>0).mean(); print('outward fraction',ok)
if ok<0.5: mesh.faces=mesh.faces[:,::-1]
mat=trimesh.visual.material.PBRMaterial(name='ball',
    baseColorTexture=Image.open('albedo.jpg'),
    normalTexture=Image.open('normal.png'),
    metallicFactor=0.0, roughnessFactor=0.78)
mesh.visual=trimesh.visual.TextureVisuals(uv=UV,material=mat)
mesh.vertex_normals=P/0.5
open('model.glb','wb').write(trimesh.exchange.gltf.export_glb(mesh,include_normals=True))
import os; print(os.path.getsize('model.glb')/1e6,'MB')
