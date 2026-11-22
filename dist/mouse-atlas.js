import * as THREE from 'three';
import {applyBrainOpacity} from './brain-display.js?v=2';
import {createMouseExpression} from './mouse-expression.js?v=controls-2';
import {OrbitControls} from './assets/OrbitControls.js';
import {planes,voxelOffset,slicePixelToVoxel,regionValues} from './mouse-annotation-utils.js';

const $=id=>document.getElementById(id),ASSETS='assets/mouse-ccf/';
let expression;
let metadata,annotation,volume,labels,regions,parts,renderer,scene,camera,controls,mesh;
let frame=0,pending,active=false,selected=null,point=null,isolated=false,browseAll=false;
let byValue,byId,baseIndices,faceValues,colors,selectedValues=new Set();
const selectedSlices={},ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
async function response(path){const r=await fetch(ASSETS+path);if(!r.ok)throw Error(`Mouse asset unavailable (${r.status})`);return r;}
async function unpack(path){const r=await response(path);return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function resize(){
  if(!renderer)return;const rect=$('mouseScene').getBoundingClientRect();if(!rect.width||!rect.height)return;
  camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height);
}
function fit(box){
  resize();const target=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2;
  const halfFov=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
  controls.target.copy(target);camera.up.set(0,1,0);
  camera.position.copy(target).addScaledVector(new THREE.Vector3(1.1,.75,1.4).normalize(),radius/Math.sin(halfFov)*1.12);
  controls.autoRotate=false;$('mouseRotate').setAttribute('aria-pressed','false');controls.update();
}
function reset(){if(!mesh)return;isolated=false;updateGeometry();fit(mesh.geometry.boundingBox);}
function updateGeometry(){
  if(!mesh)return;
  const index=mesh.geometry.index.array,positions=mesh.geometry.attributes.position.array;
  let indexOffset=0;const box=new THREE.Box3(),v=new THREE.Vector3();
  for(const part of parts){
    const included=!isolated||selectedValues.has(part.value),highlight=!selected||selectedValues.has(part.value);
    const color=new THREE.Color(expression?.colorForRegion(byValue.get(part.value))||byValue.get(part.value).color);
    if(!expression?.active&&selected&&!highlight)color.multiplyScalar(.38);
    if(!expression?.active&&selected&&highlight)color.lerp(new THREE.Color('#f4f6db'),.28);
    for(let i=part.vertex_start*3,end=i+part.vertex_count*3;i<end;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}
    if(!included)continue;
    index.set(baseIndices.subarray(part.index_start,part.index_start+part.index_count),indexOffset);
    faceValues.fill(part.value,indexOffset/3,(indexOffset+part.index_count)/3);
    indexOffset+=part.index_count;
    if(isolated)for(let i=part.vertex_start*3,end=i+part.vertex_count*3;i<end;i+=3)box.expandByPoint(v.fromArray(positions,i));
  }
  mesh.geometry.index.needsUpdate=true;mesh.geometry.attributes.color.needsUpdate=true;mesh.geometry.setDrawRange(0,indexOffset);
  $('mouseIsolate').disabled=!selected;$('mouseIsolate').setAttribute('aria-pressed',String(isolated));
  $('mouseIsolate').textContent=isolated?'Show whole brain':'Isolate region';
  $('mouseSurfaceLabel').textContent=expression?.active?`${expression.gene} · RNA source-region summaries (earlier boundaries)`:selected?`${selected.abbreviation} · ${selected.name}`:'Allen CCFv3 · labeled anatomy';
  if(isolated&&!box.isEmpty())fit(box);
}
function showRegionInfo(message){
  const panel=$('mouseRegionInfo');panel.replaceChildren();
  if(!selected){panel.append(el('h3',message?'No labeled region here':'Select a region'),el('p',message||'Click the 3D brain, select a name, or click inside a slice.'));return;}
  const identity=el('div',undefined,'mouse-region-identity'),swatch=el('span',undefined,'mouse-region-swatch');swatch.style.background=selected.color;
  identity.append(swatch,el('span',`${selected.abbreviation} · ${selected.identifier}`));panel.append(identity,el('h3',selected.name));
  panel.append(el('p',selected.path.map(id=>byId.get(id)?.name).filter(Boolean).join(' › '),'mouse-region-path'));
  panel.append(el('p','Allen CCFv3 2020 anatomical annotation','mouse-region-provenance'));
}
function selectRegion(region,voxel=null){
  selected=region;selectedValues=region?regionValues(region):new Set();point=voxel||region?.representative_voxel||null;
  if(!region)isolated=false;
  if(point)for(const [name,view] of Object.entries(planes))selectedSlices[name]=point[view.axis];
  showRegionInfo(region?null:'The clicked point is background or has no annotation in this sampled volume.');
  expression?.setRegion(region);updateGeometry();setPlane();renderRegionList();
}
function renderRegionList(){
  if(!regions)return;const list=$('mouseRegionList'),query=$('mouseRegionSearch').value.trim().toLowerCase();list.replaceChildren();
  const available=regions.filter(r=>r.value>0&&r.descendant_voxel_count>0),featured=['Isocortex','HPF','TH','HY','STR','MB','P','MY','CB','OLF'];
  const matches=query?available.filter(r=>`${r.name} ${r.abbreviation} ${r.identifier}`.toLowerCase().includes(query)):
    browseAll?available:featured.map(name=>available.find(r=>r.abbreviation===name)).filter(Boolean);
  $('mouseRegionCount').textContent=query||browseAll?`${matches.length} matching regions${matches.length>80?' · first 80 shown; type to narrow':''}`:'Start with a major region, or search by name.';
  for(const region of matches.slice(0,80)){
    const button=el('button');button.type='button';button.setAttribute('aria-pressed',String(selected?.value===region.value));
    const swatch=el('span',undefined,'mouse-region-swatch');swatch.style.background=region.color;
    const text=el('span',region.name);text.append(el('small',region.abbreviation));button.append(swatch,text);button.onclick=()=>selectRegion(region);list.append(button);
  }
  if(!matches.length)list.append(el('p','No matching sampled regions. Try another name.'));
  $('mouseBrowseRegions').textContent=browseAll?'Show major regions':`Browse all ${available.length} regions`;
}
function drawSlice(){
  if(!volume||!labels)return;
  const plane=$('mousePlane').value,view=planes[plane],shape=metadata.preview_dimensions,index=Number($('mouseSlicePosition').value);
  selectedSlices[plane]=index;const width=shape[view.u],height=shape[view.v],canvas=$('mouseSlice');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d'),image=context.createImageData(width,height),pos=[0,0,0],overlay=$('mouseShowLabels').checked;pos[view.axis]=index;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    pos[view.u]=x;pos[view.v]=height-1-y;
    const offset=voxelOffset(pos,shape),value=volume[offset],label=labels[offset],color=byValue.get(label)?.rgb;
    const alpha=overlay&&label&&color?(selected?(selectedValues.has(label)?.65:.12):.36):0,pixel=(y*width+x)*4;
    for(let channel=0;channel<3;channel++)image.data[pixel+channel]=value*(1-alpha)+(color?.[channel]||0)*alpha;
    image.data[pixel+3]=255;
  }
  context.putImageData(image,0,0);
  if(point&&point[view.axis]===index){
    const x=point[view.u]+.5,y=height-1-point[view.v]+.5;context.strokeStyle='#ffffc2';context.lineWidth=.8;context.beginPath();
    context.moveTo(x-5,y);context.lineTo(x+5,y);context.moveTo(x,y-5);context.lineTo(x,y+5);context.stroke();
  }
  canvas.setAttribute('aria-label',`${plane} mouse brain slice ${index+1} of ${shape[view.axis]}. Click to identify an Allen region.`);
  $('mouseSliceReadout').textContent=`${index+1} / ${shape[view.axis]}`;$('mouseSlicePosition').setAttribute('aria-valuetext',`${plane} slice ${index+1} of ${shape[view.axis]}`);
  const affine=metadata.preview_affine_ras_mm,coordinate=affine[view.axis][view.axis]*index+affine[view.axis][3];
  $('mouseSliceCoordinate').textContent=`${view.coordinate} coordinate: ${coordinate.toFixed(2)} mm · source NIfTI frame`;
  ['Top','Left','Right','Bottom'].forEach((side,i)=>$('mouseSlice'+side).textContent=view.labels[i]);
}
function setPlane(){
  if(!metadata)return;const plane=$('mousePlane').value,count=metadata.preview_dimensions[planes[plane].axis];
  $('mouseSlicePosition').max=count-1;$('mouseSlicePosition').value=selectedSlices[plane]??Math.floor(count/2);$('mouseSlicePosition').disabled=false;drawSlice();
}
function pickSlice(event){
  const voxel=slicePixelToVoxel(event.clientX,event.clientY,$('mouseSlice').getBoundingClientRect(),metadata.preview_dimensions,$('mousePlane').value,Number($('mouseSlicePosition').value));
  if(!voxel)return;const value=labels[voxelOffset(voxel,metadata.preview_dimensions)];selectRegion(value?byValue.get(value):null,voxel);
}
function nearestVoxel(world,value){
  const center=metadata.display_ras_center_mm,scale=metadata.display_scale_world_units_per_mm,affine=metadata.preview_affine_ras_mm;
  const ras=[world.x/scale+center[0],-world.z/scale+center[1],world.y/scale+center[2]],voxel=ras.map((x,i)=>Math.round((x-affine[i][3])/affine[i][i]));
  let best=null,distance=Infinity;
  for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
    const p=[voxel[0]+x,voxel[1]+y,voxel[2]+z],offset=voxelOffset(p,metadata.preview_dimensions),d=x*x+y*y+z*z;
    if(offset>=0&&labels[offset]===value&&d<distance){best=p;distance=d;}
  }
  return best||byValue.get(value).representative_voxel;
}
function animate(){if(!active||!renderer){frame=0;return;}controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate);}
async function load(){
  $('mouseLoading').hidden=false;$('mouseLoading').textContent='Loading Allen region labels and anatomical surfaces…';
  [metadata,annotation]=await Promise.all([response('template.json').then(r=>r.json()),response('annotation.json').then(r=>r.json())]);
  if(JSON.stringify(metadata.preview_dimensions)!==JSON.stringify(annotation.preview_dimensions))throw Error('Annotation dimensions do not match the template.');
  if(metadata.preview_affine_ras_mm.some((row,i)=>row.some((value,j)=>Math.abs(value-annotation.preview_affine_ras_mm[i][j])>1e-6)))throw Error('Annotation coordinates do not match the template.');
  const [binary,intensity,annotationBuffer,ontology]=await Promise.all([unpack(annotation.surface_file),unpack(metadata.volume_file),unpack(annotation.volume_file),response(annotation.regions_file).then(r=>r.json())]);
  volume=new Uint8Array(intensity);labels=new Uint16Array(annotationBuffer);regions=ontology.regions;parts=ontology.parts;
  const expected=metadata.preview_dimensions.reduce((a,b)=>a*b,1);if(volume.length!==expected||labels.length!==expected)throw Error('Mouse volume length does not match its dimensions.');
  byValue=new Map(regions.map(r=>{r.rgb=[1,3,5].map(i=>parseInt(r.color.slice(i,i+2),16));return[r.value,r];}));byId=new Map(regions.map(r=>[r.identifier,r]));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(binary,annotation.surface_position_offset,annotation.surface_vertex_count*3),3));
  baseIndices=new Uint32Array(binary,annotation.surface_index_offset,annotation.surface_index_count);geometry.setIndex(new THREE.BufferAttribute(baseIndices.slice(),1));
  colors=new Float32Array(annotation.surface_vertex_count*3);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));faceValues=new Uint16Array(annotation.surface_index_count/3);
  geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.computeBoundingBox();scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xdbf5ef,0x223c45,2));
  const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0x87c8d6,1.2);rim.position.set(-3,1,-2);scene.add(rim);
  mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,metalness:0,side:THREE.DoubleSide}));applyBrainOpacity(mesh.material,$('mouseBrainOpacity').value);scene.add(mesh);camera=new THREE.PerspectiveCamera(38,1,.01,100);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;$('mouseScene').replaceChildren(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.1;controls.maxDistance=18;controls.autoRotateSpeed=.5;
  let down=null;renderer.domElement.addEventListener('pointerdown',event=>{if(event.button===0)down=[event.clientX,event.clientY];});
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5){down=null;return;}down=null;
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObject(mesh,false)[0];if(!hit)return;const value=faceValues[hit.faceIndex];selectRegion(byValue.get(value),nearestVoxel(hit.point,value));
  });
  new ResizeObserver(resize).observe($('mouseScene'));
  $('mouseBrainOpacity').oninput=()=>{const value=$('mouseBrainOpacity').value;$('mouseBrainOpacityValue').textContent=value+'%';applyBrainOpacity(mesh.material,value);};
  $('mouseReset').onclick=reset;$('mouseIsolate').onclick=()=>{if(selected){isolated=!isolated;updateGeometry();if(!isolated)fit(mesh.geometry.boundingBox);}};
  $('mouseRotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('mouseRotate').setAttribute('aria-pressed',String(controls.autoRotate));};
  $('mousePlane').onchange=setPlane;$('mouseSlicePosition').oninput=drawSlice;$('mouseShowLabels').onchange=drawSlice;$('mouseRegionSearch').oninput=renderRegionList;
  $('mouseBrowseRegions').onclick=()=>{browseAll=!browseAll;renderRegionList();};$('mouseSlice').onclick=pickSlice;
  $('mouseSlice').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();const rect=$('mouseSlice').getBoundingClientRect();pickSlice({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2});}};
  reset();setPlane();renderRegionList();showRegionInfo();
  expression=await createMouseExpression(regions,updateGeometry);$('mouseLoading').hidden=true;if(active&&!frame)animate();
}
export async function showMouse(){
  active=true;if(!pending)pending=load().catch(error=>{pending=null;$('mouseLoading').hidden=false;$('mouseLoading').textContent=`Could not open the mouse atlas. ${error.message}`;console.error(error);});
  await pending;if(renderer&&active){resize();if(!frame)animate();}
}
export function hideMouse(){active=false;if(frame)cancelAnimationFrame(frame);frame=0;}
