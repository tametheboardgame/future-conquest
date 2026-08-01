# Movement and supply rules v0.1

## Design objective

Movement must make geography matter without requiring the player to route every
truck or count individual tonnes of supplies. The player makes three decisions:
where to concentrate scarce forces, which corridors to secure, and how far an
advance can safely outrun its support network.

One turn represents one day. Every formation receives six operation points.
Entering a territory normally costs two to four points according to terrain,
with additional costs for hostile control, severe winter conditions and denied
crossings. This permits rapid movement through secure lowlands but makes major
mountain ranges, Arctic regions and contested approaches operational decisions.

## Movement modes

### Ordinary movement

- Open and mixed lowland: 2 operation points.
- Mixed upland: 3 operation points.
- Mountainous or subarctic: 4 operation points.
- Entering contested territory: +1 point.
- Entering hostile territory: +2 points.
- Active severe or extreme winter: +1 or +2 points.

The formation may spend remaining points on another move or an action. Combat,
forced movement and detailed stance rules will be defined during the formation
and combat pass.

### Strategic redeployment

A formation in full or strained supply may move up to three friendly edges in a
turn when both ends have a friendly, operational hub of capacity 3 or greater
and the complete path is secure. Redeployment consumes the formation's entire
turn. Railways and commandeered vehicles provide the movement; the future army
does not gain magical transport.

Sea movement always requires controlled ports and sufficient commandeered
shipping. A route on the map indicates possibility, not automatic availability.

## Supply model

Supply is expressed as abstract throughput points. Each territory has a baseline
capacity derived from urbanisation, its strongest transport hub, additional hubs,
selected ports and selected airports. A formation consumes demand according to
its size and type. Future infantry is relatively efficient; modern mechanised,
air and naval formations impose much heavier transport demand.

Supply traces through contiguous friendly territory to controlled sources and
hubs. Contested territory can transmit limited supply at increased cost. Hostile
territory cannot transmit supply unless a specific operation establishes a
temporary corridor.

The interface presents five readable states:

- Full: no penalty.
- Strained: minor readiness and armour-maintenance pressure.
- Low: reduced movement, readiness and increased armour wear.
- Critical: severe movement and combat penalties.
- Isolated: survival mode, maximum wear and no strategic redeployment.

The player may automate distribution by priority. Manual control sets formation
priority and reserve levels, but does not allocate individual supply categories.

## Crossing denial

Denial has three strategic outcomes:

1. Edge disabled: fixed links and short-sea routes with no available alternative
   become unusable until repaired or shipping is restored.
2. Major penalty: tunnels, bridges, straits and narrow passes retain a difficult
   alternative but sharply reduce movement and supply capacity.
3. Moderate penalty: broad mountain corridors, river valleys and land gaps slow
   movement without severing the territory edge.

Whether a crossing is open, damaged, controlled or complete comes from World
State and campaign events. The permanent map supplies only its existence and
potential strategic effect.

## Armour depletion connection

Supply directly affects the second depletion curve. Poorly supplied formations
cannot inspect, recharge and repair their powered armour effectively. Armour wear
therefore rises from 1.15 times normal under strain to three times normal when
isolated. This makes reckless advances costly even when casualties remain low.

## Balancing position

All numeric values are first-pass simulation inputs. They establish relationships
rather than final difficulty. The next prototype must test whether a 50,000-person
standard army can sustain a decisive advance while still leaving enough strength
to hold captured territory.
