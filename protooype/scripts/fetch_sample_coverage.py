"""Audit per-entry HPA sample rows; never infer independent donors from demographics."""
from pathlib import Path
import concurrent.futures,datetime,hashlib,html,json,re,urllib.request
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
  gene,meta=item;url=f'https://www.proteinatlas.org/{meta["ensembl"]}-{gene}/brain/cerebral%2Bcortex';p=RAW/(gene+'.html')
  if p.exists():text=p.read_text()
  elif gene=='TBR1' and (ROOT/'research/hpa-tbr1-cerebral-cortex.html').exists():text=(ROOT/'research/hpa-tbr1-cerebral-cortex.html').read_text();p.write_text(text)
  else:text=urllib.request.urlopen(url,timeout=45).read().decode();p.write_text(text)
  return gene,{'sourceUrl':url,'sha256':hashlib.sha256(text.encode()).hexdigest(),'studies':parse_page(text)}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:genes=dict(pool.map(fetch,data['genes'].items()))
 # Match every exposed count to the exact gene, study, source name and saved value.
 inputs=json.loads((ROOT/'research/ranking-input.json').read_text())
 for gene,evidence in genes.items():
  for study,areas in evidence['studies'].items():
   for area,row in areas.items():
    expected=inputs['measurements'][study][gene].get(area)
    row['matchesSavedValue']=expected is not None and abs(expected-row['displayedMean'])<.051
 out={'version':1,'localPrototype':True,'retrieved':'2026-10-30','countDefinition':'Number of individual RNA-seq sample rows shown for this exact gene, study and source entry. Multiple samples do not establish that donors are independent; unique donor counts remain unknown unless there is only one sample. Counts are not summed across subdivisions or source areas.','genes':genes}
 (ROOT/'dist/assets/sample-coverage.json').write_text(json.dumps(out,indent=2)+'\n')
 print('Audited',len(genes),'genes; sample-entry counts:',{s:sum(len(g['studies'][s]) for g in genes.values()) for s in ['hpa','pfc']})
 print('TBR1 postcentral:',genes['TBR1']['studies']['hpa']['postcentral gyrus']['sampleCount'])
if __name__=='__main__':run()
