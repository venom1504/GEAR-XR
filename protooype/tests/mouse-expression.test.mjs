import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {measurement,energyMaximum,energyColor} from '../dist/mouse-expression-utils.js';
const data=JSON.parse(fs.readFileSync(new URL('../dist/assets/mouse-expression/expression.json',import.meta.url)));
const regions=JSON.parse(fs.readFileSync(new URL('../dist/assets/mouse-ccf/regions.json',import.meta.url))).regions;
test('six mouse genes and ten separate adult coronal experiments have auditable source measurements',()=>{
 assert.deepEqual(data.genes.map(g=>g.gene),['Ctf1','Tbr1','Slc17a7','Gad1','Pvalb','Sst']);
 assert.equal(data.genes.flatMap(g=>g.experiments).length,10);
 for(const gene of data.genes)for(const exp of gene.experiments){
  assert.equal(exp.age,'P56');assert.equal(exp.plane,'coronal');
  const raw=JSON.parse(fs.readFileSync(new URL(`../research/mouse-expression/${gene.gene}-${exp.id}-regional-statistics.json`,import.meta.url))).msg;
  assert.equal(Object.keys(exp.stats).length,raw.length);
  for(const row of raw){const mapped=exp.stats['MBA:'+row.structure_id];assert.equal(mapped.expression_energy,row.expression_energy);assert.equal(mapped.expression_density,row.expression_density);assert.equal(mapped.expression_intensity,row.sum_expressing_pixels>0?row.sum_expressing_pixel_intensity/row.sum_expressing_pixels:null);}
  assert.ok(energyMaximum(exp,regions)>0);
 }
});
test('exact-ID lookup preserves observed zero and never fills missing data from parent regions',()=>{
 const exp={stats:{'MBA:1':{expression_energy:0,expression_density:0,sum_pixels:100}}};
 assert.equal(measurement(exp,'MBA:1').expression_energy,0);assert.equal(measurement(exp,'MBA:2'),null);
 assert.equal(measurement({stats:{x:{expression_energy:1,expression_density:.1,sum_pixels:0}}},'x'),null);
 assert.notEqual(energyColor(0,10),energyColor(undefined,10));assert.equal(energyColor(10,10),'#ffce63');
});
test('downloaded original records and grid archives match recorded checksums',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../research/mouse-expression/download-manifest.json',import.meta.url)));
 for(const item of manifest){const buffer=fs.readFileSync(new URL('../'+item.path,import.meta.url));assert.equal(buffer.length,item.bytes);assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),item.sha256);}
});
