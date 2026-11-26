"""Rebuild the Zhuang-ABCA-2 categorical cell layer from official, checksum-verified CSVs.
Usage: python prepare_mouse_cells.py --cache /tmp/gear-abc
Dependencies: numpy, pandas, nibabel. The cache is outside the repository.
"""
import argparse, collections, gzip, hashlib, json, pathlib, urllib.request
import numpy as np
import pandas as pd
import nibabel as nib
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'dist/assets/mouse-cells'
SPEC=[('cells','Zhuang-ABCA-2','metadata','cell_metadata'),('coords','Zhuang-ABCA-2-CCF','metadata','ccf_coordinates'),('taxonomy','WMB-taxonomy','metadata','cluster_to_cluster_annotation_membership_pivoted'),('colors','WMB-taxonomy','metadata','cluster_to_cluster_annotation_membership_color'),('parcellation','Allen-CCF-2020','metadata','parcellation_to_parcellation_term_membership'),('annotation','Allen-CCF-2020','image_volumes','annotation_25')]
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--cache',type=pathlib.Path,required=True);args=ap.parse_args();args.cache.mkdir(parents=True,exist_ok=True);DATA.mkdir(parents=True,exist_ok=True)
 manifest_path=ROOT/'research/abc-atlas/manifest-20250531.json';manifest=json.loads(manifest_path.read_text());sources={}
 for name,directory,kind,field in SPEC:
  info=next(iter(manifest['file_listing'][directory][kind][field]['files'].values()));p=args.cache/(name+('.nii.gz' if name=='annotation' else '.csv'))
  if not p.exists() or p.stat().st_size!=info['size']:urllib.request.urlretrieve(info['url'],p)
  raw=p.read_bytes();assert hashlib.md5(raw).hexdigest()==info['file_hash'],name
  sources[name]={**info,'sha256':hashlib.sha256(raw).hexdigest()}
 taxonomy=pd.read_csv(args.cache/'taxonomy.csv',keep_default_na=False).set_index('cluster_alias')
 colors=pd.read_csv(args.cache/'colors.csv',keep_default_na=False).set_index('cluster_alias')
 coords=pd.read_csv(args.cache/'coords.csv',dtype={'cell_label':str}).set_index('cell_label')
 use=['cell_label','brain_section_label','donor_label','donor_genotype','donor_sex','cluster_alias','subclass_confidence_score','cluster_confidence_score','high_quality_transfer']
 cells=pd.read_csv(args.cache/'cells.csv',usecols=use,dtype={'cell_label':str}).set_index('cell_label')
 assert coords.index.is_unique and cells.index.is_unique
 joined=cells.join(coords,how='inner');assert set(joined.cluster_alias)<=set(taxonomy.index)
 finite=np.isfinite(joined[['x','y','z']]).all(axis=1);assert finite.all()
 # Both source images have the same PIR axis order and RAS origin; only voxel spacing differs.
 image=nib.load(args.cache/'annotation.nii.gz');template=json.loads((ROOT/'dist/assets/mouse-ccf/template.json').read_text())
 assert nib.aff2axcodes(image.affine)==('P','I','R')
 assert np.allclose(image.affine[:3,3],np.array(template['source_affine_ras_mm'])[:3,3],atol=1e-5)
 assert np.allclose(image.affine[:3,:3]/.025,np.array(template['source_affine_ras_mm'])[:3,:3]/.01,atol=1e-5)
 ontology=json.loads((ROOT/'dist/assets/mouse-ccf/regions.json').read_text())['regions'];byvalue={r['value']:r for r in ontology}
 parcellation=pd.read_csv(args.cache/'parcellation.csv')
 for _,r in parcellation[parcellation.parcellation_term_set_name=='substructure'].iterrows():
  v=int(r.parcellation_index)
  if v in byvalue:assert byvalue[v]['identifier']=='MBA:'+r.parcellation_label.rsplit('-',1)[1],(v,r.parcellation_label)
 region_known=joined.parcellation_index.isin(byvalue)&(joined.parcellation_index>0)
 valid=joined[region_known].copy();xyz=valid[['x','y','z']].to_numpy();assert (xyz>=0).all();assert (xyz<np.array(image.shape)*.025).all()
 # Audit registration against the independent 25 um annotation. Boundary mismatches are reported, not re-assigned.
 audit=valid.iloc[::100];ijk=np.floor(audit[['x','y','z']].to_numpy()/.025+.5).astype(int);vol=np.asanyarray(image.dataobj)
 labels=vol[tuple(ijk.T)];match=float(np.mean(labels==audit.parcellation_index.to_numpy()))
 assert match>.85,('coordinate/label audit failed',match)
 clusters=[];aliases=sorted(map(int,valid.cluster_alias.unique()));alias_index={a:i for i,a in enumerate(aliases)}
 for alias in aliases:
  entry={'alias':alias}
  for level in ['neurotransmitter','class','subclass','supertype','cluster']:
   entry[level]=taxonomy.loc[alias,level];entry[level+'_color']=colors.loc[alias,level+'_color']
  clusters.append(entry)
 counts=[[int(v),alias_index[int(a)],int(n)] for (v,a),n in valid.groupby(['parcellation_index','cluster_alias']).size().items()]
 sections=sorted(valid.brain_section_label.unique());section_index={s:i for i,s in enumerate(sections)}
 # Fixed cell-ID hash sampling, independent of category, expression, and location.
 take=np.fromiter((int(hashlib.sha256(s.encode()).hexdigest()[:8],16)%8==0 for s in valid.index),dtype=bool,count=len(valid))
 sampled=valid[take];points=[]
 for cell_id,r in sampled.iterrows():
  points.append([cell_id,round(r.x,6),round(r.y,6),round(r.z,6),alias_index[int(r.cluster_alias)],int(r.parcellation_index),section_index[r.brain_section_label],round(r.subclass_confidence_score,4),round(r.cluster_confidence_score,4),bool(r.high_quality_transfer)])
 payload={'columns':['cell_id','x_ccf_mm','y_ccf_mm','z_ccf_mm','cluster_index','parcellation_index','section_index','subclass_confidence','cluster_confidence','high_quality_transfer'],'points':points}
 packed=json.dumps(payload,separators=(',',':')).encode();(DATA/'cells.json.gz').write_bytes(gzip.compress(packed,mtime=0))
 metadata={'dataset':'Zhuang-ABCA-2','species':'Mus musculus','life_stage':'adult','donor_sex':sorted(cells.donor_sex.unique()),'donor_genotype':sorted(cells.donor_genotype.unique()),'donors':sorted(cells.donor_label.unique()),'manifest_version':manifest['version'],'metadata_cells':len(cells),'ccf_coordinate_rows':len(coords),'joined_registered_cells':len(joined),'labeled_registered_cells':len(valid),'background_or_unmatched_cells':int((~region_known).sum()),'metadata_without_registered_coordinates':int(len(cells)-len(joined)),'rendered_cells':len(points),'sampling':'SHA-256(cell_id), first 32 bits modulo 8 == 0; deterministic approximately 1/8 sample. Counts use all labeled registered cells, not sampled points.','point_file':'cells.json.gz','point_sha256':hashlib.sha256((DATA/'cells.json.gz').read_bytes()).hexdigest(),'point_columns':payload['columns'],'display_precision':{'coordinates_mm':6,'confidence_scores':4},'clusters':clusters,'sections':sections,'region_cluster_counts':counts,'coordinate_frame':{'axes':['anterior_to_posterior','superior_to_inferior','left_to_right'],'units':'mm','ras_affine_from_ccf_mm':[[0,0,1,-5.695000171661377],[-1,0,0,5.349999904632568],[0,-1,0,5.21999979019165],[0,0,0,1]],'note':'Same PIR axes and RAS origin verified against the official ABC annotation_25 and the existing anatomical template. Source cell coordinates are retained; no mirroring or interpolation.'},'registration_audit':{'sample_size':len(audit),'nearest_25um_label_agreement':match,'note':'Independent nearest-voxel check on every 100th labeled registered cell. Mismatches are retained with the source parcellation assignment. This diagnostic is not a claim of exact boundary or cell-level anatomical accuracy.'},'sources':sources,'source_url':'https://alleninstitute.github.io/abc_atlas_access/descriptions/Zhuang-ABCA-2.html','tutorial_url':'https://alleninstitute.github.io/abc_atlas_access/notebooks/zhuang_merfish_tutorial.html','paper_url':'https://doi.org/10.1038/s41586-023-06808-9','license':'CC BY 4.0','limitations':['One adult wild-type male mouse; not human, developmental, or autism-specific data.','Cell-type labels are transferred from a transcriptomic taxonomy, not directly observed cell functions.','Only cells in supplied metadata with CCF coordinates and a known non-background region are included. Coverage can be unilateral and uneven.','Points are a deterministic display sample of cell centers, not cell shapes or an exhaustive cell census.','Regional counts describe the supplied registered dataset; they are not stereological population estimates or physical density.','Colors are categories, not gene expression. Existing ISH expression comes from separate specimens and experiments.']}
 (DATA/'metadata.json').write_text(json.dumps(metadata,separators=(',',':'))+'\n')
 # Keep a few original joined records for independent source/coordinate tests.
 (ROOT/'research/abc-atlas/verification-cells.json').write_text(json.dumps([{'cell_id':p[0],'source':valid.loc[p[0]].to_dict(),'display_record':p} for p in points[::max(1,len(points)//24)]],indent=2,default=lambda x:x.item() if hasattr(x,'item') else x))
 print(json.dumps({k:metadata[k] for k in ['metadata_cells','joined_registered_cells','labeled_registered_cells','rendered_cells','registration_audit']},indent=2))
if __name__=='__main__':main()
