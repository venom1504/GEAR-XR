"""Acquire matched Allen CCF2020 labels and derive 50-um region geometry.

Annotation values are compact indices, not MBA structure IDs. Names are joined
only through the terminology CSV linked by Allen's CCF-MAP documentation.
"""
import ast,csv,gzip,hashlib,json,urllib.request
from pathlib import Path
import nibabel as nib
import numpy as np
from scipy import ndimage
from skimage import measure

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/assets/mouse-ccf'
RAW=ROOT/'research/mouse-ccf-2020'
RAW.mkdir(parents=True,exist_ok=True)
ANNOTATION_URL='https://allen-atlas-assets.s3.us-west-2.amazonaws.com/annotation-sets/allen-adult-mouse-stereotaxic-annotation/2020/annotations_compressed_10.nii.gz'
TERMS_URL='https://alleninstitute.github.io/CCF-MAP/_downloads/217b9700f0796a5febba105e568ad04c/CCFv3_2020_terminology.csv'

def acquire(url,name):
    p=RAW/name
    if not p.exists():
        with urllib.request.urlopen(url,timeout=120) as src,p.with_suffix(p.suffix+'.partial').open('wb') as dest:
            while chunk:=src.read(1024*1024):dest.write(chunk)
        p.with_suffix(p.suffix+'.partial').replace(p)
    return p

