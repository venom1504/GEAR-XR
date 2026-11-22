# Separate atlas selection and mouse template preview

Prototype-only change, November 22, 2026. Production root `dist/` is unchanged.

## Navigation

- `#atlases`: choose between Human Autism Gene Expression and Allen CCF Mouse Brain.
- `#human`: existing human atlas, measurements, region selection and molecular view.
- `#mouse`: separate mouse surface and anatomical slices.
- The atlas dropdown and All atlases button support switching without reloading the page. Browser Back restores the prior route. The human atlas keeps its selection and molecular state.

Human data remain human data. No human gene rankings, protein structures, expression numbers or region names are shown as mouse evidence.

## Uploaded template

Input: user-supplied `template_10.nii.gz`, originally located in Downloads. The full 327 MiB source remains there and is not copied into the public repository. Its SHA-256 and header are recorded in `dist/assets/mouse-ccf/template.json`.

- NIfTI-1, unsigned 16-bit image, 1320 × 800 × 1140 voxels.
- Header voxel spacing: approximately 0.01 mm (10 µm).
- Header source axes: posterior, inferior, right (PIR).
- Valid qform code 1, sform code 0. The qform affine is used, not the empty sform matrix.
- Official contextual resource: https://alleninstitute.github.io/CCF-MAP/descriptions/mouse_ccf.html
- Official linked template: https://allen-atlas-assets.s3.us-west-2.amazonaws.com/templates/allen-adult-mouse-stpt-template/2020/template_10.nii.gz

The uploaded file has not been independently compared byte for byte with the official asset. The source file hash makes the input reproducible.

## Derived preview

`scripts/prepare_mouse_template.py` reads the source and keeps every fifth voxel along each source axis, making a 50 µm display preview. The image is reoriented into RAS (right, anterior, superior) using the source qform. The resulting array is 228 × 264 × 160. Its affine is explicitly saved.

The browser's 8-bit slice image is a windowed version of the original template intensity, with zero at black and the 99.5th percentile of positive sampled values at white. This is a visualization contrast window, not a calibrated measure of gene expression. Coronal slices vary the anterior coordinate, horizontal slices the superior coordinate, and sagittal slices the right coordinate. Slice numbering is one-based in the UI. Coordinates are millimeters in the source NIfTI frame and are not independently verified stereotaxic measurements.

The surface is derived by an Otsu intensity threshold, binary closing/filling, retaining the largest connected component, Gaussian smoothing, and marching cubes. It is an **approximate anatomical preview**, not an official segmentation or a region mesh. It may omit fine structures or include threshold artifacts. It is labeled as derived in the UI. Geometry remains registered to the sampled source frame in metadata. One shared display transform centers it, converts RAS axes to Three.js axes (R,S,-A), and scales it for rendering.

## Missing data

The template is an intensity image. No annotation labels or mouse RNA/protein expression measurements were supplied or added. Region picking and mouse gene rankings are therefore not available. The previous deleted mouse downloads were not restored or reused.

## Browser behavior

The mouse surface and slice volume load on first selection of the mouse atlas. The volume uses browser gzip decompression. Separate renderers keep the human and mouse scenes independent; rendering pauses when an atlas is hidden. Slice plane selection preserves the last position used in each plane. Mouse surface controls offer orbit, zoom, auto rotate and reset. Immersive headset behavior is not implemented for the mouse preview.

## Rebuild the assets

In an environment with NumPy, nibabel, SciPy, scikit-image and Pillow:

```sh
python scripts/prepare_mouse_template.py /path/to/template_10.nii.gz
```

The browser needs only the generated files in `dist/assets/mouse-ccf/`, not the processing packages or original NIfTI volume.
