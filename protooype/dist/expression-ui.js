import {mappingContext} from './mapping-context.js?v=complete-baseline-1';
import {coverageForRecord,coverageLabel,sampleSummary} from './sample-coverage.js?v=complete-baseline-1';
import {rankedRegion} from './regional-ranking.js';
const el = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const matchLabels = {named:'Named anatomical match',related:'Related area · approximate',broader:'Broader region · approximate',unmapped:'No regional match'};

export function queryRegion(data, name, category='all') {
  const region = data.regions[name];
  if (!region) return [];
  return region.records.filter(record => record.detected &&
    (category === 'all' || (category === 'unlisted' ? !data.genes[record.gene].inPaperTable : Boolean(data.genes[record.gene].pathways[category]))));
}

export class ExpressionPanel {
  constructor(data, models, onSelect, ranking, coverage, labels={}) {
    this.data=data; this.models=models; this.onSelect=onSelect;this.ranking=ranking;this.coverage=coverage;this.labels=labels;
    this.regionName=null; this.category='all'; this.gene=''; this.locked=false;
    el('pathwayFilter').onchange=()=>{this.category=el('pathwayFilter').value;this.render();};
    el('geneSelect').onchange=()=>this.selectGene(el('geneSelect').value);
    for (const [value,label] of Object.entries(data.categories)) {
      const option=document.createElement('option');option.value=value;option.textContent=label+' network';el('pathwayFilter').append(option);
    }
    const unlisted=document.createElement('option');unlisted.value='unlisted';unlisted.textContent='Not listed in Table 1';el('pathwayFilter').append(unlisted);
  }
  get region(){return this.data.regions[this.regionName] || null;}
  get records(){return rankedRegion(this.data,this.ranking,this.regionName,this.category);}
  get currentRecord(){return this.region?.records.find(row=>row.gene===this.gene) || null;}
  setRegion(name){if(name!==this.regionName)this.gene='';this.regionName=name;this.render();}
  setLocked(value){
    this.locked=value;el('pathwayFilter').disabled=value;el('geneSelect').disabled=value || !this.records.length;
    el('geneList').querySelectorAll('button').forEach(button=>button.disabled=value);el('search').disabled=value;el('regionList').querySelectorAll('button').forEach(button=>button.disabled=value);
  }
  selectGene(gene){
    if(this.locked || !this.records.some(row=>row.gene===gene))return;
    this.gene=gene;el('geneSelect').value=gene;
    el('geneList').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gene===gene)));
    this.onSelect(gene);this.renderEvidence();
  }
  render(){
    const region=this.region,records=this.records;
    const total=this.ranking.regions[this.regionName]?.eligibleCount||0;
    el('proteinCount').textContent=records.length+' SHOWN';
    el('geneListCount').textContent=`${records.length} of up to 3 regional candidates · ${total} genes meet the rule in the 20-gene library`;
    el('geneListNote').textContent='Strong genetic evidence: SFARI 1 or 2. Equal weight per tissue sample, not per source area. Sample mean ≥1 nTPM and ≥1.25× the same-study comparison mean. This descriptive threshold is not a significance test or an ASD/control comparison.';
    el('sourceStudy').textContent=region?.dataset?(region.dataset==='pfc'?'HPA prefrontal study':'HPA human brain study')+(region.match!=='named'?' · '+region.areas.join('; '):'')+' · source values not side specific':'No source RNA assigned';
    const mapping=mappingContext(this.data,this.regionName);
    const shared=mapping?.peers.map(id=>this.labels[id]||id)||[];
    el('mappingNotice').hidden=!records.length||!['broader','related'].includes(region?.match);
    el('mappingNotice').textContent=region?.match==='broader'?`Broader ${region.areas.join(' / ')} evidence. Measurements specific to ${this.labels[this.regionName]||this.regionName} are unavailable in this crosswalk.${shared.length?' These measurements and rankings are shared with '+shared.join(', ')+'.':''} Distinct atlas parcels do not imply distinct expression measurements.`:`Related-area evidence from ${region?.areas.join(' / ')}; this is not a measurement registered to the selected parcel.`;
    document.querySelector('.sampling-note').hidden=!records.length;
    el('geneListTitle').textContent=region?.match==='broader'?'SHARED SOURCE-AREA CANDIDATES':'TOP REGIONAL CANDIDATES';
    el('mappingBadge').textContent=matchLabels[region?.match || 'unmapped'];
    el('mappingBadge').dataset.match=region?.match || 'unmapped';
    el('mappingDetails').replaceChildren();
    if(region?.dataset){
      const study=this.data.studies[region.dataset];
      const p=document.createElement('p');p.textContent=study.label+' · gene-level RNA-seq · HPA '+this.data.hpaVersion;el('mappingDetails').append(p);
      const area=document.createElement('p');area.textContent='Measured source: '+region.areas.join('; ');el('mappingDetails').append(area);
      const note=document.createElement('p');note.textContent=region.rationale+' Values are not side specific and were not measured in this BigBrain specimen.';el('mappingDetails').append(note);
    }else{
      const p=document.createElement('p');p.textContent=region?.rationale || 'Choose a labeled cortical region to see its evidence.';el('mappingDetails').append(p);
    }
    const methods=document.createElement('a');methods.href='assets/expression-methods.html';methods.target='_blank';methods.rel='noreferrer';methods.textContent='Sources, mapping rules & all source values ↗';el('mappingDetails').append(methods);
    el('geneList').replaceChildren();el('geneSelect').replaceChildren();
    const highest=records.length?Math.max(...records.map(row=>row.enrichment)):1;
    for(const row of records){
      const button=document.createElement('button');button.type='button';button.className='gene-row';button.dataset.gene=row.gene;
      const samples=coverageForRecord(this.coverage,row.gene,region.dataset,row);
      const sampleText=coverageLabel(samples),limited=sampleSummary(samples).limited;
      const evidence=this.ranking.genes[row.gene],rank=this.ranking.regions[this.regionName].top.findIndex(r=>r.gene===row.gene)+1;
      button.setAttribute('aria-label',`Rank ${rank}: ${row.gene}, ${row.enrichment.toFixed(2)} times regional enrichment, SFARI ${evidence.score}, select evidence and protein`);
      button.innerHTML=`<span class="gene-row-top"><strong>${rank}. ${escape(row.gene)}</strong><span>${row.enrichment.toFixed(2)}× <small>enriched</small></span></span><span class="sample-chip ${limited?'limited':''}">${escape(sampleText)}</span><span class="gene-row-sub">SFARI ${evidence.score} · ${evidence.score===1?'High Confidence':'Strong Candidate'}<br>Sample-weighted mean ${row.regionalMean.toFixed(3)} vs ${row.otherAreaMean.toFixed(3)} nTPM elsewhere<br>${row.targetSampleCount} target tissues · ${row.comparisonSampleCount} comparison tissues<br>${row.comparisonAreaCount}/${row.totalComparisonAreaCount} other source areas verified${row.excludedBaselineAreas.length?' · incomplete baseline coverage':''}</span><span class="gene-row-bar" aria-hidden="true"><i style="width:${row.enrichment/highest*100}%"></i></span>`;
      button.setAttribute('aria-label',button.getAttribute('aria-label')+'. '+sampleText);
      button.onclick=()=>this.selectGene(row.gene);el('geneList').append(button);
      const option=document.createElement('option');option.value=row.gene;option.textContent=`${row.gene} · ${row.enrichment.toFixed(2)}× enrichment`;el('geneSelect').append(option);
    }
    const below=region?.records.filter(row=>!row.detected) || [];
    el('belowCutoff').hidden=true;
    el('belowCutoffSummary').textContent=`Below the RNA cutoff (${below.length})`;
    el('belowCutoffText').textContent=below.map(row=>row.gene+' '+row.nTPM.toFixed(1)+' nTPM').join(' · ')+'. Below cutoff does not prove absence.';
    if(!records.length){
      const p=document.createElement('p');p.className='gene-empty';p.textContent=region?.dataset?(this.category==='all'?'No genes meet both the genetic-evidence and regional-enrichment rules here. A missing result does not imply no autism relevance.':'None of the top three candidates match this article network. Choose All networks to see the regional ranking.'):'No regional measurements are mapped to this surface.';el('geneList').append(p);
      this.gene='';el('geneMeta').textContent='No qualifying regional candidate. Choose another region.';
      el('geneEvidence').hidden=true;this.onSelect('');
    }else{
      if(!records.some(row=>row.gene===this.gene))this.gene=records[0].gene;
      el('geneEvidence').hidden=false;
      el('geneList').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gene===this.gene)));
      el('geneSelect').value=this.gene;this.onSelect(this.gene);this.renderEvidence();
    }
    el('explore').disabled=!records.length;el('proteinNav').disabled=!records.length;
    this.setLocked(this.locked);
  }
  renderEvidence(){
    const gene=this.data.genes[this.gene],record=this.currentRecord,region=this.region;
    if(!gene || !record || !this.records.some(r=>r.gene===this.gene)){
      el('geneEvidence').hidden=true;return;
    }
    el('geneEvidence').hidden=false;
    const data=this.data;const candidate=this.records.find(r=>r.gene===this.gene),genetic=this.ranking.genes[this.gene];
    el('geneEvidenceSummary').textContent=this.gene+' · genetic evidence, enrichment & source values';
    const entries=coverageForRecord(this.coverage,this.gene,region.dataset,record);
    const stats=sampleSummary(entries),limited=stats.limited;
    const source=this.coverage?.genes?.[this.gene];
    const rows=entries.map(row=>`<tr><td>${row.evidence?`<a href="${escape(row.evidence.sourceUrl)}" target="_blank" rel="noreferrer">${escape(row.area)} ↗</a>`:escape(row.area)}</td><td>${row.nTPM.toFixed(1)}</td><td>${row.evidence?.sampleCount??'Not verified'}</td><td>${row.evidence?.sampleRange?.map(v=>v.toFixed(1)).join('–')||'Not verified'}</td><td>${((candidate.areaWeights.find(v=>v.area===row.area)?.weight||0)*100).toFixed(1)}%</td></tr>`).join('');
    const perSample=entries.map(entry=>`<details class="individual-samples"><summary>${escape(entry.area)} · ${entry.evidence?.sampleCount??'unverified'} tissue sample${entry.evidence?.sampleCount===1?'':'s'}</summary>${entry.evidence?'<table><thead><tr><th>Sample ID</th><th>Source description (not a donor ID)</th><th>nTPM</th></tr></thead><tbody>'+entry.evidence.samples.map(v=>`<tr><td>${escape(v.id)}</td><td>${escape(v.description)}</td><td>${v.nTPM.toFixed(1)}</td></tr>`).join('')+'</tbody></table>':'<p>No verified source sample table.</p>'}</details>`).join('');
    const samplingHTML=`<div class="sampling-evidence"><h4>Sampling behind this value</h4><p class="${limited?'sample-warning':''}">${escape(coverageLabel(entries))}${limited?'. This entry cannot establish between-donor variability.':''}</p><p>Regional summary: <strong>${candidate.regionalMean.toFixed(3)} nTPM</strong>. ${'All '+candidate.targetSampleCount+' individual tissue samples have equal weight ('+(100/candidate.targetSampleCount).toFixed(2)+'% each). Source entries contribute in proportion to their sample counts. Original HPA entry means remain below for provenance; the ranking uses the individual sample values, so small rounding differences are expected.'}</p><table><thead><tr><th>Source entry</th><th>Mean nTPM</th><th>Tissue samples</th><th>Sample range</th><th>Sample share</th></tr></thead><tbody>${rows}</tbody></table><p>Individual sample nTPM values may be rounded. Ranges describe observed tissue measurements, not confidence intervals. Donors can contribute multiple tissues; sex, age and hemisphere are not reliable unique donor identifiers.</p><p>Comparison mean: ${candidate.comparisonSampleCount} verified tissue samples from ${candidate.comparisonAreaCount} of ${candidate.totalComparisonAreaCount} other same-study source areas. Target sample IDs are excluded, and repeated tissue IDs are counted once. ${candidate.excludedBaselineAreas.length?'Excluded because individual sample tables are unavailable or do not match the saved release: '+escape(candidate.excludedBaselineAreas.join(', '))+'. No equal-area fallback is used.':'All other source areas in this study are covered.'} Tissue samples are not independent donors. Donor imbalance, cell composition, age and uncertainty remain unadjusted.</p>${perSample}</div>`;

    const networks=Object.entries(gene.pathways).map(([key,evidence])=>{
      const source=evidence.referenceNumbers.length?'cited report'+(evidence.referenceNumbers.length>1?'s':'')+' ['+evidence.referenceNumbers.join(', ')+']':'';
      const type=[evidence.stringAssociation?'STRING association ≥0.30':'',source].filter(Boolean).join(' + ');
      return `<li><strong>${escape(data.categories[key])}</strong>: ${escape(type)}${evidence.bindingWithoutSignificantFoldChange?'. CHD8 binding sites reported; expression fold change was not statistically significant.':''}</li>`;
    }).join('');
    const protein=gene.cortexProteinIHC.length?'<table><thead><tr><th>Cortical cell type</th><th>IHC</th><th>Reliability</th></tr></thead><tbody>'+gene.cortexProteinIHC.map(row=>`<tr><td>${escape(row.cellType)}</td><td>${escape(row.level)}</td><td class="${row.reliability==='Uncertain'?'uncertain':''}">${escape(row.reliability)}</td></tr>`).join('')+'</tbody></table>':'<p>No cortical protein IHC annotation was available in the downloaded table. This does not establish absence.</p>';
    const top=gene.highestSampledBrainRNA;
    el('geneEvidenceBody').innerHTML=`${samplingHTML}<h4>Why this gene is shown</h4><p><strong>${candidate.enrichment.toFixed(2)}× regional enrichment</strong> = ${candidate.regionalMean.toFixed(3)} nTPM mean across ${candidate.targetSampleCount} individual target tissues ÷ ${candidate.otherAreaMean.toFixed(3)} nTPM mean across ${candidate.comparisonSampleCount} comparison tissues in the same study. Target areas are excluded. The earlier equal-area regional mean was ${candidate.legacyEqualAreaRegionalMean.toFixed(3)} nTPM; it is retained for audit and no longer drives the ranking.</p><p><strong>SFARI ${genetic.score}: ${genetic.score===1?'High Confidence':'Strong Candidate'}</strong>. ${escape(genetic.geneticCategory)}. ${genetic.reports} curated reports in the saved table; report count is not used to rank genes. <a href="${escape(genetic.url)}" target="_blank" rel="noreferrer">Official SFARI evidence table ↗</a> (retrieved ${escape(this.ranking.sfari.retrieved)}).</p><p>Genetic evidence concerns autism association overall. Regional enrichment is descriptive RNA evidence in reference tissue, not proof of region-specific causation. Ranking covers only the 20 library genes and does not compare autistic and non-autistic people.</p><p><strong>${escape(data.studies[region.dataset].label)}</strong> · ${escape(matchLabels[region.match])}. These are named-area correspondences, not pointwise measurements in this brain.</p><p>Exact source values, sample counts, ranges and area weights are shown in the sampling table above.</p><p>Raw source values are retained for audit. Ranking pools individual sample values and uses a same-study sample-weighted baseline, not an independent-donor average. A gene may qualify in multiple regions. Left and right use the same source values.</p><p><a href="${escape(gene.hpaUrl)}" target="_blank" rel="noreferrer">Check ${escape(this.gene)} in the Human Protein Atlas ↗</a></p><p>Human regional category: <strong>${escape(gene.humanRegionalSpecificity)}</strong>; ${escape(gene.humanRegionalDistribution)}. ${escape(gene.brainExpressionCluster)}.</p><p>Highest RNA in the source's 193-area table: ${escape(top.area)}, ${top.nTPM.toFixed(1)} nTPM. This may lie outside the cortical mesh. It is not an exclusive location.</p><p>Separate GTEx broad cortex RNA check: ${gene.gtexBrainRNA['cerebral cortex']?.toFixed(1) ?? 'unavailable'} nTPM. This is not a parcel-level replication.</p><h4>Protein evidence · broader cerebral cortex</h4>${protein}<p><a href="${escape(gene.ihcUrl)}" target="_blank" rel="noreferrer">Original cortical staining and reliability ↗</a>. IHC is not a measurement of this DKT parcel; uncertain annotations need validation. Gene-level RNA does not identify the amount, location or splice form of the displayed protein.</p><h4>Arnett et al. · Table 1</h4>${networks?'<ul>'+networks+'</ul>':'<p>This gene is not a row in Table 1. No pathway membership is inferred from its absence.</p>'}<p>STRING entries describe associations, not proof of physical binding. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8215789/#Tab1" target="_blank" rel="noreferrer">View the source table and qualifications ↗</a></p><p><a href="assets/expression-methods.html" target="_blank" rel="noreferrer">Full methods, studies, attribution and downloadable evidence ↗</a></p>`;
  }
}
