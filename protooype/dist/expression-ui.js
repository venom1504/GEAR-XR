import {coverageForRecord,coverageLabel} from './sample-coverage.js';
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
  constructor(data, models, onSelect, ranking, coverage) {
    this.data=data; this.models=models; this.onSelect=onSelect;this.ranking=ranking;this.coverage=coverage;
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
    el('geneList').querySelectorAll('button').forEach(button=>button.disabled=value);
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
    el('geneListNote').textContent='Strong genetic evidence: SFARI 1 or 2. Regional mean ≥1 nTPM and ≥1.25× other-area mean. This descriptive threshold is not a significance test or an ASD/control comparison.';
    el('sourceStudy').textContent=region?.dataset?(region.dataset==='pfc'?'HPA prefrontal study':'HPA human brain study')+(region.match!=='named'?' · '+region.areas.join('; '):'')+' · source values not side specific':'No source RNA assigned';
    el('geneListTitle').textContent='TOP REGIONAL CANDIDATES';
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
      const sampleText=coverageLabel(samples),limited=samples.some(s=>s.evidence?.sampleCount===1);
      const evidence=this.ranking.genes[row.gene],rank=this.ranking.regions[this.regionName].top.findIndex(r=>r.gene===row.gene)+1;
      button.setAttribute('aria-label',`Rank ${rank}: ${row.gene}, ${row.enrichment.toFixed(2)} times regional enrichment, SFARI ${evidence.score}, select evidence and protein`);
      button.innerHTML=`<span class="gene-row-top"><strong>${rank}. ${escape(row.gene)}</strong><span>${row.enrichment.toFixed(2)}× <small>enriched</small></span></span><span class="sample-chip ${limited?'limited':''}">${escape(sampleText)}</span><span class="gene-row-sub">SFARI ${evidence.score} · ${evidence.score===1?'High Confidence':'Strong Candidate'}<br>Regional mean ${row.regionalMean.toFixed(2)} vs ${row.otherAreaMean.toFixed(2)} nTPM elsewhere<br>${row.sourceAreaCount} mapped source area(s) · ${row.comparisonAreaCount} other study areas</span><span class="gene-row-bar" aria-hidden="true"><i style="width:${row.enrichment/highest*100}%"></i></span>`;
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
    if(!gene || !record)return;
    const data=this.data;const candidate=this.records.find(r=>r.gene===this.gene),genetic=this.ranking.genes[this.gene];
    el('geneEvidenceSummary').textContent=this.gene+' · genetic evidence, enrichment & source values';
    const entries=coverageForRecord(this.coverage,this.gene,region.dataset,record);
    const limited=entries.some(row=>row.evidence?.sampleCount===1);
    const rows=entries.map(row=>`<tr><td>${escape(row.area)}</td><td>${row.nTPM.toFixed(1)}</td><td>${row.evidence?.sampleCount??'Not verified'}</td></tr>`).join('');
    const source=this.coverage?.genes?.[this.gene];
    const related=Object.entries(source?.studies?.[region.dataset]||{}).filter(([name,value])=>value.matchesSavedValue&&entries.some(e=>name.startsWith(e.area.toLowerCase()+',')));
    const relatedHTML=related.length?`<h4>Related subdivisions — separate measurements</h4><p>These subdivisions are not pooled into the selected entry or its enrichment ratio.</p><table><thead><tr><th>HPA source entry</th><th>nTPM</th><th>Samples</th></tr></thead><tbody>${related.map(([name,v])=>`<tr><td>${escape(name)}</td><td>${v.displayedMean.toFixed(1)}</td><td>${v.sampleCount}</td></tr>`).join('')}</tbody></table>`:'';
    const samplingHTML=`<div class="sampling-evidence"><h4>Sampling behind this value</h4><p class="${limited?'sample-warning':''}">${escape(coverageLabel(entries))}${limited?'. A single sample cannot characterize between-donor variability. Treat this regional ranking as exploratory.':''}</p><p>Counts refer to individual HPA RNA-seq sample rows for each exact source entry, not the number of atlas parcels, comparison areas or genes. Independent donor counts are not established for multi-sample entries. A single-sample entry represents one sampled donor.</p><p>Enrichment uses regional summary values, not a donor-weighted analysis. Sample counts for the full comparison baseline have not been audited; 192 other areas does not mean 192 independent donors. The ranking has not been adjusted for sample size.</p>${source?`<p><a href="${escape(source.sourceUrl)}" target="_blank" rel="noreferrer">Verify sample rows in the original HPA page ↗</a></p>`:''}${relatedHTML}</div>`;

    const networks=Object.entries(gene.pathways).map(([key,evidence])=>{
      const source=evidence.referenceNumbers.length?'cited report'+(evidence.referenceNumbers.length>1?'s':'')+' ['+evidence.referenceNumbers.join(', ')+']':'';
      const type=[evidence.stringAssociation?'STRING association ≥0.30':'',source].filter(Boolean).join(' + ');
      return `<li><strong>${escape(data.categories[key])}</strong>: ${escape(type)}${evidence.bindingWithoutSignificantFoldChange?'. CHD8 binding sites reported; expression fold change was not statistically significant.':''}</li>`;
    }).join('');
    const protein=gene.cortexProteinIHC.length?'<table><thead><tr><th>Cortical cell type</th><th>IHC</th><th>Reliability</th></tr></thead><tbody>'+gene.cortexProteinIHC.map(row=>`<tr><td>${escape(row.cellType)}</td><td>${escape(row.level)}</td><td class="${row.reliability==='Uncertain'?'uncertain':''}">${escape(row.reliability)}</td></tr>`).join('')+'</tbody></table>':'<p>No cortical protein IHC annotation was available in the downloaded table. This does not establish absence.</p>';
    const top=gene.highestSampledBrainRNA;
    el('geneEvidenceBody').innerHTML=`${samplingHTML}<h4>Why this gene is shown</h4><p><strong>${candidate.enrichment.toFixed(2)}× regional enrichment</strong> = ${candidate.regionalMean.toFixed(3)} nTPM mean across ${candidate.sourceAreaCount} mapped source area(s) ÷ ${candidate.otherAreaMean.toFixed(3)} nTPM mean across ${candidate.comparisonAreaCount} other unique areas in the same study. Target areas are excluded. Values below are the underlying measurements; their maximum is not the ranking numerator.</p><p><strong>SFARI ${genetic.score}: ${genetic.score===1?'High Confidence':'Strong Candidate'}</strong>. ${escape(genetic.geneticCategory)}. ${genetic.reports} curated reports in the saved table; report count is not used to rank genes. <a href="${escape(genetic.url)}" target="_blank" rel="noreferrer">Official SFARI evidence table ↗</a> (retrieved ${escape(this.ranking.sfari.retrieved)}).</p><p>Genetic evidence concerns autism association overall. Regional enrichment is descriptive RNA evidence in reference tissue, not proof of region-specific causation. Ranking covers only the 20 library genes and does not compare autistic and non-autistic people.</p><p><strong>${escape(data.studies[region.dataset].label)}</strong> · ${escape(matchLabels[region.match])}. These are named-area correspondences, not pointwise measurements in this brain.</p><table><thead><tr><th>Measured source area</th><th>nTPM</th><th>Samples</th></tr></thead><tbody>${rows}</tbody></table><p>Raw source values are retained for audit. Ranking uses their arithmetic mean and a same-study baseline, not a donor average. A gene may qualify in multiple regions. Left and right use the same source values.</p><p><a href="${escape(gene.hpaUrl)}" target="_blank" rel="noreferrer">Check ${escape(this.gene)} in the Human Protein Atlas ↗</a></p><p>Human regional category: <strong>${escape(gene.humanRegionalSpecificity)}</strong>; ${escape(gene.humanRegionalDistribution)}. ${escape(gene.brainExpressionCluster)}.</p><p>Highest RNA in the source's 193-area table: ${escape(top.area)}, ${top.nTPM.toFixed(1)} nTPM. This may lie outside the cortical mesh. It is not an exclusive location.</p><p>Separate GTEx broad cortex RNA check: ${gene.gtexBrainRNA['cerebral cortex']?.toFixed(1) ?? 'unavailable'} nTPM. This is not a parcel-level replication.</p><h4>Protein evidence · broader cerebral cortex</h4>${protein}<p><a href="${escape(gene.ihcUrl)}" target="_blank" rel="noreferrer">Original cortical staining and reliability ↗</a>. IHC is not a measurement of this DKT parcel; uncertain annotations need validation. Gene-level RNA does not identify the amount, location or splice form of the displayed protein.</p><h4>Arnett et al. · Table 1</h4>${networks?'<ul>'+networks+'</ul>':'<p>This gene is not a row in Table 1. No pathway membership is inferred from its absence.</p>'}<p>STRING entries describe associations, not proof of physical binding. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8215789/#Tab1" target="_blank" rel="noreferrer">View the source table and qualifications ↗</a></p><p><a href="assets/expression-methods.html" target="_blank" rel="noreferrer">Full methods, studies, attribution and downloadable evidence ↗</a></p>`;
  }
}
