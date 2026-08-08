# R2-WP2 — Engineering & Infrastructure Mechanics

## Acceptance baseline

- Civil/local infrastructure capability is the primary repair workforce.
- Formations provide optional 0–100% engineering support rather than becoming wholly immobilised.
- A 25% support commitment from a 2,500-person formation leaves the remaining formation operational.
- Supporting formations can move and fight with explicit proportional penalties.
- Engineering support can be reduced or withdrawn without cancelling the civil project.
- Project cancellation remains a separate action.
- Repair speed reflects local capability, military support and actual supply.
- Damaged corridors degrade movement and throughput progressively; only genuinely destroyed or explicitly blocked routes are impassable.
- The engineering system includes persistent construction beyond simple repair, with time, industrial/material demand and a lasting infrastructure benefit.
- Old saves and old whole-formation engineering commitments normalise safely into the new model.

## Intended model

Repair and construction are local civil projects. A formation may assign engineering support to accelerate the work, but that support is a partial command commitment rather than a formation status lock. The formation remains selectable and operational, with movement/combat effectiveness reduced according to the support percentage while the detachment remains assigned.

Corridor repair restores route condition. Corridor upgrade construction improves persistent route capacity/reliability once the route is sufficiently restored. Project progress depends on endpoint civil/industrial capability, project supply delivery and optional military support.

## Validation

Focused R2-WP2 regression coverage, full repository tests, production build, save/load compatibility, deterministic 720-campaign balance simulation and representative traces are required before merge.
