# NeuroAtlas XR

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
