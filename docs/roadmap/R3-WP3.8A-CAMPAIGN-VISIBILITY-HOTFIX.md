# R3-WP3.8A Campaign Landmark Visibility Hotfix

Live review on 2026-08-15 showed the authored London miniature was not visible in the normal Campaign camera because V2 only activated authored glTF presentation in the Selected/local LOD band.

Hotfix decision:

- Theatre continues to use the cheap procedural fallback.
- Campaign and Selected/local use an approved authored landmark asset whenever the city is visible and the asset has loaded successfully.
- Loading and load failure retain the procedural fallback.
- Strategic-node coordinates, terrain elevation, 22 m clearance, gameplay state and territory authority remain unchanged.
- The dedicated browser gate must prove London presents as `authored-gltf` at Campaign LOD before deployment.
