import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rankedRegion} from '../dist/regional-ranking.js';
const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
const [data,ranking,input,coverage]=await Promise.all([read('../dist/assets/expression.json'),read('../dist/assets/regional-ranking.json'),read('../research/ranking-input.json'),read('../dist/assets/sample-coverage.json')]);
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const pool=rows=>{const m=new Map();for(const row of rows)for(const s of row.samples){if(m.has(s.id))assert.equal(m.get(s.id),s.nTPM);m.set(s.id,s.nTPM);}return m;};
test('all regional rankings independently reproduce equal-tissue weighting on target and baseline',()=>{
 assert.equal(ranking.method,'tissue-sample-weighted');
 for(const [name,region] of Object.entries(data.regions)){
  const expected=[];
  if(region.dataset)for(const [gene,evidence] of Object.entries(input.genes)){
   if(![1,2].includes(evidence.score))continue;
   const raw=coverage.genes[gene].studies[region.dataset];
   const areas=Object.keys(input.measurements[region.dataset][gene]);
   if(!region.areas.length||region.areas.some(a=>!raw[a.toLowerCase()]?.matchesSavedValue))continue;
   const target=pool(region.areas.map(a=>raw[a.toLowerCase()]));
   const baseline=pool(areas.filter(a=>!region.areas.includes(a)&&raw[a.toLowerCase()]?.matchesSavedValue).map(a=>raw[a.toLowerCase()]));
   for(const id of target.keys())baseline.delete(id);
   if(!target.size||!baseline.size)continue;
   const numerator=mean([...target.values()]),denominator=mean([...baseline.values()]);
   if(denominator>0&&numerator>=1&&numerator/denominator>=1.25)expected.push({gene,enrichment:numerator/denominator,regionalMean:numerator,target:target.size,baseline:baseline.size});
  }
  expected.sort((a,b)=>b.enrichment-a.enrichment||b.regionalMean-a.regionalMean||a.gene.localeCompare(b.gene));
  const actual=ranking.regions[name];assert.equal(actual.eligibleCount,expected.length,name);assert.deepEqual(actual.top.map(r=>r.gene),expected.slice(0,3).map(r=>r.gene),name);
  for(const [i,row] of actual.top.entries()){
   assert(Math.abs(row.enrichment-expected[i].enrichment)<1e-10);assert.equal(row.targetSampleCount,expected[i].target);assert.equal(row.comparisonSampleCount,expected[i].baseline);
   assert(Math.abs(row.areaWeights.reduce((sum,a)=>sum+a.weight,0)-1)<1e-12);assert.equal(row.score,input.genes[row.gene].score);
  }
 }
});
test('rankings never fill empty regions or blacklist NRXN1 to force variety',()=>{
 assert.equal(rankedRegion(data,ranking,'postcentral')[0].gene,'TBR1');
 assert.deepEqual(rankedRegion(data,ranking,'caudalmiddlefrontal'),[]);assert.deepEqual(rankedRegion(data,ranking,'unknown'),[]);assert.deepEqual(rankedRegion(data,ranking,'not-a-region'),[]);
 assert(ranking.regions.pericalcarine.evaluated.some(r=>r.gene==='NRXN1'));
});
test('pathway filters only narrow ranked results and do not replace genetic filtering',()=>{
 for(const name of Object.keys(data.regions))for(const category of [...Object.keys(data.categories),'unlisted']){
  const rows=rankedRegion(data,ranking,name,category);assert(rows.every(row=>ranking.regions[name].top.some(r=>r.gene===row.gene)));
  assert(rows.every(row=>category==='unlisted'?!data.genes[row.gene].inPaperTable:!!data.genes[row.gene].pathways[category]));
 }
});
test('mapped source summaries and genetic rows retain original evidence',()=>{
 for(const region of Object.values(data.regions))if(region.dataset)for(const row of region.records)for(const value of row.values)assert.equal(input.measurements[region.dataset][row.gene][value.area],value.nTPM);
 for(const [gene,info] of Object.entries(input.genes)){assert.equal(info.sourceRow[1],gene);assert.equal(Number(info.sourceRow[5]),info.score);assert.equal(ranking.genes[gene].score,info.score);}
});
test('missing PFC sample tables are explicitly excluded rather than equal-area imputed',()=>{
 for(const [name,region] of Object.entries(data.regions))for(const row of ranking.regions[name].evaluated){
  if(region.dataset==='pfc')assert.deepEqual(row.excludedBaselineAreas,['parietal cortex']);else assert.deepEqual(row.excludedBaselineAreas,[]);
  assert.equal(row.comparisonAreaCount+row.excludedBaselineAreas.length,row.totalComparisonAreaCount);
 }
});
