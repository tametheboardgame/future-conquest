# Escalation and occupation simulation findings v0.1

## Test envelope

The simulation ran 3,636 campaigns:

- all 101 portal locations
- three deterministic seeds per start
- all four future army settings
- restrained, pragmatic and coercive strategies
- a maximum of 500 campaign days

The test isolates occupation and escalation consequences. It uses a reduced campaign combat resolver, so the independent modern-formation package remains authoritative for campaign-length balance.

## Restrained strategy

Negotiated government, humanitarian priority and limited infrastructure destruction consistently keep escalation below direct intervention. At full conquest, the territorial-control floor still raises the median peak to approximately 42, the material-support stage.

This confirms the intended principle: restraint buys time and prevents the worst response, but cannot make conquest politically invisible.

Across the four settings, resistance incidents remain comparatively rare, uprisings are absent at the median and contemporary forces remain politically usable. This is the safest route for Veteran and Desperate campaigns.

## Pragmatic strategy

Client governments and moderate civilian protection accelerate occupation but usually bring direct intervention:

- Campaign reaches limited intervention at a median peak near 70.
- Standard reaches coalition war near 78.
- Veteran reaches limited intervention near 72.
- Desperate reaches coalition war near 79 and only about half the runs finish within 500 days.

The same policy becomes more dangerous for smaller armies because the campaign lasts longer, creating more resistance incidents and more time under foreign intervention.

## Coercive strategy

Direct military administration produces the strongest early access but causes a strategic crisis in every setting. It generates extensive modern-force refusals, resistance attacks, foreign reinforcements and nuclear-risk days.

Completion deteriorates sharply as the future army becomes smaller. Veteran almost never finishes and Desperate never finishes. Campaign can sometimes force a victory before the combined political and military consequences become fatal, but does so with severe future casualties and a material chance of losing the general to strategic attack.

This is intentionally a high-risk path rather than an alternative optimum.

## Nuclear calibration

The strategic-strike risk is capped at 0.3 per cent per crisis day. This creates serious cumulative danger during a prolonged crisis without making crossing the threshold an automatic defeat.

Only coercive strategies routinely enter the nuclear-risk band. Pragmatic campaigns touch it rarely; restrained campaigns do not reach it in this test.

The figures are provisional gameplay values. Country-specific doctrine and warning behaviour must come from the World State and later escalation events.

## Decisions

- Keep occupation and escalation as separate state machines.
- Keep the full-conquest escalation floor at material support.
- Permit direct intervention from 60 escalation.
- Begin strategic nuclear risk above 92, with a low capped daily probability.
- Make contemporary mobilisation depend on integrated territory, not control alone.
- Make civilian shortages politically and strategically harmful.
- Retain coercive occupation as a fast but usually self-defeating option for small armies.
- Show forecast political consequences before player confirmation.

## Required next integration

The final foundation pass should connect these rules to the multi-day combat and independent modern-formation systems. In particular:

- battle outcomes must generate civilian harm and technology exposure
- intervention must create actual foreign formations rather than only multipliers
- resistance must damage named supply links and hubs
- modern loyalty must inherit local legitimacy and occupation history
- territory loss must reopen movement, garrison and supply calculations

After that integration and a final review, the current foundation can be merged and the playable vertical slice can begin.
