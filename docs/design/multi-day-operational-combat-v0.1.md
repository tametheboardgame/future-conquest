# Multi-day operational combat v0.1

## Purpose

This layer turns the daily engagement calculation into complete operations. A
battle now persists across turns, receives reinforcements, changes the condition
of both forces and ends through capture, withdrawal, repulse or stalemate.

## Operational progress

Every operation begins at neutral progress. Daily results move an operational
progress track towards the objective or back towards the attacker's starting
position:

- decisive attacker result: +45;
- attacker success: +25;
- stalemate: no territorial progress;
- defender success: -20;
- decisive defender result: -40.

The objective is taken at +100. The attack is repulsed at -80. These thresholds
normally require several favourable days rather than allowing one calculation to
decide a prepared territorial battle.

## Reinforcements

Reinforcements receive an arrival day based on their route, readiness and prior
orders. They must have at least a contested usable route into the operation.
Arriving units contribute reduced same-day power while deploying, then operate
normally from the following day.

The first implementation merges reinforcement strength into the operational
side. The eventual game retains individual formations so they can withdraw,
receive separate casualties and arrive from different territory edges.

The player receives an estimated arrival range rather than perfect certainty
when enemy interdiction or damaged crossings affect the route.

## Withdrawal decisions

Each side has automatic withdrawal thresholds for cohesion and cumulative
casualties. The player can override them through standing orders, except when a
formation has routed or lost command coherence.

Retreat outcomes depend on usable friendly edges:

- two or more routes permit an orderly withdrawal and dispersal;
- one route creates congestion, pursuit losses and abandoned equipment;
- no route creates encirclement, surrender, dispersal or destruction.

A Disengage stance improves the attempt to break contact. Assault makes it more
difficult because formations are concentrated and committed forward.

## Medical outcomes

Personnel removed from combat are divided after the operation according to who
holds the battlefield and how the formation left it.

Holding the battlefield produces the best outcome: approximately 20 per cent
killed, 15 per cent critically wounded and 65 per cent recoverable wounded.
Ordered retreat, rout and encirclement progressively increase deaths and capture.

Recoverable wounded become eligible to return after approximately seven days.
Critical wounded require at least 45 days and suitable medical capacity. These
are availability dates, not guarantees of complete recovery.

Future deaths remain permanent. Captured future personnel create rescue,
interrogation and technology-security events.

## Battlefield salvage

The side holding the battlefield recovers approximately 85 per cent of broken
future suits and 95 per cent of exposed energy weapons. An orderly retreat may
recover 45 per cent of suits. Rout or encirclement abandons most equipment.

Recovered suits enter the component and repair pool. Recovery does not make them
immediately operational. Engineering formations must decide whether to repair a
damaged suit, restore a broken suit or strip it permanently for scarce parts.

Captured suits and energy weapons add technology-exposure escalation. Even a
successful withdrawal can therefore accelerate modern adaptation.

## Repeated armour transitions

Every combat day can move surviving troops through these states:

1. fully functional armour;
2. damaged armour;
3. broken armour and an unarmoured soldier with an energy rifle.

Limited field maintenance restores a small proportion of damaged suits between
combat days when supply permits. It cannot keep pace with concentrated heavy
weapons. This allows a formation to begin a battle dominant and end it badly
depleted without suffering proportionate deaths.

## Formation aftermath

At the end of an operation the campaign receives:

- active, killed, wounded and captured personnel;
- return dates for medical pools;
- functional, damaged, unarmoured and recoverable suit counts;
- recovered and captured energy weapons;
- cohesion, readiness and fatigue;
- battlefield ownership and retreat destination;
- technology exposure, civilian harm and escalation;
- occupation or resistance delay before territory control becomes valid.

These values persist. Starting a new operation immediately may preserve momentum
but commits exhausted troops before recovery and repair.

## Player presentation

The battle panel should show:

- current objective and progress;
- known friendly and estimated enemy strength;
- predicted reinforcement arrivals;
- cohesion and withdrawal thresholds;
- daily casualties and armour-state changes;
- available retreat routes;
- civilian and escalation risk;
- Continue, Reinforce, Change Stance and Withdraw decisions.

Routine operations can follow standing orders. The game pauses for player input
when reinforcement, withdrawal, general safety or catastrophic armour-loss
thresholds are reached.

## Connection to campaign time

Each battle day consumes one campaign turn. A formation in an active operation
cannot simultaneously redeploy or garrison another territory. Reinforcements
must physically travel through the campaign graph.

Medical returns, repair, resistance and control delays continue on the same
calendar. This is the link that will now feed combat delay and permanent losses
back into the 101-territory campaign simulation.
