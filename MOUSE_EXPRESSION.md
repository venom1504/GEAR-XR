# Allen adult mouse RNA demo

This demo uses **Ctf1, Tbr1, Slc17a7, Gad1, Pvalb and Sst**, with all ten eligible P56 coronal experiments returned by the Allen API query. Experiments are selected individually, never averaged. They are a small demonstration set, not an autism gene panel. P56 is adult mouse, not human childhood.

Choose a gene and experiment in the mouse Region explorer. Select a region using search, 3D clicking or a slice. The panel reports the matching source summary and experiment/donor provenance. The optional 3D coloring assigns the selected experiment's expression energy to each exact-ID matched region; gray means unavailable. Slices retain anatomical region colors. The whole region receives a uniform summary color; no individual cells or expression hotspots are localized.

## Sources and units

- [Allen Mouse Brain Atlas](https://mouse.brain-map.org/)
- [Official ISH documentation](https://brain-map.org/support/documentation/in-situ-hybridization-ish-data)
- [Official API documentation](https://brain-map.org/support/documentation/api-for-mouse-brain-atlas)
- [Allen terms of use](https://alleninstitute.org/legal/terms-use/)

Source dataset: SectionDataSet, product 1, failed=false, coronal, age P56. Source region summaries: StructureUnionize filtered to reference structure graph 1. Every query response is preserved in `research/mouse-expression/`; the manifest records exact URLs, file sizes and SHA-256 hashes. Original downloadable 200 µm energy, density and intensity grid ZIPs are preserved with experiment-labeled filenames in `dist/assets/mouse-expression/`. Use these under Allen's applicable terms; this project does not relicense them.

- Energy: sum_expressing_pixel_intensity / sum_pixels.
- Density: sum_expressing_pixels / sum_pixels, displayed as percent.
- Intensity: sum_expressing_pixel_intensity / sum_expressing_pixels, calculated from the returned sums. Unavailable if the denominator is zero.
- Sampled pixel sum is an image-analysis denominator, not donor or animal count.

These are RNA ISH optical image signals, not nTPM, protein abundance or molecule counts. Probe and experiment differences prevent treating cross-gene signals as a calibrated expression comparison. No autism diagnosis or disease-specific difference is inferred.

## Atlas compatibility

The downloaded expression grids use the earlier Allen CCF release (documentation describes the May 2015 update). Our anatomical annotation is CCFv3 2020. This implementation does **not** overlay those grids onto the 2020 volume or claim identical boundaries. It joins source-region summaries only where an exact MBA structure ID exists. Matching names/IDs alone do not establish equivalent boundary geometry. No parent fallback, missing-as-zero imputation, or averaging of overlapping parent/child summaries is applied.

The sequential color scale runs from zero to the maximum energy across matched selectable regions within the selected experiment and uses a square-root transform. The legend labels this transform. Three-dimensional lighting can change apparent color; the numeric panel is authoritative. Selection no longer dims expression colors; use isolation to highlight a selected region.

## Reproduce

Run `python3 scripts/fetch_mouse_expression.py`, then `node --test tests/*.test.mjs` inside the prototype. The downloader validates ZIP integrity, raw byte sizes and retains all source responses. Existing cached files are reused and checksummed. Source grids are offered for download; they are not loaded as a spatial overlay.
