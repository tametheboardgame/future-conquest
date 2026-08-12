# R3-WP2B visible-render regression

Live product-owner review on 2026-08-12 showed the MapLibre terrain shell reaching `ready` while the visible map area remained blank.

This package strengthens the browser gate from DOM/runtime readiness to visible output:

- verify the MapLibre canvas has non-zero visible dimensions and is not hidden by CSS;
- capture the rendered map host after readiness;
- quantify sampled screenshot colour variance so a near-uniform blank surface fails CI;
- retain the screenshot as a workflow artifact for visual inspection.

WP3 remains paused until the deployed terrain surface visibly renders and receives product-owner review.
