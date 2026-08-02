# Phase VIII-A: Escalation, Mobilisation and Enemy Command

Status: Implementation release  
Date: 2 August 2026

## Objective

Transform escalation from a passive numeric modifier into a visible strategic-response system. The modern world should mobilise, coordinate and issue operational orders in response to the future army's progress.

## Escalation stages

1. Local response
2. National mobilisation
3. Alliance coordination
4. Coalition intervention
5. Strategic emergency

The underlying 0–100 escalation value remains, but each threshold changes enemy behaviour and creates explicit intelligence reports.

## Mobilisation

Crossing escalation thresholds schedules named reinforcement projects with:

- source and formation name;
- personnel, armour and readiness;
- expected arrival turn;
- entry territory;
- preparing or deployed status;
- difficulty scaling.

Mobilisation draws from a finite theatre-response pool. Arriving projects create persistent enemy formations rather than silently increasing every existing formation.

## Enemy command cycle

Each resolved day the enemy command evaluates:

- player and enemy front lines;
- weak controlled territories;
- exposed or depleted enemy formations;
- reinforcement routes;
- concentration and entrenchment requirements.

The command can issue withdrawal, counterattack, entrenchment and repositioning orders. Counterattack plans feed the existing combat-resolution system.

## Intelligence

The Intelligence view shows:

- current escalation stage and next threshold;
- pending and deployed mobilisation projects;
- assessed enemy operational intent;
- intelligence reports with confidence and estimated strength ranges.

The player is warned before major enemy formations arrive, creating meaningful pressure between rapid advance and consolidation.

## Save compatibility

The campaign state advances to version 5. Version 4, version 3 and version 2 saves are migrated into the new strategic-response model with default mobilisation, planning and intelligence fields.

## Deferred scope

This phase does not yet implement:

- political diplomacy or negotiated surrender;
- civilian-harm and prisoner-conduct escalation triggers;
- air and naval operations;
- detailed country-specific mobilisation;
- nuclear-authorisation mechanics;
- the full 101-territory map.

Those systems will build on the strategic-response interfaces introduced here.
