import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {voxelOffset,slicePixelToVoxel,regionValues} from '../dist/mouse-annotation-utils.js';

const asset=name=>new URL('../dist/assets/mouse-ccf/'+name,import.meta.url);
const annotation=JSON.parse(readFileSync(asset('annotation.json'))),template=JSON.parse(readFileSync(asset('template.json')));
const {regions,parts}=JSON.parse(readFileSync(asset('regions.json')));
const labelBytes=gunzipSync(readFileSync(asset(annotation.volume_file)));
const labels=new Uint16Array(labelBytes.buffer,labelBytes.byteOffset,labelBytes.byteLength/2);
const byValue=new Map(regions.map(region=>[region.value,region]));

test('official annotation and anatomical preview have identical voxel coordinates',()=>{
  assert.deepEqual(annotation.preview_dimensions,template.preview_dimensions);
  assert.deepEqual(annotation.preview_affine_ras_mm,template.preview_affine_ras_mm);
  assert.equal(annotation.template_affine_max_error_mm,0);
  assert.equal(labels.length,template.preview_dimensions.reduce((a,b)=>a*b,1));
});
test('compact annotation values use the official name mapping, not MBA structure IDs',()=>{
  const thalamus=regions.find(region=>region.identifier==='MBA:549');
  assert.equal(thalamus.name,'Thalamus');assert.equal(thalamus.value,539);
  assert.equal(regions.find(region=>region.identifier==='MBA:315').value,1332);
  for(const value of new Set(labels))if(value!==0)assert.ok(byValue.has(value),`Unnamed value ${value}`);
});
test('each selectable region focuses a voxel within that region or its official descendants',()=>{
  for(const region of regions.filter(r=>r.value>0&&r.descendant_voxel_count>0)){
    const offset=voxelOffset(region.representative_voxel,template.preview_dimensions);
    assert.ok(offset>=0,region.name);
    assert.ok(regionValues(region).has(labels[offset]),region.name);
  }
  assert.equal(voxelOffset([-1,10,10],template.preview_dimensions),-1);
  assert.equal(regionValues({value:0,descendant_values:[0,539]}).has(0),false);
});
test('slice clicks respect all three plane orientations and ignore letterboxing',()=>{
  const rect={left:100,top:200,width:200,height:200},shape=[4,6,8];
  assert.deepEqual(slicePixelToVoxel(162.5,212.5,rect,shape,'coronal',3),[0,3,7]);
  assert.deepEqual(slicePixelToVoxel(150,216.66666666666666,rect,shape,'horizontal',4),[0,5,4]);
  assert.deepEqual(slicePixelToVoxel(137.5,212.5,rect,shape,'sagittal',2),[2,0,7]);
  for(const plane of ['coronal','horizontal','sagittal'])assert.equal(slicePixelToVoxel(101,201,rect,shape,plane,0),null);
  assert.equal(slicePixelToVoxel(250,400,rect,shape,'coronal',0),null);
});
test('every displayed label surface has valid triangles and a unique face-to-label range',()=>{
  const bytes=gunzipSync(readFileSync(asset(annotation.surface_file)));
  assert.equal(bytes.byteLength,annotation.surface_index_offset+annotation.surface_index_count*4);
  const positions=new Float32Array(bytes.buffer,bytes.byteOffset,annotation.surface_vertex_count*3);
  const indices=new Uint32Array(bytes.buffer,bytes.byteOffset+annotation.surface_index_offset,annotation.surface_index_count);
  let indexEnd=0,vertexEnd=0;
  assert.equal(parts.length,annotation.present_annotation_values);
  assert.equal(new Set(parts.map(p=>p.value)).size,parts.length);
  for(const part of parts){
    assert.equal(part.index_start,indexEnd);assert.equal(part.vertex_start,vertexEnd);assert.ok(byValue.has(part.value));
    assert.equal(part.index_count%3,0);
    for(let i=part.index_start;i<part.index_start+part.index_count;i++)assert.ok(indices[i]>=part.vertex_start&&indices[i]<part.vertex_start+part.vertex_count);
    indexEnd+=part.index_count;vertexEnd+=part.vertex_count;
  }
  assert.equal(indexEnd,indices.length);assert.equal(vertexEnd,annotation.surface_vertex_count);
  for(const number of positions)assert.ok(Number.isFinite(number));
});
