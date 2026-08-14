# WP3.5 Production Fallback Hotfix

Status: ACTIVE PRODUCTION REGRESSION

## Trigger

After PR #141 merged to `main` and GitHub Pages deployed merge commit `b088936bd4cab25a697c1a2f64de065ca92b8e82`, product-owner visual inspection in Chrome on Windows showed the legacy Task Group DOM cards and no physical army/city/infrastructure miniatures. Incognito reproduced the issue.

The 3D terrain and operational overlays are present, so the regression is specifically the WP3.5 Three.js custom-layer activation/rendering path. The visible legacy cards correspond to the explicit compatibility fallback rather than the intended `data-physical-formations='ready'` state.

## Objective

Find and fix the real production failure. Do not treat successful merge, Pages deployment, local `vite preview`, or CI diagnostics as proof that deployed WP3.5 visuals work.

## Required investigation

- Reproduce or instrument the exact reason the physical world/formation layer enters fallback in deployed GitHub Pages.
- Verify production subpath/dynamic-import chunk loading.
- Verify MapLibre 6 / Three.js 0.179 custom-layer WebGL context compatibility on realistic production browser paths.
- Initialise world and formation layers independently so a failure in one does not unnecessarily suppress the other.
- Preserve DOM/SVG fallback but expose machine-readable fallback reason and layer-specific state.
- Add deployed-path/browser regression coverage capable of detecting the product-owner failure state.

## Non-negotiable boundaries

- Preserve PR #139 geographic anchoring guarantees.
- Preserve WP3.5 movement/click-target synchronisation, route bearing, Layers controls and GPU cleanup.
- Preserve performance budgets, gameplay authority, balance, saves and hidden-information behaviour.
- Keep `?terrain=0` supported.
- No WP4 work.

The hotfix is complete only when exact-head CI is green and the deployed production path proves the physical layers are active and visible for product-owner retest.
