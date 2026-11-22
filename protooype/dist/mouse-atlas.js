import * as THREE from 'three';
import {OrbitControls} from './assets/OrbitControls.js';

const $=id=>document.getElementById(id);
const ASSETS='assets/mouse-ccf/';
const planes={
  coronal:{axis:1,u:0,v:2,labels:['S','L','R','I'],coordinate:'Anterior'},
  horizontal:{axis:2,u:0,v:1,labels:['A','L','R','P'],coordinate:'Superior'},
  sagittal:{axis:0,u:1,v:2,labels:['S','P','A','I'],coordinate:'Right'}
};
let metadata,volume,renderer,scene,camera,controls,mesh,frame=0,pending,active=false;
const selectedSlices={};
async function response(path){const r=await fetch(ASSETS+path);if(!r.ok)throw Error(`Mouse asset unavailable (${r.status})`);return r;}

function resize(){
  if(!renderer)return;
  const rect=$('mouseScene').getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  camera.aspect=rect.width/rect.height;
  camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height);
}
function reset(){
  if(!mesh)return;
  resize();
  const radius=mesh.geometry.boundingSphere.radius;
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
  const distance=radius/Math.sin(halfFov)*1.12;
  controls.target.set(0,0,0);camera.up.set(0,1,0);
  camera.position.copy(new THREE.Vector3(1.1,.75,1.4).normalize().multiplyScalar(distance));
  controls.autoRotate=false;$('mouseRotate').setAttribute('aria-pressed','false');controls.update();
}
function drawSlice(){
  if(!volume)return;
  const plane=$('mousePlane').value,view=planes[plane],shape=metadata.preview_dimensions;
  const index=Number($('mouseSlicePosition').value);selectedSlices[plane]=index;
  const width=shape[view.u],height=shape[view.v],canvas=$('mouseSlice');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d'),image=context.createImageData(width,height),pos=[0,0,0];
  pos[view.axis]=index;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    pos[view.u]=x;pos[view.v]=height-1-y;
    const value=volume[(pos[0]*shape[1]+pos[1])*shape[2]+pos[2]],offset=(y*width+x)*4;
    image.data[offset]=image.data[offset+1]=image.data[offset+2]=value;image.data[offset+3]=255;
  }
  context.putImageData(image,0,0);
  canvas.setAttribute('aria-label',`${plane[0].toUpperCase()+plane.slice(1)} mouse anatomical template slice ${index+1} of ${shape[view.axis]}`);
  $('mouseSliceReadout').textContent=`${index+1} / ${shape[view.axis]}`;
  $('mouseSlicePosition').setAttribute('aria-valuetext',`${plane} slice ${index+1} of ${shape[view.axis]}`);
  const affine=metadata.preview_affine_ras_mm;
  const coordinate=affine[view.axis][view.axis]*index+affine[view.axis][3];
  $('mouseSliceCoordinate').textContent=`${view.coordinate} coordinate: ${coordinate.toFixed(2)} mm · source NIfTI frame`;
  ['Top','Left','Right','Bottom'].forEach((side,i)=>$('mouseSlice'+side).textContent=view.labels[i]);
}
function setPlane(){
  if(!metadata)return;
  const plane=$('mousePlane').value,count=metadata.preview_dimensions[planes[plane].axis];
  $('mouseSlicePosition').max=count-1;
  $('mouseSlicePosition').value=selectedSlices[plane]??Math.floor(count/2);
  $('mouseSlicePosition').disabled=false;drawSlice();
}
function animate(){
  if(!active||!renderer){frame=0;return;}
  controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate);
}
async function load(){
  $('mouseLoading').hidden=false;$('mouseLoading').textContent='Preparing your uploaded mouse template…';
  metadata=await (await response('template.json')).json();
  const [binary,compressed]=await Promise.all([
    response(metadata.surface_file).then(r=>r.arrayBuffer()),
    response(metadata.volume_file)
  ]);
  const unpacked=await new Response(compressed.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  volume=new Uint8Array(unpacked);
  if(volume.length!==metadata.preview_dimensions.reduce((a,b)=>a*b,1))throw Error('Mouse preview dimensions do not match its metadata.');
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary,metadata.position_offset,metadata.vertex_count*3),3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(binary,metadata.index_offset,metadata.index_count),1));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdbf5ef,0x223c45,2.5));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,4);scene.add(key);
  const rim=new THREE.DirectionalLight(0x87c8d6,1.8);rim.position.set(-3,1,-2);scene.add(rim);
  mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xc5d8ce,roughness:.78,metalness:0,side:THREE.DoubleSide}));scene.add(mesh);
  camera=new THREE.PerspectiveCamera(38,1,.01,100);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  $('mouseScene').append(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.5;controls.maxDistance=18;controls.autoRotateSpeed=.5;
  new ResizeObserver(resize).observe($('mouseScene'));
  $('mouseReset').onclick=reset;
  $('mouseRotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('mouseRotate').setAttribute('aria-pressed',String(controls.autoRotate));};
  $('mousePlane').onchange=setPlane;$('mouseSlicePosition').oninput=drawSlice;
  reset();setPlane();$('mouseLoading').hidden=true;
  if(active&&!frame)animate();
}
export async function showMouse(){
  active=true;
  if(!pending)pending=load().catch(error=>{
    pending=null;$('mouseLoading').hidden=false;
    $('mouseLoading').textContent=`Could not open the mouse preview. ${error.message} Return to All atlases and try again.`;
    console.error(error);
  });
  await pending;
  if(renderer&&active){resize();if(!frame)animate();}
}
export function hideMouse(){active=false;if(frame)cancelAnimationFrame(frame);frame=0;}
