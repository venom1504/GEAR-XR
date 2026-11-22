import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {selectedSurfaceIndices,isSelectionBorder} from '../dist/mouse-selection.js';
import {regionValues,planes,voxelOffset} from '../dist/mouse-annotation-utils.js';
const read=name=>readFileSync(new URL('../dist/assets/mouse-ccf/'+name,import.meta.url));const annotation=JSON.parse(read('annotation.json')),{regions,parts}=JSON.parse(read('regions.json'));
const bytes=gunzipSync(read(annotation.surface_file));const indices=new Uint32Array(bytes.buffer,bytes.byteOffset+annotation.surface_index_offset,annotation.surface_index_count);
test('selected parent outline uses only the original triangles of its descendant union',()=>{
 for(const id of ['MBA:549','MBA:315']){
  const selected=regionValues(regions.find(r=>r.identifier===id));const actual=selectedSurfaceIndices(parts,indices,selected);let offset=0;
  for(const part of parts)if(selected.has(part.value)){assert.deepEqual(actual.subarray(offset,offset+part.index_count),indices.subarray(part.index_start,part.index_start+part.index_count));offset+=part.index_count;}
  assert.ok(offset>0);assert.equal(actual.length,offset);
 }
 assert.equal(selectedSurfaceIndices(parts,indices,new Set()).length,0);
});
test('slice outlines follow the real selected annotation union and exclude interior subdivision boundaries',()=>{
 const buffer=gunzipSync(read(annotation.volume_file)),labels=new Uint16Array(buffer.buffer,buffer.byteOffset,buffer.byteLength/2);const shape=annotation.preview_dimensions;
 const region=regions.find(r=>r.identifier==='MBA:549'),values=regionValues(region);
 for(const view of Object.values(planes)){
  const width=shape[view.u],height=shape[view.v],mask=new Uint8Array(width*height),point=[...region.representative_voxel];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){point[view.u]=x;point[view.v]=height-1-y;mask[y*width+x]=values.has(labels[voxelOffset(point,shape)])?1:0;}
  let borders=0,interiors=0;
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if(isSelectionBorder(mask,width,height,x,y)){assert.equal(mask[i],1);assert.ok([mask[i-1],mask[i+1],mask[i-width],mask[i+width]].includes(0));borders++;}else if(mask[i]&&mask[i-1]&&mask[i+1]&&mask[i-width]&&mask[i+width])interiors++;}
  assert.ok(borders>0);assert.ok(interiors>0);
 }
});
