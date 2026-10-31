# Complete PFC baseline — 31 October 2026

The current HPA cerebral cortex page omits the PFC parietal cortex sample table. The separate official `/brain/parietal%2Bcortex` page retains it. The importer now fetches that page for all 20 genes and preserves its HTML, URL and SHA-256 checksum. All 20 displayed source summaries exactly match the existing ranking input. Rounded individual-row means agree within 0.1 nTPM; unrounded measurements are unavailable.

Each gene has six distinct tissue IDs: 1584, 1585, 1586, 1587, 1588 and 1589. These are tissue sample IDs, not verified independent donors. They do not overlap other PFC tissue IDs. The two HPA studies remain separate.

TBR1 parietal sample values: 21.7, 20.2, 8.3, 7.2, 3.7, 2.7 nTPM (mean 10.6333; published summary 10.6). For superior frontal, the comparison grows from 149 to 155 tissues and 18/19 to 19/19 areas. Its comparison mean changes from 11.553691 to 11.518065 nTPM; target mean stays 15.750; enrichment becomes 1.367417×. SCN2A (1.369345×) now narrowly ranks above TBR1. This ordering is descriptive, not evidence of a statistically significant difference.

All evaluated candidate baselines now include every other source area in their study. The generic exclusion logic remains for future missing records. Donor imbalance and statistical uncertainty remain unadjusted.

Source example: https://www.proteinatlas.org/ENSG00000136535-TBR1/brain/parietal%2Bcortex#hpa_pfc_brain_rnaseqparietal_cortex

Prototype only; the public website was not changed.
