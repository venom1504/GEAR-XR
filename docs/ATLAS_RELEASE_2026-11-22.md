# Human and Allen mouse atlas release — November 22, 2026

Promoted the reviewed prototype at Git commit 04bbb75 to the production dist/ directory. All application files were compared by SHA-256 and match the reviewed prototype.

The entry page now offers Human Autism Gene Expression and Allen CCF Mouse Brain. Human evidence and protein views are retained. The mouse section uses the supplied anatomical template, official coordinate-matched Allen CCFv3 2020 annotations, and the official compact-index terminology mapping. Users can click the 3D brain or slices for region names, search the hierarchy, and isolate regions.

The preview contains 683 nonzero sampled label values at 50 µm and 854 selectable entries including hierarchy parents. Derived 3D boundaries are coarser approximations (100 µm sampling for larger structures). No mouse expression data or mouse immersive VR is implemented.

Source metadata and hashes are in dist/assets/mouse-ccf/annotation.json and template.json. Raw official annotation sources are in research/mouse-ccf-2020/. Processing scripts and annotation tests are promoted with this release.

Validation: source-coordinate compatibility, all label-name mappings, representative voxel membership, all three slice-picking orientations and letterboxing, mesh indices and face-to-label ranges, existing human ranking tests, and manual browser clicks on 3D regions and slices. Further biological and fine-boundary validation remains outside these checks.

The protooype/ folder remains the separate editing copy for future work.
