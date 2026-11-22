"""Prepare a conservative name-based AHBA display, never a spatial registration."""
from pathlib import Path
import json, hashlib, datetime, urllib.request
ROOT=Path(__file__).resolve().parents[1];RAW=ROOT/'research/human-allen';OUT=ROOT/'dist/assets/human-allen';OUT.mkdir(parents=True,exist_ok=True)
# Auditable source responses are retained. URL sidecars allow exact re-downloads.
files=['probes','expression-response','kmt5b-probes','kmt5b-expression']
urls={'probes':'probes-url.txt','expression-response':'expression-url.txt','kmt5b-probes':'kmt5b-probes-url.txt','kmt5b-expression':'kmt5b-expression-url.txt'}
manifest=[]
for name in files:
 path=RAW/(name+'.json');url=(RAW/urls[name]).read_text().strip()
 assert url.startswith('https://api.brain-map.org/')
 if not path.exists():path.write_bytes(urllib.request.urlopen(url,timeout=120).read())
 data=path.read_bytes();assert json.loads(data)['success'];manifest.append({'file':str(path.relative_to(ROOT)),'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
a=json.loads((RAW/'expression-response.json').read_text())['msg'];b=json.loads((RAW/'kmt5b-expression.json').read_text())['msg']
assert a['samples']==b['samples'],'Sample ordering changed; explicit well-ID join required.'
samples=a['samples'];probes=a['probes']+b['probes'];genes=sorted(x['gene'] for x in json.loads((ROOT/'dist/assets/proteins.json').read_text()))
assert len({s['sample']['well'] for s in samples})==len(samples)
for p in probes:
 if p['gene-symbol']=='SUV420H1':
  assert p['entrez-id']==51111;p['display_gene']='KMT5B'
 else:p['display_gene']=p['gene-symbol']
 assert p['display_gene'] in genes
 assert len(p['expression_level'])==len(samples)==len(p['z-score'])
 p['expression_level']=[float(x) if x not in ['','null','NaN'] else None for x in p['expression_level']]
 # z-scores retained from Allen unchanged; we display log2 levels by default.
 p['z-score']=[float(x) if x not in ['','null','NaN'] else None for x in p['z-score']]
assert sorted({p['display_gene'] for p in probes})==genes
# Same named anatomical area only. DKT and AHBA boundaries differ, so every
# nonempty match remains explicitly approximate. No lobe/parent fallback.
crosswalk={
 'precentral':['precentral gyrus'],'postcentral':['postcentral gyrus'],
 'supramarginal':['supramarginal gyrus'],'superiortemporal':['superior temporal gyrus'],
 'middletemporal':['middle temporal gyrus'],'inferiortemporal':['inferior temporal gyrus'],
 'fusiform':['fusiform gyrus'],'parsopercularis':['inferior frontal gyrus, opercular part'],
 'parstriangularis':['inferior frontal gyrus, triangular part'],'parsorbitalis':['inferior frontal gyrus, orbital part'],
 'lateralorbitofrontal':['lateral orbital gyrus'],'medialorbitofrontal':['medial orbital gyrus'],
 'superiorfrontal':['superior frontal gyrus'],'superiorparietal':['superior parietal lobule'],
 'precuneus':['precuneus'],'lingual':['lingual gyrus'],'cuneus':['cuneus'],
 'insula':['long insular gyri','short insular gyri'],'transversetemporal':["Heschl's gyrus"],
 'paracentral':['paracentral lobule, anterior part','paracentral lobule, posterior part']}
structures={s['structure']['id']:s['structure'] for s in samples};atlas=json.loads((ROOT/'dist/assets/brain.json').read_text());mapping={}
for part in atlas['regions']:
 prefixes=crosswalk.get(part['name'],[]);side=part['hemisphere'];ids=[]
 for sid,s in structures.items():
  if any(s['name']==prefix+', '+side or s['name'].startswith(prefix+', '+side+',') for prefix in prefixes):ids.append(sid)
 mapping[part['id']]={'parcel':part['name'],'hemisphere':side,'status':'approximate-name' if ids else 'unmapped','source_structure_ids':sorted(ids),'source_names':[structures[i]['name'] for i in sorted(ids)],'rationale':'Same-named source anatomy (including sampled subdivisions), selected hemisphere only. AHBA and DKT boundaries are not identical; no spatial registration.' if ids else 'No conservative same-named source-area match configured. No broad-region fallback.'}
colors={};lut=RAW/'FreeSurferColorLUT.txt'
for line in lut.read_text().splitlines():
 t=line.split()
 if len(t)>=6 and t[1].startswith('ctx-lh-'):
  colors[t[1][7:]]='#'+''.join(f'{int(v):02x}' for v in t[2:5])
for part in atlas['regions']:assert part['name'] in colors,part['name']
manifest.append({'file':str(lut.relative_to(ROOT)),'url':(RAW/'FreeSurferColorLUT-url.txt').read_text().strip(),'bytes':lut.stat().st_size,'sha256':hashlib.sha256(lut.read_bytes()).hexdigest()})
result={'schema':1,'prepared_date':datetime.date.today().isoformat(),'dataset':'Allen Human Brain Atlas, normalized microarray service','units':'log2 normalized microarray signal','source_url':'https://human.brain-map.org/static/download','documentation_url':'https://brain-map.org/support/documentation/human-brain-atlas-microarray-data','scope':'Adult reference donors. Not a pediatric or ASD-control dataset. Name-based summaries only; no registration to BigBrain.','genes':genes,'donors':list({s['donor']['id']:s['donor'] for s in samples}.values()),'samples':samples,'probes':probes,'mapping':mapping,'anatomical_colors':colors}
(OUT/'expression.json').write_text(json.dumps(result,separators=(',',':'),allow_nan=False)+'\n');(OUT/'mapping.json').write_text(json.dumps(mapping,indent=2)+'\n');(RAW/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(len(genes),'genes',len(probes),'probes',len(samples),'samples',len(result['donors']),'donors',sum(bool(m['source_structure_ids']) for m in mapping.values()),'of',len(mapping),'parcels matched')