source=acquire(ANNOTATION_URL,'annotations_compressed_10.nii.gz')
terms=acquire(TERMS_URL,'CCFv3_2020_terminology.csv')
meta=json.loads((OUT/'template.json').read_text())
image=nib.load(source)
assert image.shape==tuple(meta['source_dimensions'])
assert np.allclose(image.affine,meta['source_affine_ras_mm'],atol=1e-6)
assert image.get_data_dtype()==np.dtype('uint16')
stride=5
small=np.empty(tuple((d+stride-1)//stride for d in image.shape),dtype=np.uint16)
with gzip.open(source,'rb') as stream:
    stream.read(int(image.dataobj.offset))
    plane_bytes=image.shape[0]*image.shape[1]*2
    for k in range(image.shape[2]):
        raw=stream.read(plane_bytes)
        assert len(raw)==plane_bytes
        if k%stride==0:small[:,:,k//stride]=np.frombuffer(raw,dtype='<u2').reshape(image.shape[:2],order='F')[::stride,::stride]
        if k%300==0:print('ANNOTATION plane',k,flush=True)
orientation=nib.orientations.ornt_transform(nib.orientations.io_orientation(image.affine),nib.orientations.axcodes2ornt(('R','A','S')))
labels=np.ascontiguousarray(nib.orientations.apply_orientation(small,orientation),dtype='<u2')
affine=image.affine@np.diag([stride,stride,stride,1])@nib.orientations.inv_ornt_aff(orientation,small.shape)
assert labels.shape==tuple(meta['preview_dimensions'])
assert np.allclose(affine,meta['preview_affine_ras_mm'],atol=1e-6)
with gzip.open(OUT/'annotation-u16.bin.gz','wb',compresslevel=9) as f:f.write(labels.tobytes(order='C'))
counts=np.bincount(labels.ravel())
regions=[]
for row in csv.DictReader(terms.open()):
    value=int(row['annotation_value'])
    descendants=list(map(int,ast.literal_eval(row['descendant_annotation_values'])))
    regions.append({'identifier':row['identifier'],'parent':row['parent_identifier'] or None,
      'value':value,'name':row['name'],'abbreviation':row['abbreviation'],
      'color':row['color_hex_triplet'],'path':ast.literal_eval(row['root_identifier_path']),
      'descendant_values':descendants,
      'voxel_count':int(counts[value]) if value<len(counts) else 0,
      'descendant_voxel_count':sum(int(counts[v]) for v in descendants if 0<v<len(counts))})
byvalue={r['value']:r for r in regions}
assert len(byvalue)==len(regions),'Duplicate compact annotation index'
present=set(map(int,np.unique(labels)))-{0}
assert present<=set(byvalue),present-set(byvalue)
objects=ndimage.find_objects(labels)
positions=[];indices=[];parts=[];vertex_start=0;index_start=0
center=np.array(meta['display_ras_center_mm'])
for value in sorted(present):
    region=byvalue[value]
    box=objects[value-1]
    cropped=labels[box]==value
    start=np.array([b.start for b in box])
    coordinates=np.argwhere(cropped)
    representative=coordinates[np.argmin(np.sum((coordinates-coordinates.mean(axis=0))**2,axis=1))]+start
    region['representative_voxel']=representative.tolist()
    region['bounds_voxel']=[[int(b.start) for b in box],[int(b.stop-1) for b in box]]
    padded=np.pad(cropped.astype(np.float32),1)
    step=2 if min(padded.shape)>4 and padded[::2,::2,::2].any() else 1
    verts,faces,_,_=measure.marching_cubes(padded,level=.5,step_size=step,allow_degenerate=False)
    verts+=start-1
    ras=nib.affines.apply_affine(affine,verts)
    world=(ras-center)[:,[0,2,1]]*np.array([.2,.2,-.2])
    positions.append(np.ascontiguousarray(world,dtype='<f4'))
    indices.append(np.ascontiguousarray(faces+vertex_start,dtype='<u4'))
    parts.append({'value':value,'vertex_start':vertex_start,'vertex_count':len(verts),
                  'index_start':index_start,'index_count':int(faces.size),'mesh_step_voxels':step})
    vertex_start+=len(verts);index_start+=faces.size
    if len(parts)%100==0:print('REGION meshes',len(parts),'vertices',vertex_start,flush=True)
for region in regions:
    if 'representative_voxel' not in region and region['descendant_voxel_count']:
        child=next(byvalue[v] for v in region['descendant_values'] if v in present)
        region['representative_voxel']=child['representative_voxel']
position_array=np.concatenate(positions)
index_array=np.concatenate(indices)
assert index_array.max()<len(position_array)
assert np.isfinite(position_array).all()
binary=position_array.tobytes()+index_array.tobytes()
with gzip.open(OUT/'region-surfaces.bin.gz','wb',compresslevel=9) as f:f.write(binary)
(OUT/'regions.json').write_text(json.dumps({'regions':regions,'parts':parts},separators=(',',':'))+'\n')
annotation={
 'version':'Allen CCFv3 2020','source_url':ANNOTATION_URL,'terminology_url':TERMS_URL,
 'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
 'terminology_sha256':hashlib.sha256(terms.read_bytes()).hexdigest(),
 'source_dimensions':list(image.shape),'source_affine_ras_mm':image.affine.tolist(),
 'preview_dimensions':list(labels.shape),'preview_affine_ras_mm':affine.tolist(),
 'preview_spacing_um':50,'sampling':'Exact nearest samples every fifth original voxel; no label interpolation',
 'template_affine_max_error_mm':float(np.max(np.abs(image.affine-np.array(meta['source_affine_ras_mm'])))),
 'volume_file':'annotation-u16.bin.gz','dtype':'uint16 little-endian','order':'C',
 'regions_file':'regions.json','surface_file':'region-surfaces.bin.gz',
 'surface_position_offset':0,'surface_index_offset':position_array.nbytes,
 'surface_vertex_count':len(position_array),'surface_index_count':int(index_array.size),
 'present_annotation_values':len(present),'terminology_entries':len(regions),
 'regions_with_sampled_descendants':sum(r['descendant_voxel_count']>0 for r in regions),
 'value_semantics':'Compact annotation values are mapped using annotation_value in the official terminology; MBA identifiers are separate.',
 'geometry_method':'Per-label marching cubes of nearest-sampled 50-um annotation, step 2 (100 um) for larger regions, step 1 for small regions; no smoothing or nearest-name inference.',
 'resolution_limit':'Fine structures not sampled at 50 um may be omitted. Surfaces are coarser display approximations; picking returns the source label from which each surface was derived, not an independently validated 10-um boundary.',
 'expression_loaded':False}
(OUT/'annotation.json').write_text(json.dumps(annotation,indent=2)+'\n')
meta['regions_loaded']=True;meta['annotation_file']='annotation.json'
(OUT/'template.json').write_text(json.dumps(meta,indent=2)+'\n')
print(json.dumps({k:annotation[k] for k in ['present_annotation_values','terminology_entries','surface_vertex_count','surface_index_count','template_affine_max_error_mm']},indent=2),flush=True)
