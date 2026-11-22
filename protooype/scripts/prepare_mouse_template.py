"""Build lightweight anatomy previews from the user-supplied NIfTI template.

Requires numpy, nibabel, scipy, scikit-image and Pillow. The original stays outside
the repository. No region segmentation or expression measurements are inferred.
"""
import argparse, gzip, hashlib, json
from pathlib import Path
import nibabel as nib
import numpy as np
from scipy import ndimage
from skimage import measure, filters
from PIL import Image

parser=argparse.ArgumentParser()
parser.add_argument('source',type=Path)
args=parser.parse_args()
output=Path(__file__).resolve().parents[1]/'dist/assets/mouse-ccf'
output.mkdir(parents=True,exist_ok=True)
image=nib.load(args.source)
assert image.shape==(1320,800,1140),image.shape
assert image.get_data_dtype()==np.dtype('uint16')
stride=5
small=np.empty(tuple((d+stride-1)//stride for d in image.shape),dtype=np.uint16)
with gzip.open(args.source,'rb') as stream:
    stream.read(int(image.dataobj.offset))
    plane_bytes=image.shape[0]*image.shape[1]*2
    for k in range(image.shape[2]):
        raw=stream.read(plane_bytes)
        assert len(raw)==plane_bytes
        if k%stride==0:
            plane=np.frombuffer(raw,dtype='<u2').reshape(image.shape[:2],order='F')
            small[:,:,k//stride]=plane[::stride,::stride]
        if k%200==0:print('Read source plane',k,flush=True)
orientation=nib.orientations.io_orientation(image.affine)
transform=nib.orientations.ornt_transform(orientation,nib.orientations.axcodes2ornt(('R','A','S')))
canonical=np.ascontiguousarray(nib.orientations.apply_orientation(small,transform))
sample_affine=image.affine@np.diag([stride,stride,stride,1])
canonical_affine=sample_affine@nib.orientations.inv_ornt_aff(transform,small.shape)
assert nib.aff2axcodes(canonical_affine)==('R','A','S')
positive=canonical[canonical>0]
window_high=float(np.percentile(positive,99.5))
display=np.clip(canonical.astype(np.float32)/window_high*255,0,255).astype(np.uint8)
with gzip.open(output/'template-preview-u8.bin.gz','wb',compresslevel=9) as f:f.write(display.tobytes(order='C'))
threshold=float(filters.threshold_otsu(canonical))
mask=canonical>threshold
mask=ndimage.binary_closing(mask,iterations=2)
mask=ndimage.binary_fill_holes(mask)
labels,count=ndimage.label(mask)
sizes=np.bincount(labels.ravel());sizes[0]=0
mask=labels==sizes.argmax()
smooth=ndimage.gaussian_filter(mask.astype(np.float32),sigma=.8)
vertices,faces,_,_=measure.marching_cubes(smooth,level=.5,step_size=2,allow_degenerate=False)
ras=nib.affines.apply_affine(canonical_affine,vertices)
center=(ras.min(axis=0)+ras.max(axis=0))/2
# A single display transform: RAS millimeters -> (R,S,-A), centered and scaled.
world=(ras-center)[:,[0,2,1]]*np.array([.2,.2,-.2])
positions=np.ascontiguousarray(world,dtype='<f4')
indices=np.ascontiguousarray(faces,dtype='<u4')
binary=positions.tobytes()+indices.tobytes()
(output/'template-surface.bin').write_bytes(binary)
metadata={
 'title':'Allen CCF Mouse Brain','source_filename':args.source.name,
 'source_sha256':hashlib.sha256(args.source.read_bytes()).hexdigest(),
 'source_dimensions':list(image.shape),'source_spacing_mm':[float(x) for x in image.header.get_zooms()],
 'source_axis_codes':list(nib.aff2axcodes(image.affine)),
 'source_affine_ras_mm':image.affine.tolist(),
 'source_qform_code':int(image.header['qform_code']),'source_sform_code':int(image.header['sform_code']),
 'preview_dimensions':list(display.shape),'preview_axis_codes':['R','A','S'],
 'preview_affine_ras_mm':canonical_affine.tolist(),'preview_spacing_um':50,
 'volume_file':'template-preview-u8.bin.gz','volume_order':'C: (x * ny + y) * nz + z',
 'display_window_raw':[0,window_high],'display_units':'Windowed anatomical template intensity; not expression',
 'surface_file':'template-surface.bin','vertex_count':len(positions),'index_count':int(indices.size),
 'position_offset':0,'index_offset':positions.nbytes,'surface_threshold_raw':threshold,
 'surface_method':'Otsu intensity threshold; closing and filling; largest connected component; Gaussian sigma 0.8; marching cubes step 2',
 'surface_qualification':'Approximate surface derived from template intensity, not an official region segmentation. Fine structures may be omitted.',
 'display_ras_center_mm':center.tolist(),'display_scale_world_units_per_mm':.2,
 'regions_loaded':False,'expression_loaded':False,
 'official_information_url':'https://alleninstitute.github.io/CCF-MAP/descriptions/mouse_ccf.html',
 'official_template_url':'https://allen-atlas-assets.s3.us-west-2.amazonaws.com/templates/allen-adult-mouse-stpt-template/2020/template_10.nii.gz',
 'provenance_note':'Derived from the user-supplied file. The source hash identifies that file; it was not independently compared byte for byte with the linked official asset.'}
(output/'template.json').write_text(json.dumps(metadata,indent=2)+'\n')
# Genuine source slices for the two atlas-choice cards and documentation.
for name,axis in [('coronal',1),('horizontal',2),('sagittal',0)]:
    section=np.take(display,display.shape[axis]//2,axis=axis)
    section=np.flip(section.T,axis=0)
    Image.fromarray(section).resize((section.shape[1]*3,section.shape[0]*3)).save(output/f'{name}-preview.png')
print(json.dumps({'dimensions':display.shape,'source_axes':metadata['source_axis_codes'],
 'surface_vertices':len(vertices),'surface_triangles':len(faces),'threshold':threshold,
 'preview_mb':(output/'template-preview-u8.bin.gz').stat().st_size/1e6},indent=2),flush=True)
