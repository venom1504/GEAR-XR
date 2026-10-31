# Local lab prototype — reconstruction and audit

This folder reconstructs the newer model described in the supplied shared-chat history using verified files and public source records. It is not a byte-for-byte export of that other chat's local filesystem.

## Rebuild

Run from this folder, in order:

```sh
python3 scripts/fetch_sample_coverage.py
python3 scripts/expand_regions.py
python3 scripts/build_ranking.py
python3 scripts/prepare_protein_display.py
npm test
```

The source-page fetcher reuses archived pages if present. It downloads only missing public pages. The other builds use saved inputs. Node.js and Python 3 are sufficient; no package installation is required.

## Exact interpretation

Postcentral TBR1 uses source-entry means 105.0, 65.1, 84.8 and 85.8 nTPM, each contributing 25%, yielding 85.175 nTPM. Those entries have 1, 6, 5 and 3 tissue samples. The 15 unique sample IDs represent tissue samples, not verified independent people. The raw 105.0 entry is retained and still has n=1. Observed sample ranges describe variation; they are not uncertainty intervals for the regional estimate.

The comparison baseline excludes all mapped target source areas, within the same HPA study. HPA brain and HPA prefrontal measurements remain separate. Whole-baseline independent-donor coverage and statistical uncertainty have not been estimated. SFARI scores are association evidence overall, not region-specific causality. No genetic-evidence or enrichment thresholds were changed.

## Provenance

- `research/legacy-expression.json`: original unexpanded compiled expression input.
- `research/expression-source/`: the six recovered original extraction files, verified against every SHA-256 entry in the historical `expression.json` manifest.
- `research/sample-coverage-source/`: official per-gene HPA cerebral-cortex and hippocampal-formation pages. Source URLs, per-entry anchors and raw-file checksums are retained in `dist/assets/sample-coverage.json`.
- `research/protein-assemblies/`: official RCSB assembly-1 metadata for 3OPE, 2VX3 and 5BZZ, each documenting one protein chain and monomeric symmetry.
- `research/protein-display-original/`: the original multi-chain JSON traces. The prototype display retains the first supplied chain A; it is a representative C-alpha trace, not a complete atomistic assembly reconstruction. Unmodeled residues and fragments remain unmodeled.
- Supplied CIF/PDB downloads stay intact. Their labels no longer imply unmodified original database deposits.

## Verification

19 automated checks cover full ranking recomputation, all 880 mapped gene/source values and sample counts, all 1,700 sample-entry citations/checksums, SCN2A PFC coverage, equal-area versus tissue weighting, no invented donor counts, all six recovered files, monomer display selection, parcel visibility, pointer coordinates and disposal of repeated protein views. Browser checks additionally cover layout, empty-region notices, shared mappings, independent protein switching, and returning to the brain.

The public app is outside this folder. Commits for this model should include `[skip render]` and must not change the root production `dist/` tree.
