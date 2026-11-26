import {measurement,energyMaximum,energyColor} from './mouse-expression-utils.js';
const $=id=>document.getElementById(id);
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function number(x){return Number.isFinite(x)?x.toLocaleString(undefined,{maximumSignificantDigits:4}):'Unavailable';}
export async function createMouseExpression(regions,onChange){
  const panel=$('mouseExpression');
  try{
    const response=await fetch('assets/mouse-expression/expression.json');if(!response.ok)throw Error(`HTTP ${response.status}`);
    const data=await response.json();let gene=data.genes[0],experiment=gene.experiments[0],selected=null,maximum=0;
    panel.replaceChildren(element('div','ADULT MOUSE / RNA DEMO'),element('h2','Explore gene expression'));
    const geneLabel=element('label','Mouse gene'),geneSelect=element('select','');geneSelect.id='mouseGene';geneLabel.htmlFor=geneSelect.id;
    for(const g of data.genes){const o=element('option',g.gene+' · '+g.name);o.value=g.gene;geneSelect.append(o);}
    const expLabel=element('label','Allen experiment'),expSelect=element('select','');expSelect.id='mouseExperiment';expLabel.htmlFor=expSelect.id;
    const meta=element('p',''),toggleLabel=element('label',''),toggle=document.createElement('input');toggle.type='checkbox';toggle.id='mouseExpressionColors';toggleLabel.className='mouse-overlay-toggle';toggleLabel.append(toggle,document.createTextNode('Color 3D regions by RNA source summary'));
    const legend=element('div','');legend.className='mouse-expression-legend';legend.hidden=true;
    const status=element('p','');status.id='mouseExpressionStatus';status.setAttribute('aria-live','polite');
    const stats=element('dl','');stats.id='mouseExpressionStats';
    const links=element('p',''),source=element('a','View Allen experiment ↗'),download=element('a','Download 200 µm grids');source.target='_blank';source.rel='noreferrer';download.setAttribute('download','');links.append(source,document.createTextNode(' · '),download);
    const caution=element('p','P56 (about 8 weeks), adult mouse RNA in situ hybridization. These are source-region summaries from Allen’s earlier atlas boundaries, matched by exact Allen ID to the 2020 labels. No voxel registration, protein abundance, or childhood/autism inference is made.');caution.className='mouse-expression-caution';
    const details=element('details','');details.append(element('summary','What do these measurements mean?'),element('p','Energy = total stain intensity in expressing pixels ÷ all sampled pixels. Density = expressing pixels ÷ all sampled pixels. Intensity = stain intensity ÷ expressing pixels. These are image-analysis signals, not nTPM or a count of molecules. Experiments remain separate; probe signals should not be treated as calibrated comparisons between genes.'),element('p','The color scale uses square-root energy within this experiment across matched displayed regions. Each region has one uniform color; this does not locate expressing cells. Gray means no usable exact-ID source summary. Anatomical slice colors remain region labels. Parent and child summaries overlap and must not be added together.'));
    const methods=element('a','Allen ISH documentation ↗');methods.href='https://brain-map.org/support/documentation/in-situ-hybridization-ish-data';methods.target='_blank';methods.rel='noreferrer';details.append(methods);
    panel.append(geneLabel,geneSelect,expLabel,expSelect,meta,toggleLabel,legend,status,stats,links,caution,details);
    function render(){
      maximum=energyMaximum(experiment,regions);meta.textContent=`Experiment ${experiment.id} · ${experiment.age} · ${experiment.sex} · ${experiment.strain} · coronal · donor ${experiment.donor_id}. One experiment selected; no pooling.`;
      source.href=experiment.source_url;download.href='assets/mouse-expression/'+experiment.grid_file;
      legend.hidden=!toggle.checked;legend.replaceChildren(element('span','0'),element('i',''),element('span',number(maximum)+' energy'));legend.append(element('small','Square-root scale · gray = unavailable'));
      const row=measurement(experiment,selected?.identifier);stats.replaceChildren();
      status.textContent=!selected?'Select a region to read its source measurement.':row?`${gene.gene} · ${selected.name} · exact ID ${selected.identifier}`:`${gene.gene} · ${selected.name}: no usable exact-ID source summary. Unavailable does not mean no expression.`;
      if(row)for(const [name,value] of [['Expression energy',number(row.expression_energy)],['Expressing-pixel density',number(row.expression_density*100)+'%'],['Expressing-pixel intensity',number(row.expression_intensity)],['Sampled pixel sum',number(row.sum_pixels)]])stats.append(element('dt',name),element('dd',value));
    }
    function experiments(){expSelect.replaceChildren();for(const exp of gene.experiments){const option=element('option',`${exp.id} · ${exp.age} · ${exp.sex}`);option.value=exp.id;expSelect.append(option);}experiment=gene.experiments[0];}
    geneSelect.onchange=()=>{gene=data.genes.find(g=>g.gene===geneSelect.value);experiments();render();onChange();};
    expSelect.onchange=()=>{experiment=gene.experiments.find(e=>String(e.id)===expSelect.value);render();onChange();};toggle.onchange=()=>{render();onChange();};
    experiments();render();
    return {setActive(value){toggle.checked=value;render();},setRegion(region){selected=region;render();},colorForRegion(region){return toggle.checked?energyColor(measurement(experiment,region.identifier)?.expression_energy,maximum):null;},get active(){return toggle.checked;},get gene(){return gene.gene;}};
  }catch(error){panel.replaceChildren(element('h2','Expression data unavailable'),element('p',`The anatomy still works. Could not load the local Allen demo: ${error.message}`));return null;}
}
