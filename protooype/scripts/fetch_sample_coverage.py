"""Audit per-entry HPA sample rows; never infer independent donors from demographics."""
from pathlib import Path
import concurrent.futures,datetime,hashlib,html,json,re,urllib.request,unicodedata
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/sample-coverage-source';RAW.mkdir(exist_ok=True)

def parse_page(text):
 out={'hpa':{},'pfc':{}}
 for prefix,study in [('hpa_brain_rnaseq','hpa'),('hpa_pfc_brain_rnaseq','pfc')]:
  for m in re.finditer(r'<div id="'+prefix+r'([^"\s]+)"[^>]*></div>',text):
   chunk=text[m.end():].split('</table>',1)[0]
   label=re.match(r'\s*([^<]+)<br>\s*<b>nTPM:\s*([\d.]+)</b>',chunk)
   if not label:continue
   area=html.unescape(label[1].strip()).lower();summary=float(label[2])
   samples=[]
   for row in re.findall(r'<tr class="data(?:\s*)">(.*?)</tr>',chunk,re.S):
    cells=[html.unescape(re.sub('<[^>]*>','',x)).strip() for x in re.findall('<td[^>]*>(.*?)</td>',row,re.S)]
    if len(cells)!=3:raise ValueError('Unexpected sample row: '+str(cells))
    samples.append({'id':cells[0],'description':cells[1],'nTPM':float(cells[2])})
   if samples:
    out[study][area]={'sampleCount':len(samples),'independentDonorCount':1 if len(samples)==1 else None,'displayedMean':summary,'samples':samples,'anchor':prefix+m[1]}
 return out

def run():
 data=json.loads((ROOT/'dist/assets/expression.json').read_text())
 def fetch(item):
  gene,meta=item;studies={'hpa':{},'pfc':{}};pages=[]
  for major,suffix in [('cerebral%2Bcortex',''),('hippocampal%2Bformation','.hippocampal'),*[(name.replace(' ','%2B'),'.'+name.replace(' ','-')) for name in ['amygdala','basal ganglia','cerebellum','choroid plexus','hypothalamus','medulla oblongata','midbrain','pons','spinal cord','thalamus','white matter']]]:
   url=f'https://www.proteinatlas.org/{meta["ensembl"]}-{gene}/brain/{major}';p=RAW/(gene+suffix+'.html')
   if not p.exists():p.write_text(urllib.request.urlopen(url,timeout=45).read().decode())
   text=p.read_text();digest=hashlib.sha256(p.read_bytes()).hexdigest();pages.append({'url':url,'sha256':digest,'file':p.name})
   for study,areas in parse_page(text).items():
    for area,row in areas.items():
     row['sourceUrl']=url+'#'+row['anchor'];row['sourceSHA256']=digest
     row['sampleRange']=[min(x['nTPM'] for x in row['samples']),max(x['nTPM'] for x in row['samples'])]
     if area in studies[study]:assert studies[study][area]['samples']==row['samples']
     studies[study][area]=row
  print('Audited all brain pages for '+gene,flush=True)
  return gene,{'sourceUrl':pages[0]['url'],'sha256':pages[0]['sha256'],'sourcePages':pages,'studies':studies}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:genes=dict(pool.map(fetch,data['genes'].items()))
 # Match every exposed count to the exact gene, study, source name and saved value.
 inputs=json.loads((ROOT/'research/ranking-input.json').read_text())
 def norm(name):return re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',name).encode('ascii','ignore').decode().lower())
 for gene,evidence in genes.items():
  for study,areas in list(evidence['studies'].items()):
   expected=inputs['measurements'][study][gene];names={norm(a):a.lower() for a in expected};values={a.lower():v for a,v in expected.items()};canonical={}
   for area,row in areas.items():
    key=names.get(norm(area),area);row['sourceLabel']=area
    row['matchesSavedValue']=key in values and abs(values[key]-row['displayedMean'])<.051
    if key in canonical:assert canonical[key]['samples']==row['samples']
    canonical[key]=row
   evidence['studies'][study]=canonical
 out={'version':3,'localPrototype':True,'retrieved':'2026-10-31','countDefinition':'Number of individual RNA-seq sample rows shown for this exact gene, study and source entry. Multiple samples do not establish that donors are independent; unique donor counts remain unknown unless there is only one sample. Per-entry counts remain separate. The UI may total distinct sample IDs across mapped entries within a study; this is a tissue-sample total, never an independent-donor total.','genes':genes}
 (ROOT/'dist/assets/sample-coverage.json').write_text(json.dumps(out,indent=2)+'\n')
 print('Audited',len(genes),'genes; sample-entry counts:',{s:sum(len(g['studies'][s]) for g in genes.values()) for s in ['hpa','pfc']})
 print('TBR1 postcentral:',genes['TBR1']['studies']['hpa']['postcentral gyrus']['sampleCount'])
if __name__=='__main__':run()
