# Weighting correction — local prototype only

The ranking previously gave every source area one equal vote. It now gives every unique **tissue sample** one equal vote, for both the selected region and the comparison baseline.

For TBR1 postcentral:

| Source entry | Tissue samples | Previous area share | New sample share |
|---|---:|---:|---:|
| Unsuffixed postcentral | 1 | 25% | 6.7% |
| Dorsal | 6 | 25% | 40.0% |
| Middle | 5 | 25% | 33.3% |
| Ventral | 3 | 25% | 20.0% |

The individual sample mean is **78.493 nTPM**, replacing the former **85.175 nTPM** equal-area mean. The original unsuffixed **105.0 nTPM** measurement remains unchanged. Original area means are retained for provenance, while the calculation uses the individual sample rows rather than the rounded area means.

The comparison mean uses **951 other tissues**, excluding all target sample IDs, with mean **23.342 nTPM**. The corrected enrichment is **3.363×**. No target/comparison data are pooled across the HPA brain and HPA prefrontal studies.

All 193 source areas of the HPA brain dataset have individual sample rows for the 20 library genes. The PFC dataset has sample rows for 19 of 20 areas. Its parietal cortex summary has no verified individual-sample table in the retained official pages, so the prototype explicitly excludes it from the baseline and displays that coverage gap. There is no fallback to invented counts or area-weighted values.

Sample IDs are deduplicated within each study. Conflicting values for repeated IDs fail the build. Missing target sample records prevent a ranking. Genetics criteria and the 1.25× display threshold are unchanged.

**Remaining limitation:** this is tissue-sample weighting, not independent-donor weighting. Repeated samples from a donor can still overrepresent that donor; donor identities have not been established. Source nTPM values are rounded. No confidence intervals, donor-, age- or cell-type-adjusted estimates are implied.

Sources: [HPA data definitions](https://www.proteinatlas.org/humanproteome/brain/data), archived gene-specific HPA source pages, and exact sample links in the evidence panel. See `research/weighting-impact.json` for ranking changes across all regions. The live root `dist/` app is outside this prototype and was not changed.
