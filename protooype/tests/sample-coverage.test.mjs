import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {coverageForRecord,coverageLabel,sampleEntry,sampleSummary} from '../dist/sample-coverage.js';
const load=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [coverage,expression,ranking]=await Promise.all([load('../dist/assets/sample-coverage.json'),load('../dist/assets/expression.json'),load('../dist/assets/regional-ranking.json')]);
test('Expanded TBR1 summary retains original 105 nTPM with n=1 and four identifiable sources',()=>{
 const row=expression.regions.postcentral.records.find(r=>r.gene==='TBR1');
 const entries=coverageForRecord(coverage,'TBR1','hpa',row);
 assert.equal(entries.length,4);assert.equal(entries[0].nTPM,105);
 assert.equal(entries[0].evidence.sampleCount,1);assert.equal(entries[0].evidence.samples[0].id,'2533');
 assert.match(coverageLabel(entries),/15 tissue samples across 4 source entries/);
 assert.equal(sampleSummary(entries).limited,false);
 assert.equal(sampleSummary(entries).independentDonors,null);
 const source=coverage.genes.TBR1.studies.hpa;
 assert.equal(source['postcentral gyrus, dorsal'].sampleCount,6);
 assert.equal(source['postcentral gyrus, middle'].sampleCount,5);
 assert.equal(source['postcentral gyrus, ventral'].sampleCount,3);
 assert.equal(source['precentral gyrus'].sampleCount,1);
 assert.equal(source['precentral gyrus'].samples[0].id,'2557');
 assert.equal(source['postcentral gyrus, dorsal'].independentDonorCount,null);
 assert.equal(ranking.regions.postcentral.top[0].regionalMean,85.175);
});
test('unknown counts and changed values do not masquerade as verified sampling',()=>{
 assert.equal(sampleEntry(coverage,'TBR1','hpa','postcentral gyrus',104),null);
 assert.equal(sampleEntry(coverage,'TBR1','pfc','postcentral gyrus',105),null);
 assert.equal(sampleEntry(coverage,'UNKNOWN','hpa','postcentral gyrus',105),null);
 assert.match(coverageLabel([{evidence:null}]),/not verified/);
 assert.match(coverageLabel([{evidence:{sampleCount:1}},{evidence:{sampleCount:6}}]),/not verified/);
});
test('every sample count equals retained sample rows; no invented independent donor counts',()=>{
 for(const gene of Object.values(coverage.genes))for(const areas of Object.values(gene.studies))for(const row of Object.values(areas)){
  assert(row.sampleCount>0);assert.equal(row.sampleCount,row.samples.length);
  assert.equal(new Set(row.samples.map(s=>s.id)).size,row.sampleCount);
  assert.equal(row.independentDonorCount,row.sampleCount===1?1:null);
  assert(row.samples.every(s=>Number.isFinite(s.nTPM)&&s.description&&s.id));
 }
});
