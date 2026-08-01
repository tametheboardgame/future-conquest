# Independent modern formations v0.1

## Purpose

Modern forces must become real campaign pieces, not a passive bonus attached to future task groups. This package defines how contemporary units are raised, commanded, supplied, damaged and politically lost.

It exists principally to solve the Desperate campaign through player behaviour. Ten thousand future troops cannot personally conquer and garrison 101 territories. They can provide the irreplaceable spearhead, but must create a coalition that eventually carries most conventional operations.

## Formation model

A modern formation is normally a brigade-sized unit of up to 2,500 personnel. Each formation retains:

- national identity and home territory
- security, infantry, mechanised or combined-arms role
- personnel and equipment strength
- readiness and cohesion
- loyalty to the future command
- present location and recovery state
- accumulated casualties, refusals and defection state

Controlled territories begin forming local units after the approved ten-day political and administrative handover. The available pool follows the territory's urbanisation and strategic capacity. This is a provisional abstraction, not a claim about real national orders of battle.

## Orders and command friction

Modern formations may hold, defend, support or attack. An offensive order is assessed against loyalty, readiness, cohesion and its political distance from home:

- national operations have no command penalty
- operations into an adjacent foreign territory have moderate friction
- expeditionary operations have the highest threshold

A refusal leaves the formation in place and reduces loyalty. It does not give the player a free reroll. Repeatedly asking unreliable units to perform politically difficult operations can make the relationship worse.

The future army supplies command cadres, communications and planning capacity. Smaller future armies therefore coordinate fewer simultaneous operations and require more reorganisation days. This command-bandwidth rule creates the campaign-length difference between modes without changing local mobilisation or giving easier settings arbitrarily stronger allies.

## Loyalty and political authority

Loyalty is organisational willingness to obey the future command, not ideological affection. It begins from the occupation settlement and changes through:

- accepted local government
- coercion and civilian harm
- victories and defeats
- heavy casualties
- prolonged critical supply
- refused orders

Below the defection threshold, a formation leaves the coalition and becomes unavailable. A later escalation package will decide whether it disbands, declares neutrality, joins resistance or returns to its national government.

The negotiated political profile is the common baseline for all four army settings. The simulation does not grant Desperate mode extra recruits, loyalty or combat strength.

## Losses, recovery and equipment

Modern formations suffer personnel casualties and equipment attrition independently from future troops. Surviving units enter a recovery state after battle. Limited local replacements can rebuild them only to 85 per cent of their original strength. They cannot regenerate indefinitely to full strength.

Equipment loss is role-sensitive. Mechanised and combined-arms units provide greater combat power but consume more supply and expose more difficult-to-replace equipment. Battlefield outcome controls the later salvage fraction.

## Player-facing consequences

The system creates several intended decisions:

- preserve future troops by delegating conventional battles
- keep local forces near home for reliability or accept expeditionary refusal risk
- tolerate slower negotiated occupation for stronger long-term armies
- rotate damaged brigades rather than treating allies as disposable
- decide whether an objective justifies casualties that may collapse loyalty
- maintain enough future command capacity to coordinate a continental coalition

Modern formations remain useful but conditional. They can conquer territory, suffer permanent losses, decline orders and disappear from the player's force pool.

## Integration boundary

The v0.1 simulator uses a reduced campaign-scale battle resolver to isolate the new relationship. Its next integration point is the existing multi-day operational combat resolver, where modern attackers will gain retreat routes, medical pools, battlefield salvage and reinforcement timing identical in structure to future formations.

The dated World State will later replace provisional personnel pools and role assignment with researched national capabilities. The escalation and occupation package will replace the three political profiles with events and policy choices.
