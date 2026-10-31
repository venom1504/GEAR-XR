import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from '../dist/assets/three.module.js';
import {mappingContext} from '../dist/mapping-context.js';
import {sampleSummary,coverageForRecord} from '../dist/sample-coverage.js';
import {disposeChildren,revealParcels,pointerCoordinates} from '../dist/scene-tools.js';
const file=path=>readFile(new URL(path,import.meta.url));
const read=async path=>JSON.parse(await file(path));
const [data,coverage,ranking,models]=await Promise.all([read('../dist/assets/expression.json'),read('../dist/assets/sample-coverage.json'),read('../dist/assets/regional-ranking.json'),read('../dist/assets/proteins.json')]);
test('cuneus and lateral occipital explicitly share broader occipital source evidence',()=>{
 const context=mappingContext(data,'cuneus');assert.equal(context.match,'broader');assert.deepEqual(context.areas,['occipital cortex']);assert(context.peers.includes('lateraloccipital'));
 assert.deepEqual(ranking.regions.cuneus.top,ranking.regions.lateraloccipital.top);
 assert.equal(mappingContext(data,'unknown'),null);
});
test('one-sample postcentral entry has 1/15 weight, not 25%, and means come from individual tissues',()=>{
 const record=data.regions.postcentral.records.find(r=>r.gene==='TBR1');
 assert.deepEqual(record.values.map(v=>v.nTPM),[105,65.1,84.8,85.8]);
 const entries=coverageForRecord(coverage,'TBR1','hpa',record),stats=sampleSummary(entries);
 assert.equal(stats.tissueSamples,15);assert.equal(stats.sourceCount,4);assert.equal(stats.independentDonors,null);
 const pooled=entries.flatMap(e=>e.evidence.samples);const pooledMean=pooled.reduce((a,s)=>a+s.nTPM,0)/pooled.length;
 const ranked=ranking.regions.postcentral.evaluated.find(v=>v.gene==='TBR1');
 assert(Math.abs(pooledMean-ranked.regionalMean)<1e-10);assert.equal(ranked.legacyEqualAreaRegionalMean,85.175);
 assert.equal(ranked.areaWeights[0].weight,1/15);assert.equal(ranked.areaWeights[1].weight,6/15);
 assert.equal(ranked.comparisonSampleCount,951);assert.match(data.regions.postcentral.summaryMethod,/equal sample weight/);
 assert.equal(data.regions.postcentral.records.find(r=>r.gene==='TBR1').originalValues[0].nTPM,105);
});
test('SCN2A superior frontal uses verified separate PFC study samples with direct citation',()=>{
 const record=data.regions.superiorfrontal.records.find(r=>r.gene==='SCN2A');const [entry]=coverageForRecord(coverage,'SCN2A','pfc',record);
 assert.equal(entry.nTPM,11.6);assert.equal(entry.evidence.sampleCount,10);assert.deepEqual(entry.evidence.sampleRange,[3.9,25.4]);
 assert.match(entry.evidence.sourceUrl,/#hpa_pfc_brain_rnaseqsuperior_frontal_gyrus$/);assert.equal(entry.evidence.independentDonorCount,null);
});
test('all 880 mapped gene-source entries have matching means and actual individual sample rows',()=>{
 let total=0;
 for(const region of Object.values(data.regions))for(const record of region.records){
  for(const entry of coverageForRecord(coverage,record.gene,region.dataset,record)){
   total++;assert(entry.evidence,`${record.gene} ${region.dataset} ${entry.area}`);
   assert.equal(entry.evidence.samples.length,entry.evidence.sampleCount);
   assert.equal(entry.nTPM,entry.evidence.displayedMean);
   assert.deepEqual(entry.evidence.sampleRange,[Math.min(...entry.evidence.samples.map(s=>s.nTPM)),Math.max(...entry.evidence.samples.map(s=>s.nTPM))]);
  }
 }
 assert.equal(total,880);
});
test('the 4240 imported sample-table entries retain valid page checksums',async()=>{
 let entries=0;
 for(const gene of Object.values(coverage.genes)){
  for(const page of gene.sourcePages){
   const raw=await file('../research/sample-coverage-source/'+page.file);assert.equal(createHash('sha256').update(raw).digest('hex'),page.sha256);
  }
  for(const study of Object.values(gene.studies))for(const row of Object.values(study)){entries++;assert(row.sourceUrl.endsWith('#'+row.anchor));assert(gene.sourcePages.some(p=>p.sha256===row.sourceSHA256));}
 }
 assert.equal(entries,4240);
});
test('all six previously missing extraction files exactly match their historical checksums',async()=>{
 for(const [name,hash] of Object.entries(data.sourceChecksums))assert.equal(createHash('sha256').update(await file('../research/expression-source/'+name)).digest('hex'),hash,name);
 assert.equal(Object.keys(data.sourceChecksums).length,6);
});
for(const [gene,pdb] of [['ASH1L','3OPE'],['DYRK1A','2VX3'],['PTEN','5BZZ']]){
 test(`${gene} shows one representative chain, preserves coordinates and cites a monomeric assembly`,async()=>{
  const display=await read(`../dist/assets/${gene}.json`),original=await read(`../research/protein-display-original/${gene}.json`),assembly=await read(`../research/protein-assemblies/${pdb}-assembly-1.json`);
  assert(original.chains.length>1);assert.equal(display.chains.length,1);assert.deepEqual(display.chains[0],original.chains[0]);
  assert.equal(assembly.rcsb_assembly_info.polymer_entity_instance_count_protein,1);
  assert.equal(display.displaySelection.chain,'A');assert.equal(models.find(m=>m.gene===gene).residues,display.chains[0].length);
 });
}
test('restoring parcel visibility keeps both hemispheres together',()=>{
 const parcels=Array.from({length:64},(_,i)=>({visible:i%2===0,userData:{hemisphere:i<32?'left':'right'}}));revealParcels(parcels);
 assert.equal(parcels.filter(p=>p.visible).length,64);assert.equal(parcels.filter(p=>p.visible&&p.userData.hemisphere==='left').length,32);
});
test('picking uses the actual renderer rectangle rather than whole-window coordinates',()=>{
 const rect={left:290,top:140,width:600,height:400};assert.deepEqual(pointerCoordinates({clientX:590,clientY:340},rect),{x:0,y:0});assert.deepEqual(pointerCoordinates({clientX:290,clientY:140},rect),{x:-1,y:1});
});
test('repeated protein replacement removes old children and disposes resources',()=>{
 const group=new THREE.Group();let calls=0;
 for(let i=0;i<4;i++){const geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();geometry.addEventListener('dispose',()=>calls++);material.addEventListener('dispose',()=>calls++);group.add(new THREE.Mesh(geometry,material));}
 disposeChildren(group);assert.equal(group.children.length,0);assert.equal(calls,8);disposeChildren(group);assert.equal(calls,8);
});
