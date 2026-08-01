# World State System: Conceptual Overview

## Purpose

A World State is a dated, versioned snapshot that configures the political and strategic starting conditions of a campaign without changing the permanent campaign geography.

Example identifier:

`world-state-2026-08-v1`

## World State contents

- effective date and publication date;
- country existence and diplomatic status;
- recognised claims and actual territorial control;
- alliances and collective-defence relationships;
- active wars and internal conflicts;
- military capability bands;
- readiness and mobilisation state;
- broad deployment regions;
- foreign forces at an abstract level;
- defence expenditure and industrial potential;
- nuclear status and escalation doctrine;
- political stability and public-war tolerance;
- sanctions, blockades and major diplomatic restrictions.

## Update model

World States should be published monthly or quarterly, with exceptional releases after major geopolitical changes. Automated collection may propose updates, but a validation stage is required before a World State becomes playable.

Campaigns remain pinned to the World State on which they started. New releases do not alter saved games.

## Data principles

- Never claim real-time operational accuracy.
- Prefer official and stable public sources.
- Store source and retrieval metadata for every field.
- Distinguish observed data from game-balancing estimates.
- Keep precise military positions out of the dataset.
- Permit manual overrides with documented reasons.
- Preserve previous releases for reproducibility and historical scenarios.

## Separation from geography

Territories have stable IDs and polygons. The World State maps political and military attributes onto those IDs. A disputed territory can therefore change controller without requiring any geometry changes.

## Initial implementation boundary

The first playable prototype should use one manually reviewed World State. Automated updates should begin only after the underlying military, diplomatic and combat models are stable enough to interpret the data consistently.

