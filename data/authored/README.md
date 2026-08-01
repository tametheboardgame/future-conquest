# Authored Campaign Data

This directory contains project-owned geographic and strategic definitions, including:

- permanent territory identifiers;
- territory merge and split relationships;
- strategic nodes;
- movement edges and chokepoints;
- sea zones;
- terrain classifications;
- authored military regions;
- portal-placement constraints.

Generated geometry belongs in a separate build-output location once the map pipeline is established.

Current transport definitions:

- `transport-hubs-v0.1.json` selects campaign-scale rail, motorway and
  intermodal hubs.
- `critical-crossings-v0.1.json` selects fixed links, straits, river crossings,
  passes and constrained approaches that can alter strategic movement.
