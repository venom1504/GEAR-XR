import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rankedRegion} from '../dist/regional-ranking.js';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [data,ranking,input]=await Promise.all([read('../dist/assets/expression.json'),read('../dist/assets/regional-ranking.json'),read('../research/ranking-input.json')]);
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
test('every ranking is independently reproduced from same-study raw areas and verified genetic scores',()=>{
 for(const [name,region] of Object.entries(data.regions)){
  const expected=[];
  if(region.dataset)for(const [gene,evidence] of Object.entries(input.genes)){
   if(![1,2].includes(evidence.score))continue;
   const areas=input.measurements[region.dataset][gene];
   const target=region.areas.map(a=>areas[a]);
   const other=Object.entries(areas).filter(([a])=>!region.areas.includes(a)).map(([,v])=>v);
   if(!target.length||!other.length)continue;
   const numerator=mean(target),denominator=mean(other);
   if(denominator>0&&numerator>=1&&numerator/denominator>=1.25)expected.push({gene,enrichment:numerator/denominator,regionalMean:numerator});
  }
  expected.sort((a,b)=>b.enrichment-a.enrichment||b.regionalMean-a.regionalMean||a.gene.localeCompare(b.gene));
  const actual=ranking.regions[name];assert.equal(actual.eligibleCount,expected.length,name);
  assert.deepEqual(actual.top.map(r=>r.gene),expected.slice(0,3).map(r=>r.gene),name);
  for(const [i,row] of actual.top.entries()){
   assert(Math.abs(row.enrichment-expected[i].enrichment)<1e-10);
   assert.equal(row.comparisonAreaCount,Object.keys(input.measurements[region.dataset][row.gene]).length-row.sourceAreaCount);
   assert.equal(row.score,input.genes[row.gene].score);assert([1,2].includes(row.score));
  }
 }
});
test('ranking replaces highest-RNA default and never fills absent enrichment',()=>{
 assert.deepEqual(rankedRegion(data,ranking,'caudalanteriorcingulate').map(r=>r.gene),['TBR1','GRIN2B','SCN2A']);
 assert.deepEqual(rankedRegion(data,ranking,'caudalmiddlefrontal'),[]);
 assert.deepEqual(rankedRegion(data,ranking,'unknown'),[]);
 assert.deepEqual(rankedRegion(data,ranking,'not-a-region'),[]);
 assert(rankedRegion(data,ranking,'pericalcarine').some(r=>r.gene==='NRXN1'));
});
test('pathway filters only narrow ranked results and do not replace genetic filtering',()=>{
 for(const name of Object.keys(data.regions))for(const category of [...Object.keys(data.categories),'unlisted']){
  const rows=rankedRegion(data,ranking,name,category);
  assert(rows.every(row=>ranking.regions[name].top.some(r=>r.gene===row.gene)));
  assert(rows.every(row=>category==='unlisted'?!data.genes[row.gene].inPaperTable:!!data.genes[row.gene].pathways[category]));
 }
});
test('mapped raw measurements agree with enrichment inputs; genetic snapshot rows agree with scores',()=>{
 for(const region of Object.values(data.regions))if(region.dataset)for(const row of region.records)for(const value of row.values){
  assert.equal(input.measurements[region.dataset][row.gene][value.area],value.nTPM);
 }
 for(const [gene,info] of Object.entries(input.genes)){
  assert.equal(info.sourceRow[1],gene);assert.equal(Number(info.sourceRow[5]),info.score);
  assert.equal(ranking.genes[gene].score,info.score);
 }
});
