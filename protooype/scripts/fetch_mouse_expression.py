"""Download a small, auditable adult mouse ISH demo; no coordinate resampling."""
from pathlib import Path
import urllib.request,urllib.parse,json,hashlib,zipfile,io
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'research/mouse-expression';OUT=ROOT/'dist/assets/mouse-expression'
RAW.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
manifest=[]
def get(url,path):
 if not path.exists():
  data=urllib.request.urlopen(url,timeout=90).read();path.write_bytes(data)
 data=path.read_bytes();manifest.append({'path':str(path.relative_to(ROOT)),'url':url,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
 return data
def query(criteria,path):
 u='https://api.brain-map.org/api/v2/data/query.json?'+urllib.parse.urlencode({'criteria':criteria})
 j=json.loads(get(u,path));assert j['success'],j
 assert j['num_rows']==j['total_rows']
 return j['msg']
result={'measurement':'RNA in situ hybridization (ISH)','atlas_scope':'Allen source-region summaries, with pre-2020 measurement boundaries. IDs are matched to 2020 terminology; no spatial registration is asserted.','genes':[]}
for gene in ['Ctf1','Tbr1','Slc17a7','Gad1','Pvalb','Sst']:
 q=f"model::SectionDataSet,rma::criteria,[failed$eqfalse],products[id$eq1],genes[acronym$eq'{gene}'],plane_of_section[name$eq'coronal'],rma::include,genes,plane_of_section,specimen(donor(age)),rma::options[num_rows$eqall]"
 found=query(q,RAW/f'{gene}-experiments.json');experiments=[]
 for exp in sorted(found,key=lambda x:x['id']):
  donor=exp['specimen']['donor']
  if donor['age']['name']!='P56':continue
  eid=exp['id'];q=f'model::StructureUnionize,rma::criteria,[section_data_set_id$eq{eid}],structure[graph_id$eq1],rma::options[num_rows$eqall]'
  rows=query(q,RAW/f'{gene}-{eid}-regional-statistics.json');stats={}
  for row in rows:
   assert row['section_data_set_id']==eid
   key='MBA:'+str(row['structure_id']);assert key not in stats
   stats[key]={k:row[k] for k in ['expression_energy','expression_density','sum_pixels','sum_expressing_pixels','sum_expressing_pixel_intensity']}
   stats[key]['expression_intensity']=row['sum_expressing_pixel_intensity']/row['sum_expressing_pixels'] if row['sum_expressing_pixels']>0 else None
  u=f'https://api.brain-map.org/grid_data/download/{eid}?include=energy,density,intensity'
  filename=f'{gene}-{eid}-expression-grid.zip';data=get(u,OUT/filename)
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   assert z.testzip() is None
   for metric in ['energy','density','intensity']:
    header=dict(line.split(' = ',1) for line in z.read(metric+'.mhd').decode().splitlines() if ' = ' in line)
    count=1
    for n in header['DimSize'].split():count*=int(n)
    assert len(z.read(metric+'.raw'))==count*4
  experiments.append({'id':eid,'age':donor['age']['name'],'sex':donor['sex'],'strain':donor['strain'],'donor_id':donor['id'],'plane':'coronal','source_url':f'https://mouse.brain-map.org/experiment/show/{eid}','grid_file':filename,'source_expression_flag':exp.get('expression'),'stats':stats})
  print(gene,eid,len(stats),'source regions',flush=True)
 assert experiments,gene
 result['genes'].append({'gene':gene,'name':found[0]['genes'][0]['name'],'experiments':experiments})
(OUT/'expression.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
(RAW/'download-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('COMPLETE',sum(len(g['experiments']) for g in result['genes']),'experiments',flush=True)
