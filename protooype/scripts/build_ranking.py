"""Build descriptive regional enrichment without mixing HPA studies."""
from pathlib import Path
from html.parser import HTMLParser
import json, hashlib, datetime, shutil, statistics
ROOT=Path(__file__).resolve().parents[1]
class Table(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.row=None;self.cell=None;self.link=None
 def handle_starttag(self,t,a):
  if t=='tr':self.row=[]
  if t in ('td','th') and self.row is not None:self.cell=''
  if t=='a' and self.cell is not None:
   href=dict(a).get('href','')
   if '/gene/' in href:self.link=href
 def handle_data(self,d):
  if self.cell is not None:self.cell+=d
 def handle_endtag(self,t):
  if t in ('td','th') and self.cell is not None:self.row.append(' '.join(self.cell.split()));self.cell=None
  if t=='tr' and self.row is not None:self.rows.append((self.row,self.link));self.row=None;self.link=None

def build():
 evidence=json.loads((ROOT/'research/ranking-input.json').read_text())
 expression=json.loads((ROOT/'dist/assets/expression.json').read_text())
 out={'version':1,'scope':'20 genes in the current protein library; not a genome-wide ranking',
 'rule':'SFARI score 1 (High Confidence) or 2 (Strong Candidate); regional mean ≥1 nTPM; fold enrichment ≥1.25. Sort by fold enrichment, then regional mean, then gene symbol. At most 3 results; never fill with ineligible genes.',
 'formula':'Arithmetic mean across the mapped source areas divided by the arithmetic mean across all other unique areas in the SAME HPA study. Target areas are excluded from the denominator. Not an ASD/control ratio or a significance test.',
 'thresholdNote':'1.25× is a descriptive interface threshold chosen for this app, not a validated biological or statistical cutoff.',
 'sfari':evidence['sfari'],'genes':evidence['genes'],'regions':{}}
 for name,region in expression['regions'].items():
  results=[];study=region.get('dataset');targets=set(region.get('areas',[]))
  if study:
   for row in region['records']:
    gene=row['gene'];info=evidence['genes'].get(gene,{})
    if info.get('score') not in [1,2]:continue
    values=evidence['measurements'][study].get(gene,{})
    if not targets or not targets.issubset(values):continue
    other=[v for area,v in values.items() if area not in targets]
    if not other:continue
    target=statistics.mean(values[a] for a in targets);baseline=statistics.mean(other)
    # Zero baselines produce no finite defensible ratio, not an invented pseudocount.
    if baseline<=0:continue
    fold=target/baseline
    if target<1 or fold<1.25:continue
    results.append(dict(gene=gene,regionalMean=target,otherAreaMean=baseline,enrichment=fold,sourceAreaCount=len(targets),comparisonAreaCount=len(other),study=study,score=info['score']))
  results.sort(key=lambda r:(-r['enrichment'],-r['regionalMean'],r['gene']))
  out['regions'][name]={'eligibleCount':len(results),'top':results[:3]}
 (ROOT/'dist/assets/regional-ranking.json').write_text(json.dumps(out,indent=2)+'\n')
 print('Ranked',len(out['regions']),'regions;',sum(bool(r['top']) for r in out['regions'].values()),'with qualifying results')
if __name__=='__main__':build()
