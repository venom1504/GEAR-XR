import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {regionSummary,summaryScale,expressionColor} from '../dist/human-allen-utils.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));const data=read('dist/assets/human-allen/expression.json'),atlas=read('dist/assets/brain.json');
test('Allen records preserve all 20 library genes, 62 probes, six adult donors and ordered source arrays',()=>{
 assert.deepEqual(data.genes,read('dist/assets/proteins.json').map(p=>p.gene).sort());assert.equal(data.probes.length,62);assert.equal(data.samples.length,3702);assert.equal(data.donors.length,6);
 const originals=[read('research/human-allen/expression-response.json').msg,read('research/human-allen/kmt5b-expression.json').msg];assert.deepEqual(originals[0].samples,originals[1].samples);assert.deepEqual(data.samples,originals[0].samples);
 for(const raw of originals.flatMap(o=>o.probes)){const probe=data.probes.find(p=>p.id===raw.id);assert.deepEqual(probe.expression_level,raw.expression_level.map(Number));assert.deepEqual(probe['z-score'],raw['z-score'].map(Number));assert.equal(probe['gene-symbol'],raw['gene-symbol']);if(probe.display_gene==='KMT5B'){assert.equal(probe['entrez-id'],51111);assert.equal(probe['gene-symbol'],'SUV420H1');}}
});
test('every available regional mean is independently reproduced without pooling probes, donors or hemispheres',()=>{
 const raw=read('research/human-allen/expression-response.json').msg;
 for(const donor of data.donors)for(const part of atlas.regions){const probe=data.probes.find(p=>p.display_gene==='TBR1');const result=regionSummary(data,part.id,probe,donor.id),ids=data.mapping[part.id].source_structure_ids;
 const values=raw.samples.flatMap((s,i)=>s.donor.id===donor.id&&ids.includes(s.structure.id)?[Number(raw.probes.find(p=>p.id===probe.id).expression_level[i])]:[]);
 assert.equal(result?.n??0,values.length);if(values.length){assert.equal(result.mean,values.reduce((a,b)=>a+b,0)/values.length);for(const row of result.rows)assert.ok(data.samples[row.index].structure.name.includes(', '+part.hemisphere));}
 }
 assert.equal(Object.values(data.mapping).filter(m=>m.status==='unmapped').length,24);
 for(const part of atlas.regions){assert.ok(/^#[0-9a-f]{6}$/.test(data.anatomical_colors[part.name]));}
});
test('missing and finite zero signals remain distinct; sample weighting uses all tissue samples',()=>{
 const synthetic={mapping:{p:{source_structure_ids:[1]},u:{source_structure_ids:[]}},samples:[{donor:{id:1},structure:{id:1,name:'a'},sample:{well:1}},{donor:{id:1},structure:{id:1,name:'a'},sample:{well:2}},{donor:{id:2},structure:{id:1,name:'a'},sample:{well:3}}]};
 assert.equal(regionSummary(synthetic,'p',{expression_level:[0,null,99]},1).mean,0);assert.equal(regionSummary(synthetic,'u',{expression_level:[0,2,99]},1),null);assert.equal(regionSummary(synthetic,'p',{expression_level:[0,2,99]},1).mean,1);assert.notEqual(expressionColor(undefined,0,1),expressionColor(0,0,1));assert.deepEqual(summaryScale([null,{mean:0},{mean:4}]),[0,4]);
});
test('all original human inputs match their provenance checksums',()=>{for(const entry of read('research/human-allen/manifest.json')){const b=fs.readFileSync(new URL('../'+entry.file,import.meta.url));assert.equal(b.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),entry.sha256);}});
