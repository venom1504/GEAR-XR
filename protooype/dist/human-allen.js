import {regionSummary,expressionColor,summaryScale} from './human-allen-utils.js';
const $=id=>document.getElementById(id),node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;},fmt=x=>Number.isFinite(x)?x.toFixed(3):'Unavailable';
export async function createHumanAtlasDisplay(parcels,onChange){
 const root=$('humanAtlasControls');
 try{
  const response=await fetch('assets/human-allen/expression.json');if(!response.ok)throw Error(`HTTP ${response.status}`);const data=await response.json();
  let selected=null,source='allen',gene='TBR1',probe,donor=data.donors[0],colorMode='labels',summaries=new Map(),scale=[0,0];
  const sourceLabel=node('label','Evidence dataset'),sourceSelect=node('select');sourceSelect.id='humanEvidenceSource';sourceLabel.htmlFor=sourceSelect.id;
  for(const [value,text] of [['allen','Allen Human Brain Atlas · adult microarray'],['hpa','HPA · existing regional candidates']]){const o=node('option',text);o.value=value;sourceSelect.append(o);}
  const controls=node('div');controls.className='human-allen-controls';
  const field=(id,label)=>{const l=node('label',label),s=node('select');l.htmlFor=id;s.id=id;controls.append(l,s);return s;};
  const genes=field('humanAllenGene','Gene · current 20-gene library');for(const g of data.genes){const o=node('option',g);o.value=g;genes.append(o);}genes.value=gene;
  const donors=field('humanAllenDonor','Donor · kept separate');for(const d of data.donors){const o=node('option',`${d.name} · ${d.age}`);o.value=d.id;donors.append(o);}
  const probes=field('humanAllenProbe','Measurement probe');
  const advanced=node('details');advanced.id='humanProbeSettings';advanced.append(node('summary','Probe settings (kept separate)'));const probeLabel=probes.previousElementSibling;advanced.append(probeLabel,probes);controls.append(advanced);
  const probeNote=node('p','Multiple probes measure different sequences. Probes are kept separate; the initial probe is the lowest ID, not a validated best probe.');probeNote.className='human-data-small';advanced.append(probeNote);
  const colorsLabel=node('label','Surface colors'),colors=node('select');colors.id='humanSurfaceColors';colorsLabel.htmlFor=colors.id;
  for(const [v,t] of [['labels','Anatomical labels · FreeSurfer colors'],['expression','Selected gene · regional RNA mean']]){const o=node('option',t);o.value=v;colors.append(o);}
  const legend=node('div');legend.id='humanExpressionLegend';legend.className='human-expression-legend';
  const stats=node('div');stats.id='humanAllenStats';stats.setAttribute('aria-live','polite');controls.insertBefore(stats,advanced);
  const details=node('details');details.append(node('summary','Source samples and measurement details'));const samples=node('div');samples.id='humanAllenSamples';details.append(samples);controls.append(details);
  const limits=node('p','Adult reference RNA, not childhood development or an ASD/control comparison. Colors summarize named AHBA source areas on DKT parcels; boundaries differ and are not spatially registered to BigBrain. Gray = no mapped sample for this donor.');limits.className='human-data-limit';
  const links=node('p');for(const [text,href] of [['Allen dataset ↗',data.source_url],['Methods ↗','assets/human-allen/methods.html'],['Mapping ↗','assets/human-allen/mapping.json'],['Data download','assets/human-allen/expression.json']]){const a=node('a',text);a.href=href;a.target='_blank';a.rel='noreferrer';links.append(a,document.createTextNode(' · '));}
  root.replaceChildren(sourceLabel,sourceSelect,colorsLabel,colors,legend,controls,limits,links);
  function probeOptions(){probes.replaceChildren();const choices=data.probes.filter(p=>p.display_gene===gene).sort((a,b)=>a.id-b.id);for(const p of choices){const o=node('option',`${p.id} · ${p.name}`);o.value=p.id;probes.append(o);}probe=choices[0];}
  function rebuild(){summaries=new Map(parcels.map(p=>[p.userData.id,regionSummary(data,p.userData.id,probe,donor.id)]));scale=summaryScale([...summaries.values()]);}
  function render(){
   $('hpaHumanEvidence').hidden=source!=='hpa';controls.hidden=source!=='allen';limits.hidden=source!=='allen';$('proteinNav').disabled=source==='allen';
   colors.querySelector('option[value="expression"]').disabled=source!=='allen';if(source!=='allen'&&colorMode==='expression'){colorMode='labels';colors.value='labels';}
   legend.hidden=colorMode!=='expression';legend.replaceChildren(node('span',fmt(scale[0])),node('i'),node('span',fmt(scale[1])));legend.append(node('small','log2 normalized microarray mean · gray = unavailable. Lighting and opacity affect apparent colors.'));
   if(source==='allen'){$('detailEyebrow').textContent='ALLEN HUMAN RNA';$('detailTag').textContent='ADULT';if(selected)$('regionDescription').textContent=selected.userData.hemisphere+' hemisphere · approximate anatomical-name mapping';}
   else{$('detailEyebrow').textContent='REGIONAL GENE CANDIDATES';$('detailTag').textContent='HUMAN RNA';if(selected)$('regionDescription').textContent=selected.userData.hemisphere+' hemisphere · HPA source values not side specific';}
   stats.replaceChildren();samples.replaceChildren();const summary=summaries.get(selected?.userData.id),mapping=data.mapping[selected?.userData.id];
   stats.append(node('h3',`${gene} · ${donor.name}`),node('p',`Probe ${probe.id} · ${probe.name}`));
   if(!summary){stats.append(node('p',selected?'No mapped samples for this parcel and donor. This does not mean the gene is absent.':'Select a cortical region.'));}
   else{const dl=node('dl');for(const [k,v] of [['Regional mean',fmt(summary.mean)+' log2'],['Tissue samples',String(summary.n)+' · 1 donor'],['Sample range',fmt(summary.min)+'–'+fmt(summary.max)],['Mapping','Approximate · anatomical names']])dl.append(node('dt',k),node('dd',v));stats.append(dl);}
   samples.append(node('p',`Probe ${probe.id} (${probe.name}); Allen symbol ${probe['gene-symbol']}${probe.display_gene!==probe['gene-symbol']?' = '+probe.display_gene+' (Entrez '+probe['entrez-id']+')':''}. Mean of the selected probe’s available log2-normalized tissue signals. Not nTPM, molecule counts, protein abundance, or an enrichment ratio. No averaging across donors or probes.`));
   samples.append(node('p',mapping?.rationale||'Select a cortical region.'));
   if(summary){const table=node('table');const header=node('tr');for(const title of ['Well ID / source area','log2'])header.append(node('th',title));table.append(header);for(const row of summary.rows){const tr=node('tr');tr.append(node('td',row.well+' · '+row.structure),node('td',fmt(row.value)));table.append(tr);}samples.append(table);}
  }
  const refresh=()=>{rebuild();render();onChange();};
  sourceSelect.onchange=()=>{source=sourceSelect.value;render();onChange();};genes.onchange=()=>{gene=genes.value;probeOptions();refresh();};donors.onchange=()=>{donor=data.donors.find(d=>String(d.id)===donors.value);refresh();};probes.onchange=()=>{probe=data.probes.find(p=>String(p.id)===probes.value);refresh();};colors.onchange=()=>{colorMode=colors.value;render();onChange();};
  probeOptions();rebuild();render();
  return {nextGene(){const index=data.genes.indexOf(gene);gene=data.genes[(index+1)%data.genes.length];genes.value=gene;probeOptions();refresh();},get vrLines(){const s=summaries.get(selected?.userData.id);return [gene+' · Allen adult human RNA',selected?selected.userData.name+' · '+selected.userData.hemisphere:'Select a cortical region',donor.name+' · '+donor.age,s?fmt(s.mean)+' log2 · '+s.n+' tissue samples':'No mapped samples for selected region', 'Approximate name mapping; not voxel localization.','RNA signal is not protein abundance.'];},get source(){return source;},get gene(){return gene;},get colorMode(){return colorMode;},setRegion(p){selected=p;render();},color(p){return colorMode==='expression'?expressionColor(summaries.get(p.userData.id)?.mean,...scale):(data.anatomical_colors[p.userData.name]||'#59636c');},get caption(){return colorMode==='expression'?`${gene} · AHBA regional mean · approximate name mapping, not voxel localization`:'DKT cortical labels · FreeSurfer colors · transparency is a display setting';}};
 }catch(error){root.textContent='Allen human data could not load. Existing HPA evidence remains available. '+error.message;return null;}
}
