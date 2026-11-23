# GEAR-XR — fresh prototype

Created November 22, 2026 from the current live website.

This replaces the retired lab prototype. Future experimental changes belong in this folder.
The application started as an exact copy of the production `dist/` tree: all 69 baseline files were compared with the live website and matched byte for byte. `BASELINE.json` records that original snapshot, before prototype edits.

## Current prototype changes

The home screen offers **Human Autism Gene Expression** and **Allen CCF Mouse Brain**. The header switches between them. The human atlas retains its existing data and behavior. The mouse section combines the supplied `template_10.nii.gz` with matching official Allen CCFv3 2020 annotations. Click the 3D region surfaces or annotated slices to see names, abbreviations and Allen IDs. Search selects regions and their descendants; isolation reveals internal structures. A six-gene adult mouse RNA demo now supplies separate Allen coronal ISH experiments, exact-ID source-region summaries and optional 3D summary coloring. This is not a voxel overlay. See `MOUSE_EXPRESSION.md`. See `MOUSE_ATLAS.md` for sources, processing and resolution limits.

## Open locally

From this folder:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory dist
```

Then visit http://127.0.0.1:8768/ .

## Files

- `dist/`: browser application, atlas selector and derived mouse preview assets.
- `research/`, `scripts/`, `tests/`, `docs/`: the current production supporting files.
- `BASELINE.json`: original Git commit, live URL and SHA-256 checksums.
- `UPSTREAM_README.md`: the repository README at the time of copying.

The earlier expanded-sampling prototype, its experiments and its dated ZIP backup have been removed from this folder. No changes from that prototype were carried over. The current production behavior is the starting point, including its existing scientific methods and limitations.

## Keep production separate

Edit this folder for prototype work. Root `dist/` is the live application's code.
Prototype-only commits must include `[skip render]` to prevent a Render deployment.
The local shortcut `GEAR-XR-prototype` points here so there is only one working prototype.

Reset source: https://github.com/venom1504/GEAR-XR/commit/c9670e32a0321bdd6f9e0e3ba83f56678cd89d10

## Human RNA prototype update

The human atlas now defaults to a separate Allen Human Brain Atlas adult microarray view for all 20 genes, with donor/probe selection, conservative hemisphere-specific source-name matching, inspectable sample counts and optional regional-expression coloring. HPA candidate rankings remain selectable. Both atlases have an adjustable opacity control (78% by default). See `HUMAN_ALLEN.md` and the linked in-app methods for the distinction between source summaries and spatial registration.

## About-page prototype

`dist/about.html` is a simple team and project-goal page, linked from the prototype header. It distinguishes current adult reference measurements from the longer-term childhood-development and 3D brain-atlas goals. Contact / reach-out features are intentionally omitted for now. Only prototype files were changed; the public site is untouched.

## Home page and narrated demo

The prototype root URL and GEAR-XR wordmark now lead to `about.html`, which serves as the home page. The atlas chooser remains available at `index.html#atlases`, and direct human/mouse links still work. The hero card uses the existing 4K slideshow demonstration with its original audio, native controls, a real video-frame poster and an explicit Play button. Playback starts only after user interaction, unmuted by default. Video source metadata and a checksum are saved in `dist/assets/demo/source.json`. No contact features were added, and production assets are unchanged.

## 3D wording update

The About page now describes 3D brain atlases. Its 4K demo removes the opening virtual-reality sentence and matching captions, retaining the original voice and pacing elsewhere (96.33 seconds). The immutable source remains outside the prototype. `scripts/edit-home-demo-3d.py` records the exact edit. Transcription and full-media decoding passed; audible quality was not independently reviewed. Production and the slideshow remain unchanged.
