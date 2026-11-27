import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ccfToRas,rasToWorld,ccfToVoxel,aggregateTypes,matchingCellIndices,decodeCellPoints,pointAt} from '../dist/mouse-cells-utils.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const data=read('../dist/assets/mouse-cells/metadata.json');
const template=read('../dist/assets/mouse-ccf/template.json');
const compressed=readFileSync(new URL('../dist/assets/mouse-cells/'+data.point_file,import.meta.url));
const raw=gunzipSync(compressed),buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const points=decodeCellPoints(buffer,data);
const view=new DataView(buffer),layout=data.point_layout;
const u16=(name,i)=>view.getUint16(layout[name].offset+i*2,true);
const f32=(name,i)=>view.getFloat32(layout[name].offset+i*4,true);
test('official single-mouse provenance, exclusions and full-source counts reconcile',()=>{
 assert.equal(data.dataset,'Zhuang-ABCA-2');assert.deepEqual(data.donors,['Zhuang-ABCA-2']);assert.equal(data.license,'CC BY 4.0');
 assert.equal(data.metadata_cells,data.joined_registered_cells+data.metadata_without_registered_coordinates);
 assert.equal(data.joined_registered_cells,data.labeled_registered_cells+data.background_or_unmatched_cells);
 assert.equal(data.region_cluster_counts.reduce((n,r)=>n+r[2],0),data.labeled_registered_cells);
 assert.equal(data.sources.cells.file_hash,'bb7c5daafd2478e7240b3058b1935ed7');assert.equal(data.sources.coords.file_hash,'43ac7bdd125c068d63f44444b2713b9a');
 assert.equal(createHash('sha256').update(compressed).digest('hex'),data.point_sha256);
 assert.equal(points.length,data.rendered_cells);assert.equal(data.rendered_cells,data.labeled_registered_cells);assert.equal(raw.byteLength,data.uncompressed_bytes);
});
test('full binary set exactly reproduces source region/taxonomy counts and valid scores',()=>{
 const counts=new Map();
 for(let i=0;i<data.rendered_cells;i++){
  const cluster=u16('clusters',i),region=u16('regions',i),section=u16('sections',i);
  assert.ok(cluster<data.clusters.length);assert.ok(region>0);assert.ok(section<data.sections.length);
  const key=region+':'+cluster;counts.set(key,(counts.get(key)||0)+1);
  for(let k=0;k<3;k++)assert.ok(Number.isFinite(f32('positions',3*i+k)));
  for(let k=0;k<2;k++){const score=f32('confidence',2*i+k);assert.ok(score>=0&&score<=1);}
 }
 assert.equal(counts.size,data.region_cluster_counts.length);
 for(const [region,cluster,n] of data.region_cluster_counts)assert.equal(counts.get(region+':'+cluster),n);
});
test('binary decoder preserves source identifiers, source coordinates and confidence scores',()=>{
 const fixtures=read('../research/abc-atlas/verification-cells.json');
 const stride=Math.max(1,Math.floor(points.length/24));
 for(let j=0;j<fixtures.length;j++){
  const {cell_id,source}=fixtures[j],i=j*stride,p=pointAt(points,i);
  assert.equal(p[0],cell_id);assert.equal(data.clusters[p[4]].alias,source.cluster_alias);assert.equal(p[5],source.parcellation_index);
  assert.equal(data.sections[p[6]],source.brain_section_label);
  for(let k=0;k<3;k++)assert.ok(Math.abs(p[k+1]-source[['x','y','z'][k]])<.0000015);
  assert.ok(Math.abs(p[7]-source.subclass_confidence_score)<.000051);assert.ok(Math.abs(p[8]-source.cluster_confidence_score)<.000051);
  assert.equal(p[9],source.high_quality_transfer);
  const idOffset=layout.ids.offset+i*16;
  const expectedId=(view.getBigUint64(idOffset,false)<<64n)|view.getBigUint64(idOffset+8,false);
  assert.equal(p[0],expectedId.toString());
 }
});
test('CCF AP/DV/ML points transform into the existing RAS anatomy without mirroring',()=>{
 const a=data.coordinate_frame.ras_affine_from_ccf_mm,p=[6.6,4,5.7];
 const ras=ccfToRas(p,a);assert.ok(Math.abs(ras[0]-.005)<1e-5);assert.ok(Math.abs(ras[1]+1.25)<1e-5);assert.ok(Math.abs(ras[2]-1.22)<1e-5);
 const voxel=ccfToVoxel(p,a,template);assert.ok(Math.abs(voxel[0]-114)<1e-4);assert.ok(Math.abs(voxel[1]-131)<1e-4);assert.ok(Math.abs(voxel[2]-79)<1e-4);
 assert.ok(rasToWorld(ras,template).every(Number.isFinite));assert.ok(data.registration_audit.nearest_25um_label_agreement>.9);
});
test('categorical counts and point filters intersect on region and type without sampling',()=>{
 const all=aggregateTypes(data,'class');assert.equal(all.reduce((n,e)=>n+e.count,0),points.length);assert.ok(all.length>20);
 const first=pointAt(points,0),values=new Set([first[5]]),category=data.clusters[first[4]].subclass;
 const filtered=matchingCellIndices(points,data.clusters,'subclass',category,values);assert.ok(filtered.length>0);
 assert.ok(filtered.every(i=>{const p=pointAt(points,i);return values.has(p[5])&&data.clusters[p[4]].subclass===category;}));
 const count=aggregateTypes(data,'subclass',values).find(e=>e.name===category).count;assert.equal(filtered.length,count);
 assert.equal(aggregateTypes(data,'class',new Set()).length,0);assert.equal(matchingCellIndices(points,data.clusters,'class','nonexistent').length,0);
});
test('decoder rejects truncated or inconsistent binary assets',()=>{
 assert.throws(()=>decodeCellPoints(buffer.slice(0,buffer.byteLength-4),data));
 assert.throws(()=>decodeCellPoints(buffer,{...data,rendered_cells:data.rendered_cells+1}));
});
