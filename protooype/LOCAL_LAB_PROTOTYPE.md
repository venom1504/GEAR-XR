# GEAR-XR — local lab prototype: sample coverage

This is a separate local copy, not the public Render site or the connected GitHub checkout. No deployment is required.

Start inside this folder:

```sh
python3 -m http.server 8767 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8767 . Press Control+C to stop.

The amber banner identifies the lab prototype. Each candidate card shows samples per exact source entry; the selected gene's expanded evidence lists sample counts alongside the RNA values. TBR1 postcentral remains 105.0 nTPM, with n=1 highlighted. Its dorsal/middle/ventral subdivisions are separate entries with n=6/5/3 and are not pooled into that value. Unsuffixed precentral is n=1.

Counts come from individual sample rows on the exact gene's official HPA cerebral-cortex page. Study, source-area name and displayed nTPM must match the saved expression input before a count is exposed. Missing or changed entries show “not verified,” never zero or an inferred count. More than one sample does not establish the number of independent donors; that count remains unknown. A one-sample entry represents one sampled donor. No donor count is inferred from repeated sex, age or hemisphere descriptions.

Regional rankings, the 1.25× display threshold and SFARI filtering remain unchanged. The comparison baseline's full sample coverage has not been audited; its area count is not a donor count. No uncertainty estimates, donor-weighted reanalysis or cell-composition adjustments are introduced. Counts expose evidence limitations rather than validating enrichment.

Sources and reproducibility:
- `dist/assets/sample-coverage.json`: per-gene/study/entry sample counts, sample IDs, public descriptions, nTPM values, source URLs and page checksums.
- `research/sample-coverage-source/`: official pages retained for audit.
- `scripts/fetch_sample_coverage.py`: fetch and parse the source pages, then check against saved nTPM inputs.
- `tests/sample-coverage.test.mjs`: single-sample cases, separate subdivisions, mismatches, unknown values and donor-count safeguards.

Run `npm test` for the original ranking checks plus coverage regressions.
