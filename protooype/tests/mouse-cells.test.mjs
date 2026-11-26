import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ccfToRas,rasToWorld,ccfToVoxel,aggregateTypes,matchingCellIndices} from '../dist/mouse-cells-utils.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const data=read('../dist/assets/mouse-cells/metadata.json');
const template=read('../dist/assets/mouse-ccf/template.json');
const compressed=readFileSync(new URL('../dist/assets/mouse-cells/cells.json.gz',import.meta.url));
const {points}=JSON.parse(gunzipSync(compressed));
test('official single-mouse provenance, exclusions and full-source counts reconcile',()=>{
 assert.equal(data.dataset,'Zhuang-ABCA-2');assert.deepEqual(data.donors,['Zhuang-ABCA-2']);assert.equal(data.license,'CC BY 4.0');
 assert.equal(data.metadata_cells,data.joined_registered_cells+data.metadata_without_registered_coordinates);
 assert.equal(data.joined_registered_cells,data.labeled_registered_cells+data.background_or_unmatched_cells);
 assert.equal(data.region_cluster_counts.reduce((n,r)=>n+r[2],0),data.labeled_registered_cells);
 assert.equal(data.sources.cells.file_hash,'bb7c5daafd2478e7240b3058b1935ed7');assert.equal(data.sources.coords.file_hash,'43ac7bdd125c068d63f44444b2713b9a');
 assert.equal(createHash('sha256').update(compressed).digest('hex'),data.point_sha256);assert.equal(points.length,data.rendered_cells);
});
test('sample preserves source identifiers, confidence scores and the documented unbiased hash rule',()=>{
 const fixtures=read('../research/abc-atlas/verification-cells.json');
 for(const {cell_id,source,display_record:p} of fixtures){
  assert.equal(p[0],cell_id);assert.equal(data.clusters[p[4]].alias,source.cluster_alias);assert.equal(p[5],source.parcellation_index);
  assert.equal(data.sections[p[6]],source.brain_section_label);assert.ok(Math.abs(p[1]-source.x)<1e-6);assert.ok(Math.abs(p[7]-source.subclass_confidence_score)<.000051);
 }
 for(const p of points){assert.equal(parseInt(createHash('sha256').update(p[0]).digest('hex').slice(0,8),16)%8,0);assert.ok(p[7]>=0&&p[7]<=1);assert.ok(p[8]>=0&&p[8]<=1);}
});
test('CCF AP/DV/ML points transform into the existing RAS anatomy without mirroring',()=>{
 const a=data.coordinate_frame.ras_affine_from_ccf_mm,p=[6.6,4,5.7];
 const ras=ccfToRas(p,a);assert.ok(Math.abs(ras[0]-.005)<1e-5);assert.ok(Math.abs(ras[1]+1.25)<1e-5);assert.ok(Math.abs(ras[2]-1.22)<1e-5);
 const voxel=ccfToVoxel(p,a,template);assert.ok(Math.abs(voxel[0]-114)<1e-4);assert.ok(Math.abs(voxel[1]-131)<1e-4);assert.ok(Math.abs(voxel[2]-79)<1e-4);
 const world=rasToWorld(ras,template);assert.ok(world.every(Number.isFinite));assert.ok(data.registration_audit.nearest_25um_label_agreement>.9);
});
test('categorical counts use all eligible records; region and type filters intersect correctly',()=>{
 const all=aggregateTypes(data,'class');assert.equal(all.reduce((n,e)=>n+e.count,0),data.labeled_registered_cells);assert.ok(all.length>20);
 const values=new Set([points[0][5]]),category=data.clusters[points[0][4]].subclass;
 const filtered=matchingCellIndices(points,data.clusters,'subclass',category,values);assert.ok(filtered.length>0);
 assert.ok(filtered.every(i=>values.has(points[i][5])&&data.clusters[points[i][4]].subclass===category));
 assert.equal(aggregateTypes(data,'class',new Set()).length,0);assert.equal(matchingCellIndices(points,data.clusters,'class','nonexistent').length,0);
 assert.ok(aggregateTypes(data,'subclass',values).reduce((n,e)=>n+e.count,0)>=filtered.length);
});
