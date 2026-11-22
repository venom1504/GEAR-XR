# Human labels, adult RNA and transparent anatomy

Prototype only. The public production assets are unchanged.

The human cortex keeps its existing BigBrain/DKT geometry. Parcels use FreeSurfer anatomical label colors. An opacity slider starts at 78%, using smooth material transparency with depth testing. Set 100% for solid colors. The same opacity control was added to the mouse brain. Neither control changes geometry.

The new evidence selector defaults to Allen Human Brain Atlas adult microarray measurements: all 20 library genes, 62 separate probes and 3,702 source samples from six adult donors. Donor age and sample counts are visible. Select one gene, one donor and one probe; each is kept separate. KMT5B is recovered via legacy symbol SUV420H1 and checked by NCBI Gene ID 51111. The initial probe is the lowest ID, not a quality-ranked recommendation; probe detection/reliability filtering has not been applied.

Surface color can show anatomical labels or a selected-probe regional RNA mean. Forty of 64 DKT parcels have conservative same-name AHBA source-area mappings, including source subdivisions and respecting hemisphere. This is an **approximate name-based crosswalk**, not a spatial registration or an Allen human voxel annotation. Twenty-four parcels remain unmapped. Donors with no source samples remain unavailable, never zero or mirrored. Source sample IDs, areas and values are inspectable in the panel. No tissue samples are averaged by subdivision first; the mean weights every available tissue sample equally within one donor and probe. The log2 signal mean is not nTPM or protein abundance. No developmental or ASD/control inference is made.

The human mesh contains cortex only; this feature does not create missing subcortical structures or localized protein positions. HPA regional candidate rankings remain available in their own dataset view and are not mixed into Allen signals. Molecular view is reached from HPA, not from Allen regional summaries. Updated VR source labels avoid showing HPA claims while in Allen mode; headset interaction still needs physical validation.

## Verified primary sources

- https://human.brain-map.org/static/download
- https://brain-map.org/support/documentation/human-brain-atlas-microarray-data
- https://raw.githubusercontent.com/freesurfer/freesurfer/dev/distribution/FreeSurferColorLUT.txt
- https://www.ncbi.nlm.nih.gov/gene/51111

Original responses, URLs and SHA-256 hashes are in research/human-allen. The browser data, complete crosswalk and user-facing methods are under dist/assets/human-allen. The script verifies the two response sample arrays are identical before combining probes. It never treats the returned donor-MRI coordinates as MNI coordinates or projects them onto BigBrain.

Rebuild: `python3 scripts/prepare_human_allen.py` (uses archived source responses; missing response files can be recovered from saved official URLs). Verify: `node --test tests/*.test.mjs`.
