# Escalation and occupation v0.1

## Purpose

Conquering a territory and successfully governing it are different achievements. This package separates local occupation from the global response to the invasion.

The player is always an aggressor from the perspective of the present-day world. Restraint can delay and limit the response, but controlling more of Europe creates an unavoidable escalation floor. The world does not simply accept total conquest because the player avoided conspicuous atrocities.

## Local occupation state

Every controlled territory has its own:

- legitimacy
- resistance
- administration age
- supply activation
- infrastructure damage
- resistance incidents and uprisings
- occupation policy

Territories progress through four readable states:

1. Contested, the strategic centre may be held but administration is not functioning.
2. Controlled, organised resistance is contained but future troops still carry much of the burden.
3. Administered, supply and civil government function reliably.
4. Integrated, legitimacy and security are sufficient for dependable modern mobilisation.

Control can move backwards. Shortages, coercion, casualties and resistance attacks can reduce legitimacy or increase resistance. A sufficiently unstable territory can revolt and leave the player's control.

## Occupation policies

### Negotiated transition

The existing government or an accepted successor retains civil authority under a settlement. It has the slowest initial activation but the strongest legitimacy, lowest resistance and most reliable modern formations.

### Client government

A compliant local administration provides faster control but is seen as dependent on the invader. It offers a workable middle course, with greater resistance and faster global escalation.

### Military administration

Future forces impose direct rule. Immediate supply access is fastest, but legitimacy is low, resistance grows, garrison demand remains high and contemporary forces are reluctant to serve outside their home area.

These are starting structures rather than irreversible alignments. Later event design should allow a territory to transition between them.

## Civilian needs

Twenty-five per cent of usable territorial capacity is protected for civilian demand before military throughput is calculated. A shortage causes:

- falling legitimacy
- rising resistance
- additional global escalation

Humanitarian relief consumes capacity that could otherwise support operations, but restores legitimacy and reduces both resistance and escalation. This makes food, water, power and medical access strategic resources without turning the game into commodity accounting.

## Resistance

Resistance is a pressure system rather than a stack of invisible enemy armies. Higher resistance increases the chance of:

- attacks on supply and infrastructure
- disruption of local administration
- modern-force refusals
- open uprising when legitimacy is also very low

Security action can reduce resistance quickly but may damage legitimacy and raise escalation. Negotiation and relief work more slowly but improve the political foundation of control.

## Global escalation

Global escalation is a 0 to 100 track. It is influenced by:

- the proportion of Europe controlled
- occupation policy
- civilian harm and shortages
- destroyed critical infrastructure
- captured future weapons and armour
- resistance suppression
- player diplomatic and humanitarian responses

Escalation stages are:

- 0 to 14: local response
- 15 to 24: monitoring
- 25 to 39: sanctions
- 40 to 59: material support
- 60 to 74: limited intervention
- 75 to 87: coalition war
- 88 to 100: strategic crisis

Each stage strengthens resistance to further conquest and, from sanctions onwards, reduces the player's effective supply access. At limited intervention, outside powers including the United States begin reinforcing the European defence at recurring intervals.

The meter decays slowly when immediate provocations stop, but it cannot fall below the political floor created by the amount of Europe already controlled. At full conquest, even the most restrained campaign remains at material-support level or above.

## Nuclear and strategic danger

Nuclear danger begins only above 92 escalation. Reaching this threshold does not guarantee an immediate nuclear attack. It creates a daily strategic-crisis risk that rises towards a capped maximum.

A strategic strike is linked to the physical general defeat condition. The intended counterplay is to avoid the threshold, reduce escalation, disperse command signatures and use civilian-risk constraints. Detailed targeting and warning mechanics belong in the later general and intelligence package.

Nuclear weapons are not conventional damage events and should never become a routine late-game attrition mechanic.

## Player information

The interface should show:

- current global escalation and stage
- the next threshold and its known consequences
- recent causes of escalation change
- each territory's legitimacy, resistance and occupation state
- predicted political consequences before confirming a policy or operation
- intervention and strategic-crisis warnings

Exact nuclear probability should remain uncertain unless intelligence quality is high. The existence and direction of the risk must always be clear.

## Integration points

The occupation model supplies loyalty and mobilisation conditions to independent modern formations. The escalation model supplies enemy reinforcement, air and naval pressure, sanctions and technology adaptation to campaign combat and logistics.

The dated World State will eventually replace generic outside intervention with actual alliances, national decisions, force availability and nuclear doctrine.
