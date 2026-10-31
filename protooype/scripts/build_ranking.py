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

def pool_samples(areas):
 """One vote per tissue sample ID; conflicting duplicate measurements fail closed."""
 result={}
 for row in areas:
  for sample in row['samples']:
   key=str(sample['id']);value=float(sample['nTPM'])
   if not key or not __import__('math').isfinite(value) or value<0:raise ValueError('Invalid sample measurement')
   if key in result and result[key]!=value:raise ValueError('Conflicting nTPM for repeated tissue sample '+key)
   result[key]=value
 return result

def rank_gene(gene,study,targets,evidence,coverage):
 values=evidence['measurements'][study][gene]
 measured=coverage['genes'][gene]['studies'][study]
 valid={a:measured[a.lower()] for a in values if a.lower() in measured and measured[a.lower()]['matchesSavedValue']}
 if not targets or not targets.issubset(valid):return None
 target=pool_samples(valid[a] for a in sorted(targets))
 if not target:return None
 otherAreas=[a for a in values if a not in targets]
 baselineAreas=[a for a in otherAreas if a in valid]
 baseline=pool_samples(valid[a] for a in baselineAreas)
 # Exclude target IDs everywhere, even if a source table lists them twice.
 for key in target:baseline.pop(key,None)
 if not baseline:return None
 numerator=statistics.mean(target.values());denominator=statistics.mean(baseline.values())
 if denominator<=0:return None
 # Target source entries must have disjoint tissue IDs so their displayed shares add to 100%.
 if sum(valid[a]['sampleCount'] for a in targets)!=len(target):raise ValueError('Overlapping target source entries need an explicit crosswalk')
 oldTarget=statistics.mean(values[a] for a in targets);oldBase=statistics.mean(values[a] for a in otherAreas)
 return dict(gene=gene,regionalMean=numerator,otherAreaMean=denominator,enrichment=numerator/denominator,
  sourceAreaCount=len(targets),comparisonAreaCount=len(baselineAreas),study=study,score=evidence['genes'][gene]['score'],
  targetSampleCount=len(target),comparisonSampleCount=len(baseline),totalComparisonAreaCount=len(otherAreas),
  excludedBaselineAreas=[a for a in otherAreas if a not in valid],
  areaWeights=[dict(area=a,sampleCount=valid[a]['sampleCount'],weight=valid[a]['sampleCount']/len(target)) for a in values if a in targets],
  legacyEqualAreaRegionalMean=oldTarget,legacyEqualAreaOtherMean=oldBase,legacyEqualAreaEnrichment=oldTarget/oldBase if oldBase>0 else None,
  targetRange=[min(target.values()),max(target.values())],baselineRange=[min(baseline.values()),max(baseline.values())])

def build():
 evidence=json.loads((ROOT/'research/ranking-input.json').read_text())
 expression=json.loads((ROOT/'dist/assets/expression.json').read_text())
 coverage=json.loads((ROOT/'dist/assets/sample-coverage.json').read_text())
 out={'version':2,'method':'tissue-sample-weighted','scope':'20 genes in the current protein library; not a genome-wide ranking',
 'rule':'SFARI score 1 (High Confidence) or 2 (Strong Candidate); tissue-sample mean ≥1 nTPM; fold enrichment ≥1.25. Sort by enrichment, then regional mean, then gene symbol. At most 3 results.',
 'formula':'Mean of individual tissue-sample nTPM across mapped target source entries divided by the mean of individual tissue-sample nTPM across all other same-study source entries with verified sample rows. Deduplicate IDs separately within each study; exclude target IDs from the baseline. Missing sample tables are explicitly excluded, never filled using equal-area means.',
 'limitations':'Each tissue sample has equal weight, not each independent donor. Repeated donors, cell composition, age and uncertainty are not adjusted. Source sample nTPM may be rounded. Observed ranges are not confidence intervals.',
 'thresholdNote':'1.25× is a descriptive interface threshold, not a significance test or an ASD/control comparison.',
 'sfari':evidence['sfari'],'genes':evidence['genes'],'regions':{}}
 for name,region in expression['regions'].items():
  results=[];audit=[];study=region.get('dataset');targets=set(region.get('areas',[]))
  if study:
   for gene,info in evidence['genes'].items():
    if info.get('score') not in [1,2]:continue
    row=rank_gene(gene,study,targets,evidence,coverage)
    if row is None:continue
    audit.append(row)
    if row['regionalMean']>=1 and row['enrichment']>=1.25:results.append(row)
  results.sort(key=lambda r:(-r['enrichment'],-r['regionalMean'],r['gene']))
  out['regions'][name]={'eligibleCount':len(results),'top':results[:3],'evaluated':audit}
 (ROOT/'dist/assets/regional-ranking.json').write_text(json.dumps(out,indent=2)+'\n')
 print('Built sample-weighted rankings for',len(out['regions']),'regions')
if __name__=='__main__':build()
