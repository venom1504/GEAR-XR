const el=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formatMean=value=>value>=1?value.toFixed(2):value.toFixed(3);

export function querySourceRegion(data,name,filter='all',models=[]){
  return (data.regions[name]?.records||[]).filter(row=>row.detected &&
    (filter==='all'||filter==='high'&&data.genes[row.gene].highConfidence||
     filter==='models'&&models.some(model=>model.gene===row.gene)||
     data.genes[row.gene].categories.includes(filter)));
}

export class SangerPanel{
  constructor(data,models,onGene,onRegion){
    Object.assign(this,{data,models,onGene,onRegion,gene:'',regionName:null,view:'gene',browse:'genes',category:'all',locked:false});
    el('browseGenes').onclick=()=>this.setBrowse('genes');
    el('browseRegions').onclick=()=>this.setBrowse('regions');
    el('search').oninput=()=>this.renderBrowser();
    el('pathwayFilter').replaceChildren();
    const categories=['all','high','models',...new Set(Object.values(data.genes).flatMap(g=>g.categories))];
    for(const value of categories){const o=document.createElement('option');o.value=value;o.textContent=({all:'All 250 susceptibility genes',high:'High-confidence susceptibility genes',models:'Available 3D protein models'})[value]||value;el('pathwayFilter').append(o);}
    el('pathwayFilter').onchange=()=>{this.category=el('pathwayFilter').value;this.renderBrowser();this.render();};
    el('geneSelect').replaceChildren();
    for(const model of models){const o=document.createElement('option');o.value=model.gene;o.textContent=model.gene+(data.genes[model.gene]?'':' · not in STAGE panel');el('geneSelect').append(o);}
    el('geneSelect').onchange=()=>this.selectGene(el('geneSelect').value);
    this.setBrowse('genes');
  }
  get region(){return this.data.regions[this.regionName]||null;}
  get records(){return querySourceRegion(this.data,this.regionName,this.category,this.models);}
  get currentRecord(){return this.region?.records.find(r=>r.gene===this.gene)||null;}
  setBrowse(value){this.browse=value;el('browseGenes').setAttribute('aria-pressed',String(value==='genes'));el('browseRegions').setAttribute('aria-pressed',String(value==='regions'));el('search').value='';el('search').placeholder=value==='genes'?'Find a gene, e.g. SHANK3…':'Find a source region…';el('search').setAttribute('aria-label',value==='genes'?'Find an autism-associated gene':'Find a prenatal source region');this.renderBrowser();}
  renderBrowser(){
    const query=el('search').value.toLowerCase().trim();el('regionList').replaceChildren();
    const entries=this.browse==='genes'?(this.category==='models'?this.models.map(m=>m.gene):Object.keys(this.data.genes)).filter(g=>g.toLowerCase().includes(query)).filter(g=>this.category==='all'||this.category==='models'||this.category==='high'&&this.data.genes[g]?.highConfidence||this.data.genes[g]?.categories.includes(this.category)).sort().map(g=>({id:g,label:g,sub:this.models.some(m=>m.gene===g)?'3D':'RNA',selected:this.gene===g})):Object.entries(this.data.regions).filter(([id,r])=>(r.label+' '+r.system).toLowerCase().includes(query)).sort((a,b)=>a[1].system.localeCompare(b[1].system)||a[1].label.localeCompare(b[1].label)).map(([id,r])=>({id,label:r.label,sub:r.system,selected:this.regionName===id&&this.view==='region'}));
    el('browseCount').textContent=`${entries.length} ${this.browse==='genes'?'genes':'measured regions'}`;
    el('regionList').setAttribute('aria-label',this.browse==='genes'?'Autism-associated genes':'Prenatal source regions');
    for(const item of entries){const b=document.createElement('button');b.type='button';b.className=item.selected?'selected':'';b.setAttribute('aria-label',(this.browse==='genes'?'Map gene ':'Show source region ')+item.label);b.innerHTML=`<span class="swatch"></span><span>${escape(item.label)}</span><small>${escape(item.sub)}</small>`;b.disabled=this.locked;b.onclick=()=>this.browse==='genes'?this.selectGene(item.id):this.setSourceRegion(item.id,true);el('regionList').append(b);}
    if(!entries.length){const p=document.createElement('p');p.className='gene-empty';p.textContent='No matches. Try another name or clear the filter.';el('regionList').append(p);}
  }
  setLocked(value){this.locked=value;for(const id of ['search','pathwayFilter','geneSelect','browseGenes','browseRegions'])el(id).disabled=value;for(const list of ['regionList','geneList'])el(list).querySelectorAll('button').forEach(b=>b.disabled=value);}
  setRegion(parcel){const source=this.data.cortexRegions[parcel]?.source;this.setSourceRegion(source&&this.data.regions[source]?source:null,false);}
  setSourceRegion(name,navigate=false){
    if(this.locked)return;
    this.regionName=name;this.view='region';
    // A region click lists every detected susceptibility gene. It must not
    // immediately replace that region's highlight with the first gene's peak.
    this.render();this.renderBrowser();document.querySelector('aside.right').scrollTop=0;if(navigate)this.onRegion(name);
  }
  selectGene(gene){
    if(this.locked||!this.data.genes[gene]&&!this.models.some(m=>m.gene===gene))return;
    this.gene=gene;this.view='gene';this.regionName=this.data.genes[gene]?.profile.highest||null;this.render();this.renderBrowser();document.querySelector('aside.right').scrollTop=0;this.onGene(gene,true);
  }
  render(){
    const info=this.data.genes[this.gene],region=this.region,inGene=this.view==='gene';
    el('detailEyebrow').textContent=inGene?'GENE DISTRIBUTION':'REGIONAL EXPRESSION';
    el('detailTag').textContent='16–21 GW';
    el('regionTitle').textContent=inGene?this.gene:(region?.label||'Unmapped reference surface');
    el('regionDescription').textContent=inGene?(info?(info.highConfidence?'High-confidence':'Autism')+' susceptibility gene · STAGE panel':'Structure library only · not in the STAGE susceptibility panel'):(region?region.system+' · '+region.donors+' individuals · '+region.cells.toLocaleString()+' annotated cells':'No prenatal source region is assigned here. Choose a named source region from the left.');
    el('sourceStudy').textContent=(this.data.complete?'STAGE Xenium':'LOCAL PREVIEW · INCOMPLETE')+' · prenatal forebrain · '+this.data.sections+' sections / '+this.data.subjects+' individuals';
    el('mappingBadge').textContent='Adult reference / prenatal measurements';
    el('mappingBadge').dataset.match='broader';
    el('mappingDetails').innerHTML=`<p>${escape(this.data.scope)}</p><p>Gross anatomy is linked by anatomical names. Both sides show the same source summary. Cortical plate, subplate and germinal zones are distinct prenatal compartments; adult surface highlights show only their broad anatomical context.</p><p><a href="assets/sanger-methods.html" target="_blank" rel="noreferrer">Methods, sources and complete measurements ↗</a></p>`;
    el('distributionSummary').hidden=!inGene;
    if(inGene){
      const profile=info?.profile;
      el('distributionSummary').textContent=!info?'No regional measurement in this panel.':profile.kind==='broad'?'Broad across sampled regions · full reference highlight. Unmeasured brain areas remain unknown.':profile.kind==='insufficient'?'No reliable regional peak under the display rule. Low signal is not evidence of uniform expression.':`Highest mean (≥2 individuals): ${this.data.regions[profile.highest].label}. ${profile.highlight.length>1?'Several source areas are within 80% of the peak.':'Other regions can also express this gene.'}`;
    }
    el('geneListTitle').textContent=inGene?'EXPRESSION ACROSS SOURCE REGIONS':'DETECTED SUSCEPTIBILITY GENES';
    const records=inGene?info?.regions||[]:this.records;
    el('proteinCount').textContent=records.length+(inGene?' AREAS':' GENES');
    el('geneListCount').textContent=inGene?`${this.gene}, ${records.length} sampled areas`:`${records.length} detected susceptibility genes in ${region?.label||'this area'}`;
    el('geneListNote').textContent='Counts / cell · donors weighted equally · detection includes low signal';
    el('geneList').replaceChildren();
    const peak=Math.max(.00001,...records.map(r=>r.mean));
    for(const row of records){
      const button=document.createElement('button');button.type='button';button.className='gene-row';
      const label=inGene?this.data.regions[row.region].label:row.gene;
      button.setAttribute('aria-label',inGene?`Inspect expression region ${label}`:`Map expressed gene ${row.gene}`);
      button.dataset.gene=inGene?this.gene:row.gene;
      button.innerHTML=`<span class="gene-row-top"><strong>${escape(label)}</strong><span>${formatMean(row.mean)} <small>/ cell</small></span></span><span class="gene-row-sub">${(row.positiveFraction*100).toFixed(1)}% positive cells · ${row.donors} ${row.donors===1?'individual':'individuals'}${!inGene&&this.models.some(m=>m.gene===row.gene)?' · 3D model':''}</span><span class="gene-row-bar" aria-hidden="true"><i style="width:${Math.max(1,row.mean/peak*100)}%"></i></span>`;
      button.onclick=()=>inGene?this.setSourceRegion(row.region,true):this.selectGene(row.gene);el('geneList').append(button);
    }
    if(!records.length){const p=document.createElement('p');p.className='gene-empty';p.textContent=region?'No detected genes match this filter.':'No source measurements assigned.';el('geneList').append(p);}
    el('belowCutoff').hidden=true;
    el('geneSelect').value=this.gene;
    const model=this.models.find(m=>m.gene===this.gene);
    el('explore').disabled=!model;el('proteinNav').disabled=!model;
    el('geneMeta').textContent=model?`${this.gene} · ${model.predicted?'predicted':'experimental'} protein${model.fragment?' · partial structure':''}`:(this.gene?'No 3D protein model in the current library.':'Choose a gene to inspect its regional pattern.');
    el('explore').textContent=model?'Explore '+this.gene+' protein ↗':'No 3D model available';
    el('geneEvidence').hidden=!info;
    if(info){
      el('geneEvidenceSummary').textContent=this.gene+' · source evidence and regional coverage';
      const profile=info.profile;
      el('geneEvidenceBody').innerHTML=`<p>Ensembl: ${escape(info.ensembl)}. Listed as a susceptibility gene in STAGE Supplementary Table S1; this is an association with autism risk, not a claim that expression causes autism.</p><p>${escape(this.data.measurement)}</p><p>${escape(this.data.detection)}</p><p><strong>Highlight rule:</strong> ${escape(profile.kind==='broad'?this.data.broadRule:this.data.peakRule)}</p><p>Evaluated regions: ${profile.evaluatedRegions}${profile.cv!==undefined?'; coefficient of variation '+profile.cv.toFixed(2):''}. This descriptive summary does not control for cell-type composition, age or technical differences.</p><p><a href="https://webatlas2.cellgeni.sanger.ac.uk/ASD/mv/gene/${encodeURIComponent(this.gene==='H3-3A'?'H3F3A':this.gene==='HAPSTR1'?'C16orf72':this.gene==='CFAP90'?'C5orf49':this.gene)}" target="_blank" rel="noreferrer">Inspect ${escape(this.gene)} in the Sanger atlas ↗</a></p><p><a href="${this.data.paper}" target="_blank" rel="noreferrer">Primary study · preprint ↗</a> · <a href="assets/sanger-expression.csv" download>All regional measurements (CSV)</a> · <a href="assets/sanger-methods.html" target="_blank" rel="noreferrer">Methods and limitations ↗</a></p>`;
    }
    el('contextText').textContent='Measured RNA from developing forebrain tissue. Adult reference highlights are approximate. Protein models have independent coordinates and do not represent molecules physically located in the brain.';
    this.setLocked(this.locked);
  }
}
