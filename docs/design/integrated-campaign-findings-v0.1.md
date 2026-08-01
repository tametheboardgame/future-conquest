# Integrated campaign findings v0.1

## Test coverage

The simulation ran 1,212 complete campaign attempts:

- all 101 portal locations;
- three seeded runs per location;
- 100,000, 50,000, 25,000 and 10,000 future troops;
- up to 500 campaign days;
- the approved negotiated-integration occupation model.

## Campaign mode, 100,000 troops

- Completion rate: 100 per cent.
- Median completion: 69 turns.
- Target-range result: 99.7 per cent.
- Median killed: 662.
- Median functional armour remaining: 87,728.
- Median damaged armour: 10,516.
- Median battles lost: 6.

The army experiences the most severe opening supply pressure, reaching a median
minimum of 29.3 per cent, but its depth allows simultaneous operations and
substantial repair capacity.

## Standard mode, 50,000 troops

- Completion rate: 100 per cent.
- Median completion: 104 turns.
- Target-range result: 100 per cent.
- Median killed: 778.
- Median functional armour remaining: 42,380.
- Median damaged armour: 6,074.
- Median battles lost: 6.

This is currently the strongest baseline for the intended standard experience.
It finishes within the target while retaining meaningful personnel, supply and
armour pressure.

## Veteran mode, 25,000 troops

- Completion rate: 99.3 per cent.
- Median completion: 149 turns.
- Target-range result: 91.7 per cent.
- Median killed: 1,214.
- Median functional armour remaining: 18,084.
- Median damaged armour: 4,721.
- Median battles lost: 12.

Veteran mode now produces a recognisably harder campaign. Portal location and
battle variance can prevent victory, while successful campaigns retain only
around 72 per cent of the original army in functional armour.

## Desperate mode, 10,000 troops

- Completion rate: 0 per cent.
- Median territories controlled: 48.
- Median killed: 2,040.
- Median functional armour remaining after 500 turns: 1,183.
- Median damaged armour: 5,970.
- Median battles lost: 38.

Desperate mode cannot complete because future-led task groups eventually lack
the power to conduct late-war operations. Increasing modern support multipliers
does not solve this coherently. The mode requires captured or allied modern
formations that can independently seize objectives while the remaining future
troops act as command, breakthrough and specialist forces.

This is consistent with the approved identity of Desperate mode. It is not a
reason to make future troops stronger or reduce late-war resistance artificially.

## Persistent depletion

The integrated model confirms both depletion curves:

- personnel losses rise as the starting force becomes smaller;
- routine wear, battle damage and finite components steadily reduce functional
  armour even when wounded personnel return.

Medical recovery prevents every casualty becoming a permanent death, but troops
often return in a weaker armour state. Winning therefore does not reset a
formation to its pre-battle condition.

## Decision

Campaign, Standard and Veteran are mechanically coherent enough to retain their
current values. Desperate mode is intentionally left unresolved until modern
forces become independent campaign formations.

The next package should implement allied and coerced modern formations, including
loyalty, national restrictions, equipment, supply demand, refusal, defection and
independent combat losses.
