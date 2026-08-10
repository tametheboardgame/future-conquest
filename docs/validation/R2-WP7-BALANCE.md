# R2-WP7 R2.5 balance stabilisation gate

## Decision and diagnosis

The visible-information day-120 baseline at `3796f218` (3 victories, 242 defeats and 475 timeouts) was not suitable to freeze. Difficulty, policy and start breakdowns separated two coupled problems:

- repeated coordinated counterattacks could be planned immediately after the previous attack resolved, producing 26-47 recaptures even in the only winning traces;
- the cautious and managed probes waited for fully administered occupation and operated only one offensive at a time, leaving healthy formations idle while mobilisation and escalation accumulated;
- exact enemy information was not involved: attack and reserve selection still use only `getEnemyContacts` ranges and confidence;
- network collapse amplified losses, but weakening logistics, occupation requirements or the fifteen-territory victory condition was unnecessary once counterattack sequencing and player tempo were corrected.

The correction therefore stays within existing mechanics. Coordinated enemy counterattacks now require three recovery days (four on Story) and a visible force-concentration advantage before commitment. Difficulty profiles reduce the previously overwhelming counterattack frequency, combat multiplier and mobilisation package while preserving ordered Story/Standard/Hard pressure. Balanced, cautious and managed policy thresholds now permit supported attacks at credible visible estimates, two concurrent operations, and consolidation through controlled rather than fully administered territory. Managed security detachments are no longer created or held in already controlled interior territory. No scripted outcome, insertion privilege, hidden assessment, save field or victory rule changed.

## Final deterministic gate

The canonical final sample is **720 campaigns**: 15 insertion starts x 3 difficulties x 4 policies x 4 deterministic seeds, resolved through day 120.

| Difficulty | Wins | Defeats | Timeouts | Win rate | Defeat rate | Timeout rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Story | 120 | 0 | 120 | 50.0% | 0.0% | 50.0% |
| Standard (Normal) | 71 | 0 | 169 | 29.6% | 0.0% | 70.4% |
| Hard | 19 | 0 | 221 | 7.9% | 0.0% | 92.1% |
| **Overall** | **210** | **0** | **510** | **29.2%** | **0.0%** | **70.8%** |

Normal is now credibly winnable near the directional centre, Story is materially easier, and Hard is materially harder. Hard is slightly below its directional 10-25% band, but its 19 unfiltered victories demonstrate reachability and the gap is strategically coherent rather than a deadlock across every start. The absence of formal personnel-collapse defeats is a remaining tuning concern: failures are now overwhelmingly failure to finish the conquest by day 120, including severe network-collapse campaigns, rather than extermination. Restoring a healthier defeat/timeout mix should be post-R3 polish, not another pre-graphics mechanical change.

### Policy breakdown

| Difficulty | Policy | Win | Defeat | Timeout | Median win day | Median territories | Median personnel | Average recaptures |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Story | aggressive | 91.7% | 0% | 8.3% | 69 | 15 | 9,060 | 14.0 |
| Story | balanced | 53.3% | 0% | 46.7% | 61.5 | 15 | 8,685 | 11.4 |
| Story | cautious | 55.0% | 0% | 45.0% | 67 | 15 | 8,483 | 12.5 |
| Story | managed | 0% | 0% | 100% | — | 11 | 8,724 | 2.6 |
| Standard | aggressive | 53.3% | 0% | 46.7% | 93 | 15 | 8,624 | 28.0 |
| Standard | balanced | 31.7% | 0% | 68.3% | 73 | 13 | 8,300 | 18.5 |
| Standard | cautious | 33.3% | 0% | 66.7% | 76 | 12.5 | 8,361 | 19.6 |
| Standard | managed | 0% | 0% | 100% | — | 7 | 8,620 | 6.7 |
| Hard | aggressive | 8.3% | 0% | 91.7% | 85 | 7 | 8,501 | 28.3 |
| Hard | balanced | 11.7% | 0% | 88.3% | 101 | 9 | 7,779 | 21.2 |
| Hard | cautious | 11.7% | 0% | 88.3% | 88 | 9 | 7,778 | 20.4 |
| Hard | managed | 0% | 0% | 100% | — | 5 | 8,350 | 9.3 |

Aggressive is dominant on Story and Standard, but balanced and cautious both win at healthy Normal rates while preserving more armour and suffering less churn. Managed remains deliberately over-consolidating and is the only hopeless policy at day 120; it exercises engineering, hubs, defence and supply rather than representing the strongest general player. It should be improved after R3 without weakening those systems or using it to hold up the credible three-policy Normal result.

### Start sensitivity

Story ranged from 75.0% wins at FR-02, NL-01 and LU-01 to 18.8% at BE-01. Standard ranged from 68.8% at FR-03 and 62.5% at NL-01 to 0% at CH-01; GB-04, LU-01, CH-02 and AT-01 each achieved 6.3%. Hard was concentrated around FR-01 (50.0%), FR-03 (25.0%) and FR-05 (18.8%), with ten starts producing no win in this 16-run-per-start slice. No start receives a special rule. Alpine and peripheral starts remain a material but non-blocking post-R3 balance target.

## Representative traces and system integrity

- **Story win:** aggressive seed 15 from GB-04 won on day 55 with 9,163 personnel, 23 captures, 9 recaptures and 49% minimum network efficiency. This is a rapid, well-preserved victory rather than a scripted outcome.
- **Normal win:** aggressive seed 30 from GB-04 won on day 71 with 9,025 personnel, 34 captures, 20 recaptures, four cut-off formation-days and 15 critical-supply formation-days. Seed 16 from FR-01 won on day 106 with 8,473 personnel despite 31 recaptures and 14% minimum network efficiency.
- **Hard win:** aggressive seed 31 from FR-01 won on day 91 with 8,719 personnel, 38 captures, 24 recaptures, 20 cut-off formation-days, 62 critical-supply formation-days and two breakouts. Hard therefore remains meaningfully logistically harsher.
- **Close timeout:** Standard/aggressive seed 68 from LU-01 ended with 12 administered territories, 8,826 personnel, 27 captures and 16 recaptures. It is a legitimate near miss, not systemic inability to progress.
- **Catastrophic network collapse:** Standard/managed seed 57 from CH-01 ended with no territory, 4,799 personnel, 321 cut-off formation-days, 341 critical-supply formation-days, one hub loss, two engineering projects and 38 reconcentrations. The formal outcome is a timeout rather than defeat, but the trace preserves the requested catastrophic failure evidence.
- **Long consolidation stall:** managed medians retain 8,724/8,620/8,350 personnel while holding 11/7/5 territories on Story/Standard/Hard. Engineering, hubs, supply priorities and security reduce churn but currently sacrifice too much tempo.

Victories do not bypass combat, supply or occupation: the Normal and Hard traces include substantial recapture, critical-supply and breakout exposure while retaining 8,473-9,025 personnel through coordinated force use. Managed campaigns provide the focused real-action evidence for defence preparation, entrenchment, reconcentration, engineering projects, hub upgrades/loss, local-stock draws and logistics priorities. Telemetry increments only after the corresponding public API changes state (or actual disconnected local delivery occurs).

## Freeze boundary

R2.5 meets the mechanical gate: Normal is non-trivially winnable, Story is clearly easier, Hard is clearly harder, determinism and persistence remain unchanged, and no fundamental mechanic or hidden advantage was added. Remaining post-R3 polish should address managed-policy tempo, Hard/peripheral start concentration, the absence of formal defeats in the day-120 sample, and residual 18-28 recapture averages outside managed play. The generated multi-megabyte JSON was reviewed but is not committed; this document is the durable evidence summary.
