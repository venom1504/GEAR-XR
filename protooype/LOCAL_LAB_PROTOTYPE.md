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

Postcentral TBR1 retains the HPA source-entry means 105.0, 65.1, 84.8 and 85.8 nTPM for provenance. The ranking now averages their individual tissue measurements with equal weight per sample. The entries contain 1, 6, 5 and 3 samples, yielding 78.493333 nTPM across 15 sample IDs; the single-sample entry contributes 6.7% rather than 25%. The former equal-area result, 85.175, is retained in the ranking audit fields only.

The baseline uses the identical tissue-sample method in the same study. IDs are deduplicated, target IDs excluded, and conflicting duplicate values fail the build. All HPA brain areas are covered; all 20 PFC areas are now covered, including six parietal cortex tissue samples per gene recovered from its separate official page. Counts are tissue counts, not independent donor counts. Repeated donors, age, cell composition and statistical uncertainty remain unadjusted. Original rounded sample rows are retained, so calculation precision is limited by the published numbers.

## Provenance

- `research/legacy-expression.json`: original unexpanded compiled expression input.
- `research/expression-source/`: the six recovered original extraction files, verified against every SHA-256 entry in the historical `expression.json` manifest.
- `research/sample-coverage-source/`: official per-gene HPA cerebral-cortex and hippocampal-formation pages. Source URLs, per-entry anchors and raw-file checksums are retained in `dist/assets/sample-coverage.json`.
- `research/protein-assemblies/`: official RCSB assembly-1 metadata for 3OPE, 2VX3 and 5BZZ, each documenting one protein chain and monomeric symmetry.
- `research/protein-display-original/`: the original multi-chain JSON traces. The prototype display retains the first supplied chain A; it is a representative C-alpha trace, not a complete atomistic assembly reconstruction. Unmodeled residues and fragments remain unmodeled.
- Supplied CIF/PDB downloads stay intact. Their labels no longer imply unmodified original database deposits.

## Verification

20 JavaScript and 5 Python checks cover independent recalculation of every ranking, all 880 mapped source values, all 4,240 sample-entry citations/checksums, correct 1-versus-6 sample weighting, deduplication, conflicting IDs, target exclusion, explicit PFC coverage gaps, source recovery and the display repairs. `research/weighting-impact.json` compares top-three lists with the previous equal-area version. Browser checks cover the displayed method, percentages and preserved source values.

The public app is outside this folder. Commits for this model should include `[skip render]` and must not change the root production `dist/` tree.
