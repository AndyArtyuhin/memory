import cv2, numpy as np
rng=np.random.default_rng(7)
im=cv2.imread('/mnt/user-data/uploads/1791671706685_image.png')
g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
cx,cy,R=494.25,444.75,269.0
# flatten shading
base=cv2.GaussianBlur(g,(0,0),18)
# lines shouldn't darken base estimate: use dilate-like max filter before blur
mx=cv2.dilate(g,np.ones((15,15),np.uint8))
base=cv2.GaussianBlur(mx,(0,0),20)
flat=np.clip(g/np.maximum(base,1)*240,0,255)
W,H=2048,1024
u=(np.arange(W)+.5)/W; v=(np.arange(H)+.5)/H
U,V=np.meshgrid(u,v)
lon=(U-.5)*2*np.pi; lat=(.5-V)*np.pi
P=np.stack([np.cos(lat)*np.sin(lon),np.sin(lat),np.cos(lat)*np.cos(lon)],-1)
px,py,pz=P[...,0],P[...,1],P[...,2]
# photo projection (front cap)
k=0.985
mapx=(cx+R*k*px).astype(np.float32); mapy=(cy-R*k*py).astype(np.float32)
photo=cv2.remap(flat,mapx,mapy,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
photo_line=np.clip((175-photo)/55,0,1)          # dark ink
hp=cv2.remap(flat-cv2.GaussianBlur(flat,(0,0),3),mapx,mapy,cv2.INTER_LINEAR)
w=np.clip((pz-0.25)/0.25,0,1); w=w*w*(3-2*w)
# procedural ink arcs
def noise(sc,seed):
    r=np.random.default_rng(seed); n=r.standard_normal((H//sc+2,W//sc+2)).astype(np.float32)
    return cv2.resize(n,(W,H),interpolation=cv2.INTER_CUBIC)
ink=np.zeros((H,W),np.float32)
wob=noise(64,1)*0.006
for i in range(22):
    n=rng.standard_normal(3); n/=np.linalg.norm(n)
    d=rng.uniform(-0.35,0.35)
    # tangent frame for angular extent
    a=np.cross(n,[0.3,0.9,0.1]); a/=np.linalg.norm(a); b=np.cross(n,a)
    ang=np.arctan2(P@b,P@a)
    start=rng.uniform(-np.pi,np.pi); span=rng.uniform(1.0,3.6)
    da=np.mod(ang-start,2*np.pi)
    inside=(da<span).astype(np.float32)
    taper=np.clip(np.minimum(da,span-da)/0.15,0,1)*inside
    width=rng.uniform(0.0085,0.013)
    dist=np.abs(P@n-d+wob)
    ink=np.maximum(ink,np.clip((width-dist)/0.003,0,1)*taper)
ink_all=np.maximum(photo_line*w, ink*(1-w))
# scratches height
height=np.zeros((H,W),np.float32)
for i in range(70):
    n=rng.standard_normal(3); n/=np.linalg.norm(n)
    d=rng.uniform(-0.9,0.9)
    a=np.cross(n,[0.2,0.3,0.9]); a/=np.linalg.norm(a); b=np.cross(n,a)
    ang=np.arctan2(P@b,P@a); start=rng.uniform(-np.pi,np.pi); span=rng.uniform(0.15,0.9)
    da=np.mod(ang-start,2*np.pi); inside=da<span
    taper=np.clip(np.minimum(da,span-da)/0.1,0,1)*inside
    dist=np.abs(P@n-d)
    wd=rng.uniform(0.002,0.009)
    height-=np.clip(1-dist/wd,0,1)*taper*rng.uniform(.4,1)
height=height*(1-w)+np.clip(hp/25,-1.5,1.5)*w*0.9
height=cv2.GaussianBlur(height.astype(np.float32),(0,0),0.8)
# albedo
paper=np.array([246,246,244],np.float32)
grain=noise(4,9)*3
alb=paper[None,None,:]+grain[...,None]
scr_light=np.clip(-height,0,1)*6   # scratches slightly whiter
alb=alb+scr_light[...,None]
inkc=np.array([22,22,24],np.float32)
alb=alb*(1-ink_all[...,None])+inkc*ink_all[...,None]
cv2.imwrite('albedo.jpg',np.clip(alb,0,255).astype(np.uint8)[...,::-1][...,::-1],[cv2.IMWRITE_JPEG_QUALITY,90])
# normal map (tangent space, equirect: tangent=+u, bitangent=+v up)
s=9.0
dx=cv2.Sobel(height,cv2.CV_32F,1,0,ksize=3)/8*s
dy=cv2.Sobel(height,cv2.CV_32F,0,1,ksize=3)/8*s
N=np.stack([-dx,dy,np.ones_like(dx)],-1); N/=np.linalg.norm(N,axis=-1,keepdims=True)
nm=((N*0.5+0.5)*255).astype(np.uint8)  # RGB
cv2.imwrite('normal.png',nm[...,::-1])
print('done')
