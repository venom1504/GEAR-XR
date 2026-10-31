# GEAR-XR — lab prototype

This `protooype/` folder contains the expanded-sampling and repaired-display model described in the linked chat. It is separate from the live site's root `dist/` directory.

## Run locally

From this folder:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8768 . Keep the terminal open; press Control+C to stop. Use a local web server rather than opening index.html directly.

Run `npm test` to execute 20 JavaScript and 5 Python regression checks.

## What's included

- Postcentral and precentral evidence includes the unsuffixed entry plus dorsal, middle and ventral subdivisions, across all 20 library genes.
- TBR1's original 105.0 nTPM single-sample entry remains visible. Its corrected postcentral summary is 78.493 nTPM across 15 equally weighted tissue samples. The unsuffixed entry now has 1/15 (6.7%) weight, not 25%. This is not an independent-donor mean.
- All 880 mapped gene/source measurements have verified sample tables and direct source anchors. The audit retains 4,240 imported source entries: all 193 HPA brain areas and 19 of 20 PFC areas across 20 genes. The PFC parietal cortex baseline entry lacks a verified sample table and is explicitly excluded. SCN2A superior frontal uses the separate PFC study: 10 tissue samples, mean 11.6 nTPM and range 3.9–25.4 nTPM.
- Shared broader mappings are explicit; cuneus and lateral occipital do not claim independent parcel-level measurements.
- Sampling notices disappear for empty rankings. Yellow is reserved for single-sample results; multiple-source evidence is neutral and its weights are shown.
- Region selection retains both hemispheres. The 3D canvas occupies its own panel, and narrow windows scroll.
- Protein switching and loading guards are repaired. ASH1L, DYRK1A and PTEN show a single representative chain, with cited monomeric-assembly metadata. Full supplied coordinate files and original display JSON are preserved.
- BigBrain links and download descriptions are corrected. The six historical extraction files have been recovered and match the original checksums.

## Limits that remain

Every tissue sample now has equal weight in both the target and comparison means, with duplicate sample IDs removed and target samples excluded from the baseline. Independent donor weights remain unavailable; repeated donors can still be overrepresented. Tissue ranges are not confidence intervals. Enrichment is descriptive and does not adjust for donor, age or cell-type composition. Broad anatomical correspondences are not spatial registrations. Physical headset validation remains required.

See [WEIGHTING_CHANGE.md](WEIGHTING_CHANGE.md) for the exact methodological change and coverage limitations.

Read [LOCAL_LAB_PROTOTYPE.md](LOCAL_LAB_PROTOTYPE.md) for rebuild and provenance details. Preserve all asset licenses and scientific attribution.
