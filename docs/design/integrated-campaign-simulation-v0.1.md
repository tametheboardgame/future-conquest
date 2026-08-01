# Integrated campaign simulation v0.1

## Purpose

This simulation connects the approved geography, logistics, formations and
multi-day combat systems across the complete 101-territory campaign graph.

Unlike the earlier logistics envelope, future troops now persist as task groups.
Every battle changes the army that enters the next battle.

## Campaign state

The simulation advances one day at a time and tracks:

- controlled and contested territories;
- active task groups and simultaneous operations;
- functional, damaged and broken armour within each task group;
- active, wounded, killed and captured personnel;
- seven-day and 45-day medical return queues;
- routine armour wear and supply-driven wear;
- damaged-suit repair and broken-suit restoration;
- spare components and battlefield salvage;
- future and modern garrison requirements;
- integrated modern battle support;
- supply activation, civilian reservation and distance losses;
- captured technology and enemy adaptation;
- escalating enemy archetypes as the campaign continues.

## Formation preservation

The campaign planner refuses attacks below a minimum forecast ratio and commits
additional task groups against mechanised or combined-arms resistance. Depleted
task groups can combine operationally rather than becoming unusable because
their administrative container has fallen below its original size.

This correction is essential. An earlier diagnostic run allowed suicidal repeat
attacks and produced hundreds of defeats. The final version preserves those
failed results only in development history, not as balancing evidence.

## Medical integration

Combat casualties immediately leave the active formation. After the battle they
enter killed, captured, recoverable or critical pools. Recoverable wounded return
after seven days; critical wounded become eligible after 45 days.

Returning troops normally rejoin with damaged or no powered armour. Medical
recovery therefore restores personnel faster than it restores combat power.

## Repair integration

Routine operation damages a small share of armour every day. Low supply
accelerates wear. Idle formations repair damaged suits slowly using components,
while restoration of a broken suit costs substantially more.

Battlefield ownership controls salvage. Recovered broken suits supply both a
restoration queue and cannibalised components. The simulation does not create
new suits or infinite spare parts.

## Enemy development

The World State military layer is not yet available, so resistance currently
progresses through campaign archetypes: security, infantry, mechanised,
combined-arms and national mobilisation. Terrain, urbanisation, hubs, campaign
time and captured technology determine the level encountered.

These are placeholders for dated national formations, not claims about the
actual deployment of any country.

## Modern-force limitation

Integrated modern forces currently relieve garrisons and add bounded support to
future-led battles. They are not yet represented as independent formations that
can attack, defend, retreat and suffer their own casualties.

The results show that this is sufficient for Campaign, Standard and Veteran but
not for Desperate. This is now a required next mechanic rather than something to
solve by increasing future combat statistics.
