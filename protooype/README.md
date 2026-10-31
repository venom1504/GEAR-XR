# GEAR-XR lab prototype

Saved in the repository's `protooype` section. This is the sample-coverage lab model, separate from the live site.

- TBR1 postcentral: **105.0 nTPM, n=1 sample**.
- Related postcentral subdivisions: dorsal **6**, middle **5**, ventral **3** samples; each remains a separate entry.
- Unsuffixed precentral: **n=1 sample**.
- Includes evidence pages, source counts, model assets and seven passing regression checks.

From this folder, run `python3 -m http.server 8767 --bind 127.0.0.1 --directory dist` and open http://127.0.0.1:8767 . Run `npm test` for verification.

Read [LOCAL_LAB_PROTOTYPE.md](LOCAL_LAB_PROTOTYPE.md) for the sampling definitions and limitations.

---

# LOCAL LAB PROTOTYPE — sample coverage

Start with [LOCAL_LAB_PROTOTYPE.md](LOCAL_LAB_PROTOTYPE.md). This independent local copy is not connected to the deployed site.

# GEAR-XR

Interactive Three.js/WebXR brain, gene-expression and protein demonstration.

This repository contains the prebuilt public website and its scientific attribution.

## Render static site

- Branch: `main`
- Build command: `test -f dist/index.html && test -f dist/assets/brain-v2.bin && test -f dist/assets/sanger-expression.json`
- Publish directory: `dist`
- Service type: Static Site

No server, database, dependency installation, or secret environment variables are required.

The website restores the presentation UI from source snapshot 308c230: the cortical region explorer, HPA expression panel, and 20 interactive protein structures. The brain-to-protein transition is illustrative; expression is not exclusive to the selected region. Model uncertainty and fragments are labeled.

Unused STAGE assets remain archived in the deployment directory for compatibility with the existing Render build check. The presentation UI does not load them.

## Attribution and licenses

See `dist/assets/sanger-methods.html`, `dist/assets/ATLAS_REFERENCES.txt`, and `dist/assets/BIGBRAIN_LICENSE.txt` for the full scientific references and terms. BigBrain-derived anatomy is CC BY-NC-SA 4.0 and is for noncommercial use. STAGE adaptations retain attribution under CC BY 4.0. Harvard–Oxford surface adaptations are CC BY-SA 4.0. Other assets retain their original notices.

## Regional gene ranking (28 October 2026)

The current HPA interface now defaults to at most three candidates ranked by descriptive same-study regional enrichment, after SFARI score 1/2 genetic-evidence filtering. It does not switch to the prenatal STAGE dataset. The scope is the 20 current library genes. No qualifying genes means an explicit empty state, never a fallback to the largest RNA value.

Rebuild: `python3 scripts/build_ranking.py`. Inputs and official SFARI snapshot: `research/`. Output: `dist/assets/regional-ranking.json`. Tests: `npm test`. Methods and limitations: `dist/assets/regional-ranking-methods.html`. No geometry changes or public deployment are included.
