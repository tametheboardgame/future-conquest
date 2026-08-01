# Logistics simulation findings v0.1

## Purpose

This simulation tests whether the map, movement, garrison and supply assumptions
can support a campaign. It does not estimate who wins battles. Enemy strength,
casualties, escalation, diplomacy and resistance have intentionally been left
out until their own systems are defined.

## Test coverage

- 808 deterministic runs.
- Every one of the 101 territories tested as the random portal location.
- Four future-army sizes: 100,000, 50,000, 25,000 and 10,000.
- Two occupation policies: future troops only, or transfer of 90 per cent of
  routine garrison duty to integrated local forces after ten days.
- A 365-turn ceiling, with logistics-first expansion across the complete map.

## Results

With integrated local forces, every army size can theoretically cover the full
map. Median movement-envelope completion times are:

- 100,000 troops: 36 days.
- 50,000 troops: 52 days.
- 25,000 troops: 69 days.
- 10,000 troops: 206 days.

These figures are deliberately not campaign-length predictions. They are the
fastest plausible geographic envelope before combat, political delay and enemy
adaptation are introduced.

Without local-force integration:

- 100,000 and 50,000 troops can provide abstract garrisons across the map.
- 25,000 troops stall at a median of 45 territories.
- 10,000 troops stall at a median of 10 territories.

The 10,000-troop setting commonly pauses while newly captured local forces take
over rear-area duties. This is a desirable identity for Desperate mode, provided
the interface clearly explains why expansion has stopped and how to resolve it.

## Finding 1: modern forces are essential

Recruiting, coercing or negotiating the service of modern forces cannot be an
optional bonus. It is a core victory mechanism, particularly for Veteran and
Desperate modes. Local forces should perform garrison, policing, logistics and
rear-area security roles while irreplaceable future troops remain concentrated
for decisive operations.

This creates useful political risk. A local handover should depend on loyalty,
legitimacy, command relationships and adequate supply. The simulation assumes a
successful handover and therefore represents the optimistic case.

## Finding 2: first-pass supply is too forgiving

No scenario fell into Low, Critical or Isolated supply. The fourteen-day portal
reserve lasts long enough for captured territorial capacity to activate, after
which aggregate supply grows faster than demand.

This means the supply-state system is structurally sound but its first values do
not yet create the intended pressure. Tuning it immediately would be premature,
because realistic combat delay and corridor disruption have not been modelled.
The next simulation should add:

- enemy resistance and time required to secure administrative centres;
- casualties and damaged-armour recovery;
- limited throughput across long supply paths;
- bridge, tunnel, port and rail disruption;
- civilian demand competing for the same transport capacity;
- local-force loyalty and supply demand;
- escalation that increases enemy pressure over time.

## Design decisions retained

1. One turn remains one day.
2. The four army-size settings remain viable as distinct campaign experiences.
3. Desperate mode requires local-force integration and deliberate operational
   pauses; this is a feature rather than an arbitrary numeric penalty.
4. Future-only conquest remains theoretically possible with 50,000 or 100,000
   troops, but will become less credible once combat casualties are included.
5. Supply values remain provisional until the combat and resistance model can
   test them under meaningful pressure.

## Next work package

Define strategic formations, combat resolution, enemy resistance bands and the
conversion of casualties and equipment damage into persistent campaign losses.
