# Modern formation simulation findings v0.1

## Test envelope

The simulation ran 1,212 campaigns:

- every one of the 101 portal territories
- three deterministic seeds per start
- all four future army sizes
- a maximum of 500 campaign days

All modes used the same negotiated occupation, mobilisation, loyalty and combat rules. Army size changed future task groups and command bandwidth only.

## Results

After the final pacing pass, the generated summary is authoritative. The important pre-publication result was that Desperate campaigns changed from zero completion in the integrated v0.1 model to universal completion in this isolated formation test, with a median close to 265 turns. Modern formations led roughly four fifths of successful territorial operations in that mode.

The result demonstrates mechanical feasibility, not final balance. It shows that a small future army can complete Europe when contemporary brigades can capture objectives themselves. It does not justify replacing the operational resolver with this reduced model.

## What changed

The previous integrated campaign treated local forces as garrison relief plus a bounded power contribution. That design could reduce the future force's burden but could never create another manoeuvre element. Once too few future task groups remained, territorial expansion stopped regardless of local support.

Independent units remove that hard ceiling. Newly aligned brigades can:

- conduct an operation without future troops
- lead a combined operation
- recover between engagements
- lose personnel and equipment permanently
- refuse expeditionary orders
- defect when loyalty collapses

Desperate mode is therefore no longer dependent on a hidden support multiplier.

## Balance signals

- Modern formations lead progressively more battles as future army size falls. This is the intended mode identity.
- Modern casualties are substantial. The coalition is powerful but not free.
- Negotiated occupation produces relatively few defections. Coercive occupation must be tested in the escalation package before loyalty values are considered stable.
- Campaign and Standard modes still rely heavily on future spearheads early, then transfer conventional work to modern units.
- Supply pressure is greatest for the largest initial army because the portal force arrives before a continental supply base exists.

## Required next integration

The next combat integration must preserve:

- formation identity and national ownership
- separate modern personnel and equipment losses
- order refusal before commitment
- route-aware retreat and capture
- medical recovery and replacement caps
- salvage determined by battlefield possession
- loyalty effects from casualties, defeat and civilian policy

It must also prevent an allied brigade from being silently converted back into a numeric support pool.

## Remaining uncertainty

The current mobilisation pools are deliberately synthetic. Dated force locations, reserve systems, alliance posture, air and naval availability, and ongoing real conflicts belong to the World State data package. Until those exist, these results validate system structure and campaign pacing rather than historical force accuracy.
