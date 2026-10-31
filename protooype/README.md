# GEAR-XR — lab prototype

This `protooype/` folder contains the expanded-sampling and repaired-display model described in the linked chat. It is separate from the live site's root `dist/` directory.

## Run locally

From this folder:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8768 . Keep the terminal open; press Control+C to stop. Use a local web server rather than opening index.html directly.

Run `npm test` to execute 19 regression checks.

## What's included

- Postcentral and precentral evidence includes the unsuffixed entry plus dorsal, middle and ventral subdivisions, across all 20 library genes.
- TBR1's original 105.0 nTPM single-sample entry remains visible. Its expanded postcentral summary is 85.175 nTPM across four equally weighted source entries, containing 15 tissue samples, not 15 verified independent donors.
- All 880 mapped gene/source measurements have verified sample tables and direct source anchors. The audit retains 1,700 imported source entries across the two HPA studies. SCN2A superior frontal uses the separate PFC study: 10 tissue samples, mean 11.6 nTPM and range 3.9–25.4 nTPM.
- Shared broader mappings are explicit; cuneus and lateral occipital do not claim independent parcel-level measurements.
- Sampling notices disappear for empty rankings. Yellow is reserved for single-sample results; multiple-source evidence is neutral and its weights are shown.
- Region selection retains both hemispheres. The 3D canvas occupies its own panel, and narrow windows scroll.
- Protein switching and loading guards are repaired. ASH1L, DYRK1A and PTEN show a single representative chain, with cited monomeric-assembly metadata. Full supplied coordinate files and original display JSON are preserved.
- BigBrain links and download descriptions are corrected. The six historical extraction files have been recovered and match the original checksums.

## Limits that remain

The regional summary gives each source-entry mean equal weight, regardless of sample count. For TBR1 postcentral the n=1 entry still has 25% weight. The prototype exposes this limitation; it does not substitute a tissue-weighted or donor-weighted estimate. Tissue samples may come from repeated donors. Sample ranges are not confidence intervals. Enrichment remains descriptive, scoped to 20 library genes, without donor, age or cell-type adjustment. Broad anatomical correspondences are not spatial registrations. Physical headset validation remains required.

Read [LOCAL_LAB_PROTOTYPE.md](LOCAL_LAB_PROTOTYPE.md) for rebuild and provenance details. Preserve all asset licenses and scientific attribution.
