# GEAR-XR — fresh prototype

Created November 22, 2026 from the current live website.

This replaces the retired lab prototype. Future experimental changes belong in this folder.
The application starts as an exact copy of the production `dist/` tree: all 69 files were compared with the live website and matched byte for byte.

## Open locally

From this folder:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory dist
```

Then visit http://127.0.0.1:8768/ .

## Files

- `dist/`: browser application and assets, copied without changes.
- `research/`, `scripts/`, `tests/`, `docs/`: the current production supporting files.
- `BASELINE.json`: original Git commit, live URL and SHA-256 checksums.
- `UPSTREAM_README.md`: the repository README at the time of copying.

The earlier expanded-sampling prototype, its experiments and its dated ZIP backup have been removed from this folder. No changes from that prototype were carried over. The current production behavior is the starting point, including its existing scientific methods and limitations.

## Keep production separate

Edit this folder for prototype work. Root `dist/` is the live application's code.
Prototype-only commits must include `[skip render]` to prevent a Render deployment.
The local shortcut `GEAR-XR-prototype` points here so there is only one working prototype.

Reset source: https://github.com/venom1504/GEAR-XR/commit/c9670e32a0321bdd6f9e0e3ba83f56678cd89d10
