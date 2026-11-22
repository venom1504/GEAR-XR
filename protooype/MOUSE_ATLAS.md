# Allen CCFv3 2020 region explorer — prototype only

Updated November 22, 2026. Production root `dist/` is unchanged.

## What is available

Choose Human Autism Gene Expression or Allen CCF Mouse Brain from the atlas home screen or header. Human data and behavior remain separate.

In the mouse atlas:

- Click a colored 3D surface to identify the region from which that surface was extracted.
- Click any annotated slice to read its voxel label and official name.
- Search names, abbreviations or `MBA:` identifiers.
- Select a broader region such as Thalamus and isolate its annotated descendants.
- Switch coronal, horizontal and sagittal planes; toggle colored overlays.
- Read the region name, abbreviation, stable Allen identifier and hierarchy in the region explorer.

There are 683 nonzero label values in the 50 µm preview. The terminology has 1,328 entries. Including hierarchy parents, 854 entries have sampled voxels or sampled descendants and can be selected. Parents overlap their descendants; these counts are not independent, nonoverlapping anatomical regions. No mouse gene-expression or protein measurements have been added.

## Official annotation sources

Both files below are linked from Allen's CCF-MAP documentation:

- Atlas description: https://alleninstitute.github.io/CCF-MAP/descriptions/mouse_ccf.html
- 2020 annotation: https://allen-atlas-assets.s3.us-west-2.amazonaws.com/annotation-sets/allen-adult-mouse-stereotaxic-annotation/2020/annotations_compressed_10.nii.gz
- Terminology documentation: https://alleninstitute.github.io/CCF-MAP/docs/CCFv3_2020_terminology.html
- Terminology CSV: https://alleninstitute.github.io/CCF-MAP/_downloads/217b9700f0796a5febba105e568ad04c/CCFv3_2020_terminology.csv
- Citation: Wang et al. (2020), The Allen Mouse Brain Common Coordinate Framework: A 3D Reference Atlas, Cell. https://doi.org/10.1016/j.cell.2020.04.007

The original downloaded annotation and terminology table are saved under `research/mouse-ccf-2020/`. Their SHA-256 hashes and exact source URLs are in `dist/assets/mouse-ccf/annotation.json`. The retired 2017 mouse package was not used.

## Match to the uploaded anatomical template

The supplied `template_10.nii.gz` has dimensions 1320 × 800 × 1140, uint16 intensities and 10 µm spacing. Its qform maps source PIR axes into RAS millimeters. The source template remains in the user's Downloads folder; it has not been uploaded to the repository. Its hash and affine are in `template.json`.

The official 2020 annotation has the same dimensions and exactly the same NIfTI affine as that template (maximum matrix difference 0). The template uses its valid qform; the annotation has a matching sform. The same every-fifth-voxel nearest sampling and RAS reorientation are applied to both, producing arrays of 228 × 264 × 160 at 50 µm. The derived preview affines are also exactly equal. The browser rejects mismatching preview dimensions or affines.

This verifies agreement of the supplied files' coordinate grids, not a new independent histological validation. The uploaded template has not been compared byte for byte with the linked official template download.

## Labels are not Allen structure IDs

Values in `annotations_compressed_10.nii.gz` are compact annotation indices. They must be joined to `annotation_value` in the official terminology CSV. They are not the numbers following `MBA:`. For example, Thalamus is MBA:549 but compact value 539; Isocortex is MBA:315 but compact value 1332. The processor fails if a sampled nonzero value has no terminology row.

Zero is treated as background/unassigned, never as a named brain region. Clicks outside the actual slice image are ignored, including object-fit letterbox margins. A background voxel reports no labeled region. Labels are sampled without continuous interpolation, so interpolated fractional IDs cannot be introduced.

## 3D surfaces and display limits

Each of the 683 sampled nonzero labels gets its own derived surface. Marching cubes uses the 50 µm binary label mask, with a two-voxel step (100 µm) for larger masks and a one-voxel step for small masks. No geometry smoothing or nearest-name assignment is used. These are coarser display approximations of the official annotation, not Allen-distributed meshes or exact original 10 µm boundaries. Small structures not captured by the 50 µm preview are omitted. Thin layers may look coarse or have gaps at the display resolution.

Surfaces are combined for efficient rendering while retaining contiguous triangle-to-label ranges. 3D picking uses the clicked triangle's original label. Isolation includes that region's official descendant label values. Surface positions and slice labels share the same preview affine and one common documented display conversion: centered RAS -> (R,S,-A), at 0.2 display units per millimeter.

After a surface click the slice crosshair is moved to a nearby sampled voxel with that same source label. If no matching voxel is found within the small local search, the precomputed representative voxel of that same region is used. This fallback never infers a different region name. Search selection uses a representative voxel confirmed to belong to the chosen region or its descendants.

## Slice intensity and coordinates

Grayscale slices use the template's original sampled intensities, windowed from zero to the 99.5th percentile of positive values and converted to uint8 for browser display. Brightness is anatomy, not expression or nTPM. Color overlays use Allen terminology colors.

Coronal slices vary anterior coordinate; horizontal slices vary superior coordinate; sagittal slices vary right coordinate. Indexing in the UI starts at one. Coordinates are millimeters in the source NIfTI frame, not independently validated stereotaxic measurements.

## Reproduce and verify

In a Python environment with NumPy, nibabel, SciPy, scikit-image and Pillow:

```sh
python scripts/prepare_mouse_template.py /path/to/template_10.nii.gz
python scripts/prepare_mouse_annotations.py
node --test tests/*.test.mjs
```

The annotation processor downloads the official originals if absent, checks coordinate compatibility, and rebuilds the lightweight browser assets. Run it after the template processor. Raw files are checksummed for provenance.

Tests verify matching coordinate grids, the compact-index/MBA-ID distinction, every named label, representative voxel membership, all three slice-picking orientations and letterbox rejection, and all triangle indices / face-to-label ranges. Human regional ranking tests remain included. Manual browser checks covered 3D picking, named region selection, isolation and slice picking.

Mouse immersive VR and gene expression overlays are not implemented. Mouse and human renderers remain independent, with inactive scenes paused.
