"""Keep one representative C-alpha chain for verified monomeric assemblies."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
def build():
 manifest=json.loads((ROOT/'dist/assets/proteins.json').read_text());originals=ROOT/'research/protein-display-original';originals.mkdir(exist_ok=True)
 for gene,pdb in [('ASH1L','3OPE'),('DYRK1A','2VX3'),('PTEN','5BZZ')]:
  evidence=json.loads((ROOT/f'research/protein-assemblies/{pdb}-assembly-1.json').read_text())
  assert evidence['rcsb_assembly_info']['polymer_entity_instance_count_protein']==1
  assert evidence['rcsb_struct_symmetry'][0]['clusters'][0]['members'][0]['asym_id']=='A'
  p=ROOT/f'dist/assets/{gene}.json';backup=originals/p.name
  if not backup.exists():backup.write_bytes(p.read_bytes())
  data=json.loads(backup.read_text());originalCount=len(data['chains']);data['chains']=data['chains'][:1]
  data['displaySelection']={'pdb':pdb,'assembly':'1','chain':'A','originalChainCount':originalCount,'sourceUrl':f'https://www.rcsb.org/structure/{pdb}','note':'Representative supplied chain A C-alpha trace for the cited monomeric assembly; not an atomistic assembly reconstruction. Other crystal copies omitted from display only.','originalJSONSHA256':hashlib.sha256(backup.read_bytes()).hexdigest()}
  p.write_text(json.dumps(data,separators=(',',':'))+'\n')
  model=next(m for m in manifest if m['gene']==gene);model['suppliedResidues']=model['residues'] if 'suppliedResidues' not in model else model['suppliedResidues'];model['residues']=sum(len(c) for c in data['chains']);model['displaySelection']=data['displaySelection']
 (ROOT/'dist/assets/proteins.json').write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':build()
