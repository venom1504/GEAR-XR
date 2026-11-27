import * as THREE from 'three';
import {planes,regionValues} from './mouse-annotation-utils.js';
import {decodeCellPoints,pointAt,aggregateTypes,matchingCellIndices} from './mouse-cells-utils.js?v=full-cells-1';
const $=id=>document.getElementById(id),BASE='assets/mouse-cells/';
const count=n=>n.toLocaleString();
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function link(text,url){const a=el('a',text);a.href=url;a.target='_blank';a.rel='noreferrer';return a;}
export function createMouseCells({scene,template,regions,expression,onChange}){
 let data,points,pointCloud,shown=[],selected=null,level='class',type=null,mode='anatomy',pending,priorOpacity=null,visibility,voxels,sliceHeads,sliceNext,lastColorLevel;
 const byValue=new Map(regions.map(r=>[r.value,r]));
 const toolbar=$('mouseCellControls'),panel=$('mouseCellsPanel');
 toolbar.replaceChildren(el('span','View data','cell-toolbar-label'));
 const group=el('div',undefined,'cell-mode-buttons');group.setAttribute('role','group');group.setAttribute('aria-label','Mouse data display');
 const buttons=new Map();
 for(const [value,label] of [['anatomy','Anatomy'],['expression','ISH expression'],['cells','ABC cell types']]){const b=el('button',label);b.type='button';b.id='mouseMode'+value;b.setAttribute('aria-pressed',String(value===mode));b.onclick=()=>setMode(value);buttons.set(value,b);group.append(b);}
 const help=el('p','Anatomical region colors. Select ABC cell types to show registered MERFISH cell locations.','cell-mode-help');toolbar.append(group,help);
 panel.hidden=true;
 const status=el('p','Select ABC cell types to load the dataset.');status.id='mouseCellsStatus';status.setAttribute('role','status');panel.append(status);
 const levelLabel=el('label','Color cells by'),levelSelect=el('select');levelSelect.id='mouseCellLevel';levelLabel.htmlFor=levelSelect.id;
 for(const [value,label] of [['class','Cell class · broad groups'],['subclass','Cell subclass · finer types'],['neurotransmitter','Neurotransmitter annotation']]){const o=el('option',label);o.value=value;levelSelect.append(o);}
 const searchLabel=el('label','Find a cell type'),search=el('input');search.id='mouseCellSearch';search.type='search';search.placeholder='e.g. Astro, Pvalb, Glut…';searchLabel.htmlFor=search.id;
 const scopeLabel=el('label',undefined,'mouse-overlay-toggle'),scope=el('input');scope.type='checkbox';scope.id='mouseCellsRegionOnly';scope.checked=true;scope.disabled=true;scopeLabel.append(scope,document.createTextNode('Limit cells to selected brain region'));
 const all=el('button','Show all cell types','cell-reset');all.id='mouseCellReset';all.type='button';
 const categories=el('div',undefined,'cell-type-list');categories.id='mouseCellLegend';categories.setAttribute('aria-label','Cell type legend and filters');
 const summary=el('p','');summary.id='mouseCellCounts';summary.setAttribute('aria-live','polite');
 const picked=el('div',undefined,'cell-picked');picked.id='mouseCellDetails';picked.hidden=true;
 const note=el('p','Category colors · all eligible registered cell centers. Coverage is uneven and can be one-sided; empty space does not mean a cell type is absent. Counts describe this dataset, not the entire living brain.','cell-explanation');
 const details=el('details');details.append(el('summary','Dataset, confidence & limitations'));
 async function load(){
  if(pending)return pending;
  pending=(async()=>{
   status.textContent='Loading official Zhuang-ABCA-2 cell annotations…';
   const response=await fetch(BASE+'metadata.json');if(!response.ok)throw Error(`Metadata HTTP ${response.status}`);data=await response.json();
   const r=await fetch(BASE+data.point_file);if(!r.ok)throw Error(`Cell positions HTTP ${r.status}`);
   const compressed=await r.arrayBuffer();
   const digest=await crypto.subtle.digest('SHA-256',compressed),hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==data.point_sha256)throw Error('Cell download checksum does not match metadata.');
   const raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();points=decodeCellPoints(raw,data);
   const geometry=new THREE.BufferGeometry(),positions=new Float32Array(points.length*3),affine=data.coordinate_frame.ras_affine_from_ccf_mm,center=template.display_ras_center_mm,scale=template.display_scale_world_units_per_mm,preview=template.preview_affine_ras_mm,shape=template.preview_dimensions;
   voxels=new Float32Array(points.length*3);visibility=new Uint8Array(points.length);
   sliceHeads=shape.map(n=>new Int32Array(n).fill(-1));sliceNext=shape.map(()=>new Int32Array(points.length).fill(-1));
   for(let i=0;i<points.length;i++){
    const o=i*3,x=points.positions[o],y=points.positions[o+1],z=points.positions[o+2];
    const rx=affine[0][0]*x+affine[0][1]*y+affine[0][2]*z+affine[0][3],ry=affine[1][0]*x+affine[1][1]*y+affine[1][2]*z+affine[1][3],rz=affine[2][0]*x+affine[2][1]*y+affine[2][2]*z+affine[2][3];
    positions[o]=(rx-center[0])*scale;positions[o+1]=(rz-center[2])*scale;positions[o+2]=-(ry-center[1])*scale;
    voxels[o]=(rx-preview[0][3])/preview[0][0];voxels[o+1]=(ry-preview[1][3])/preview[1][1];voxels[o+2]=(rz-preview[2][3])/preview[2][2];
    for(let axis=0;axis<3;axis++){const bucket=Math.floor(voxels[o+axis]);if(bucket<0||bucket>=shape[axis])continue;sliceNext[axis][i]=sliceHeads[axis][bucket];sliceHeads[axis][bucket]=i;}
   }
   geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(points.length*3),3));geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(points.length),1));geometry.computeBoundingSphere();
   const material=new THREE.PointsMaterial({size:2.5,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.95,depthWrite:false,depthTest:true});
   pointCloud=new THREE.Points(geometry,material);pointCloud.renderOrder=2;pointCloud.visible=mode==='cells';scene.add(pointCloud);
   panel.replaceChildren(el('div','ABC ATLAS / ZHUANG-ABCA-2','eyebrow'),el('h2','Cell types'),status,note,scopeLabel,levelLabel,levelSelect,searchLabel,search,all,summary,categories,picked,details);
   details.append(el('p','Common label abbreviations: Glut = glutamatergic, Gaba = GABAergic, NN = non-neuronal, Astro = astrocyte, Oligo = oligodendrocyte, OPC = oligodendrocyte precursor. These are annotation labels, not autism diagnoses.'),el('p','Cell colors are categories, not expression levels. Each dot marks a cell center, not its shape. The existing ISH measurements and ABC cell annotations come from different specimens.'),el('p',`${data.dataset} · ${data.donors.length} adult wild-type ${data.donor_sex.join('/')} mouse. Metadata ${data.sources.cells.version}; CCF coordinates ${data.sources.coords.version}; taxonomy ${data.sources.taxonomy.version}.`),el('p',`${count(data.metadata_cells)} source metadata cells; ${count(data.joined_registered_cells)} join to CCF coordinates; ${count(data.labeled_registered_cells)} have a known non-background atlas label. ${count(data.metadata_without_registered_coordinates)} metadata cells without registered coordinates and ${count(data.background_or_unmatched_cells)} background/unmatched registered cells are excluded.`),el('p',data.sampling),el('p','The source authors filtered metadata by label-transfer confidence. Each selected cell shows its source subclass and cluster confidence. These are assignment scores, not disease probabilities. Categories use the WMB transcriptomic taxonomy; the neurotransmitter label describes an annotation, not a directly measured release event.'));
   for(const text of data.limitations)details.append(el('p',text));
   details.append(link('Official dataset ↗',data.source_url),document.createTextNode(' · '),link('Allen tutorial ↗',data.tutorial_url),document.createTextNode(' · '),link('Zhang et al. (2023) ↗',data.paper_url),el('p','Data: CC BY 4.0. Derived browser data and reproducible processing are available below.'),link('Metadata, counts & source checksums',BASE+'metadata.json'),document.createTextNode(' · '),link('Download all eligible cell records (binary)',BASE+data.point_file),document.createTextNode(' · '),link('Methods & access plans','assets/mouse-cells/methods.html'));
   status.textContent=`${data.dataset} · One adult mouse · ${count(points.length)} eligible registered cells · no display sampling`;
   levelSelect.onchange=()=>{level=levelSelect.value;type=null;refresh();};search.oninput=renderLegend;all.onclick=()=>{type=null;search.value='';refresh();};scope.onchange=refresh;
   refresh();
  })().catch(error=>{pending=null;status.textContent=`Cell annotations unavailable: ${error.message}. Anatomy and ISH expression remain available.`;throw error;});
  return pending;
 }
 function values(){return selected&&scope.checked?regionValues(selected):null;}
 function renderLegend(){
  if(!data)return;const entries=aggregateTypes(data,level,values()),query=search.value.trim().toLowerCase(),matches=entries.filter(e=>e.name.toLowerCase().includes(query));categories.replaceChildren();
  for(const entry of matches.slice(0,80)){
   const b=el('button');b.type='button';b.setAttribute('aria-pressed',String(type===entry.name));const swatch=el('span',undefined,'cell-type-swatch');swatch.style.background=entry.color;
   b.append(swatch,el('span',entry.name),el('small',count(entry.count)));b.onclick=()=>{type=type===entry.name?null:entry.name;refresh();};categories.append(b);
  }
  if(matches.length>80)categories.append(el('p',`${matches.length} types match. First 80 shown; search to narrow.`));
  if(!matches.length)categories.append(el('p','No cell types match this search in the current region.'));
 }
 function refresh(){
  if(!data||!pointCloud)return;const regionSet=values();shown=matchingCellIndices(points,data.clusters,level,type,regionSet);
  visibility.fill(0);for(const i of shown)visibility[i]=1;
  pointCloud.geometry.index.array.set(shown);pointCloud.geometry.index.needsUpdate=true;pointCloud.geometry.setDrawRange(0,shown.length);
  if(lastColorLevel!==level){
   const palette=data.clusters.map(c=>new THREE.Color(c[level+'_color']||'#99aabb')),colors=pointCloud.geometry.attributes.color.array;
   for(let i=0;i<points.length;i++){const rgb=palette[points.clusters[i]],o=i*3;colors[o]=rgb.r;colors[o+1]=rgb.g;colors[o+2]=rgb.b;}
   pointCloud.geometry.attributes.color.needsUpdate=true;lastColorLevel=level;
  }
  const entries=aggregateTypes(data,level,regionSet),total=entries.reduce((n,e)=>n+e.count,0),filtered=type?entries.find(e=>e.name===type)?.count||0:total;
  summary.textContent=`${selected&&scope.checked?selected.name:'All covered regions'}: ${count(filtered)} source cells${type?' · '+type:''}. ${count(shown.length)} cell centers displayed; ${count(total)} source cells across all types in this scope.`;
  picked.hidden=true;renderLegend();onChange();
 }
 async function setMode(next){
  mode=next;document.body.dataset.mouseMode=mode;panel.hidden=mode!=='cells';for(const [name,b] of buttons)b.setAttribute('aria-pressed',String(name===mode));
  if(mode==='cells'&&priorOpacity===null){priorOpacity=$('mouseBrainOpacity').value;$('mouseBrainOpacity').value=20;}
  if(mode!=='cells'&&priorOpacity!==null){$('mouseBrainOpacity').value=priorOpacity;priorOpacity=null;}
  $('mouseBrainOpacityValue').textContent=$('mouseBrainOpacity').value+'%';
  expression?.setActive(mode==='expression');if(pointCloud)pointCloud.visible=mode==='cells';
  document.querySelector('.mouse-view-heading .eyebrow').textContent=mode==='cells'?'CLICK A CELL DOT FOR ITS ANNOTATION':'CLICK A REGION TO IDENTIFY IT';
  help.textContent=mode==='cells'?'Categorical cell colors · Zhuang-ABCA-2 MERFISH · Click a dot for its source annotation.':mode==='expression'?'Continuous regional RNA signal · Allen ISH · Different specimens from the ABC cell layer.':'Anatomical region colors · Allen CCFv3 reference.';
  onChange();if(mode==='cells')try{await load();}catch(error){console.error(error);}
 }
 $('mouseExpressionColors')?.addEventListener('change',event=>{setMode(event.target.checked?'expression':'anatomy');});
 function showCell(p){
  const c=data.clusters[p[4]];picked.hidden=false;picked.replaceChildren(el('h3',c.subclass),el('p',`${c.class} · ${c.neurotransmitter||'Unassigned transmitter'}`),el('p',`Cluster: ${c.cluster}`),el('p',`Source region: ${byValue.get(p[5])?.name||p[5]} · Section ${data.sections[p[6]]}`),el('p',`Subclass confidence ${p[7].toFixed(4)} · Cluster confidence ${p[8].toFixed(4)} · High-quality transfer: ${p[9]?'yes':'no'}`),el('p',`CCF (AP, DV, ML): ${p.slice(1,4).map(x=>x.toFixed(4)).join(', ')} mm`),el('p',`Source cell ID: ${p[0]}`));picked.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 return {get active(){return mode==='cells';},setMode,setRegion(region){selected=region;scope.disabled=!region;if(data)refresh();},pick(ray){if(mode!=='cells'||!pointCloud)return false;ray.params.Points.threshold=.008;const hit=ray.intersectObject(pointCloud,false)[0];if(!hit)return false;showCell(pointAt(points,hit.index));return true;},
 drawSlice(context,plane,index){
  if(mode!=='cells'||!pointCloud)return;const view=planes[plane],shape=template.preview_dimensions;
  for(let bucket=Math.max(0,index-1);bucket<=Math.min(shape[view.axis]-1,index+1);bucket++)for(let i=sliceHeads[view.axis][bucket];i!==-1;i=sliceNext[view.axis][i]){
   const o=i*3;if(!visibility[i]||Math.abs(voxels[o+view.axis]-index)>1)continue;context.fillStyle=data.clusters[points.clusters[i]][level+'_color']||'#99aabb';context.beginPath();context.arc(voxels[o+view.u],shape[view.v]-1-voxels[o+view.v],.65,0,Math.PI*2);context.fill();
  }
 }};
}
