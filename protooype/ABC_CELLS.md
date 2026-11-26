# ABC Atlas categorical mouse-cell prototype

Jing Zhu requested categorical cell-type annotations in addition to continuous gene expression. This implementation uses the recommended **Zhuang-ABCA-2** specimen, distinct from the pre-existing Allen ISH expression demo. Production `dist/` is unchanged.

Open `index.html#mouse`, select **ABC cell types**, then choose class, subclass or neurotransmitter annotation. Search the legend, click a category, select an anatomical region, or click a 3D cell dot to inspect its source record. Registered sampled cells also appear on anatomical slices (±50 µm slab). The anatomical context becomes transparent and returns to the previous opacity when leaving cell mode.

- 1,227,408 source metadata cells.
- 1,056,520 exact-ID joins to registered CCF coordinates.
- 1,035,684 with a known non-background source annotation.
- 128,828 deterministic approximately 1/8 sampled points for rendering.
- Counts use the full labeled registered set, not the display sample.
- One adult wild-type male mouse, not human, childhood or autism-specific data.

The supplied Zeng notebook index links the dedicated Zhuang collection. Use the Zhuang tutorial and official dataset for this layer, not an inferred identity from the shared interactive viewer hash.

Sources, checksum manifest, coordinate audit, exclusions, limitations, licensing and access plans are in `dist/assets/mouse-cells/methods.html` and `metadata.json`. Source data are CC BY 4.0. The project-wide software license/asset review remains pending; no blanket open-source claim is made for third-party brain assets.

Rebuild:

```
python scripts/prepare_mouse_cells.py --cache /path/to/external/cache
npm test
```

Python dependencies: numpy, pandas, nibabel. Rebuild verifies MD5 against the pinned official manifest and records SHA-256. Registered CCF AP/DV/ML coordinates are transformed to the existing anatomical RAS origin without mirroring. A nearest-25 µm label audit agrees for 92.81% of 10,357 checked cells; source region assignments are preserved for mismatches.
