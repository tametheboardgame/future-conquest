# Logistics simulation findings v0.2

## Scope

Version 0.2 absorbs the approved Core Mechanics Review and repeats the complete
portal-location sweep. It runs 1,616 scenarios across four army sizes, all 101
starting territories and four occupation approaches.

The model now includes:

- the complete territory-control requirements at an abstract level;
- seven-turn captured-capacity activation with only ten per cent immediately
  available;
- seven days of portal reserves rather than fourteen;
- civilian reservation of local supply and transport capacity;
- seven per cent effective supply loss per territory edge, with a floor for
  established long-distance networks;
- supply demand from integrated modern garrisons;
- loyalty-related future reserve requirements;
- resistance and consolidation time associated with occupation conduct;
- supply-state effects on operational progress and armour wear.

It remains a geographic and logistics envelope, not a combat prediction.

## Negotiated-integration result

The accepted baseline approach, negotiated integration with up to 90 per cent
local handover after ten days, produces these median completion envelopes:

- 100,000 troops: 78 turns, target 60 to 100.
- 50,000 troops: 106 turns, target 90 to 150.
- 25,000 troops: 137 turns, target 140 to 220.
- 10,000 troops: 348 turns, target 220 to 365.

Every starting territory completes under this profile. Veteran mode is only
three turns below its target and should naturally enter the range when actual
combat delay is introduced. Further logistics padding would therefore be
artificial.

## Supply pressure

Supply now matters:

- The 100,000-troop baseline reaches a median minimum of 21.7 per cent supply
  and spends eleven turns in Low, Critical or Isolated supply.
- The 50,000-troop baseline reaches 46.1 per cent and spends three turns in Low
  or worse supply.
- The smaller armies avoid aggregate supply crisis but are constrained by
  personnel, garrison and time instead.

This gives each army size a different operational problem. Larger forces strain
the opening supply network; smaller forces can feed themselves but cannot be
everywhere at once.

## Occupation conduct

The simulation now produces a mechanical benefit for restraint:

- Negotiated integration keeps every army size viable.
- Coercive integration remains viable for 25,000 or more troops but the
  10,000-troop force stalls at a median of 48 territories.
- Brutal occupation considerably lengthens campaigns and leaves the
  10,000-troop force at a median of 27 territories.
- Future-only occupation still leaves 25,000 troops around 50 territories and
  10,000 troops around 13 territories.

This supports the intended tone. Restraint is not a morality bonus detached from
strategy; it preserves cooperation, frees future troops and shortens the war.
Brutality may offer later short-term tactical advantages, but it damages the
player's ability to govern and sustain expansion.

## Armour wear

Routine and supply-related wear reaches a median of approximately:

- 4.3 per cent for 100,000 troops;
- 5.4 per cent for 50,000 troops;
- 6.9 per cent for 25,000 troops;
- 17.4 per cent for 10,000 troops.

This is wear before combat damage. Desperate mode therefore begins to express
the intended second depletion curve even during a successful campaign.

## Decision

The accepted mechanics are internally coherent enough to proceed. No further
logistics-rule redesign is required before formations and combat are defined.
The combat package must now add the delays and losses that logistics alone
cannot credibly estimate.
