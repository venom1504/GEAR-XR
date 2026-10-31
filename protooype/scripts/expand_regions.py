"""Expand post/precentral coverage without pretending tissue samples are donors."""
from pathlib import Path
import csv,json,statistics
ROOT=Path(__file__).resolve().parents[1]

def build():
 legacy=ROOT/'research/legacy-expression.json'
 if not legacy.exists():legacy.write_bytes((ROOT/'dist/assets/expression.json').read_bytes())
 data=json.loads(legacy.read_text());raw=json.loads((ROOT/'research/expression-source/rna_brain_hpa-selected.json').read_text())
 lookup={(r['Gene name'],r['Subregion']):r for r in raw}
 for parcel in ['postcentral','precentral']:
  region=data['regions'][parcel];base=parcel+' gyrus';region['originalAreas']=list(region['areas'])
  region['areas']=[base]+[base+', '+part for part in ['dorsal','middle','ventral']]
  region['summaryMethod']='Equal-area arithmetic mean of four named source-entry means; not sample- or donor-weighted.'
  region['rationale']+=' Coverage includes the unsuffixed entry and three explicitly named subdivisions; no spatial registration to individual samples is implied.'
  for record in region['records']:
   values=[{'area':a,**{k:float(lookup[(record['gene'],a)][k]) for k in ['nTPM','TPM','pTPM']}} for a in region['areas']]
   record['originalValues']=record['values'];record['values']=values
   record.update(nTPM=max(v['nTPM'] for v in values),minimum=min(v['nTPM'] for v in values),detected=any(v['nTPM']>=1 for v in values),detectedAreas=sum(v['nTPM']>=1 for v in values))
 data['legacyAggregation']=data['aggregation']
 data['aggregation']='Source record nTPM retains the maximum of mapped values. Regional ranking uses an equal-area arithmetic mean of mapped source-entry means, not a sample- or donor-weighted estimate.'
 data['prototypeRevision']='expanded-sampling-and-ui-repairs'
 data['regionalSummary']='Postcentral and precentral include four source entries, weighted equally by area, not by samples or donors. Original unsuffixed values remain retained.'
 (ROOT/'dist/assets/expression.json').write_text(json.dumps(data,indent=2)+'\n')
 with (ROOT/'dist/assets/expression-evidence.csv').open('w',newline='') as f:
  fields=['parcel','match','study','gene','ensembl','source_area','nTPM','detected'];w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
  for name,region in data['regions'].items():
   for r in region['records']:
    for v in r['values']:w.writerow(dict(parcel=name,match=region['match'],study=region['dataset'],gene=r['gene'],ensembl=data['genes'][r['gene']]['ensembl'],source_area=v['area'],nTPM=v['nTPM'],detected=v['nTPM']>=1))
 print('Expanded post/precentral source entries; preserved original values.')
if __name__=='__main__':build()
