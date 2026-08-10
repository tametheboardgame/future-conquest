# R2-WP7 balance and automated playtest validation

## Balance-blocker diagnosis

The original day-60 gate was not an acceptable completion state. It also exposed a bot defect: attack selection and strategic-reserve scoring used exact internal enemy combat power. The corrected player now consumes `getEnemyContacts`, the same public personnel ranges and confidence labels shown to a human player. Confirmed contacts use the range midpoint; incomplete contacts use a conservative 35/65 lower/upper estimate. Enemy armour, readiness and entrenchment are not inspected. This correction is deterministic and changes no save data or campaign mechanic.

The diagnosis separated policy competence from systemic balance and horizon effects:

- The corrected canonical day-60 sample still produced no victories (197 defeats and 523 timeouts). Story/aggressive nevertheless held a median seven territories with 9,064 personnel, versus story/managed's six territories and 9,121 personnel. Standard and hard collapse were therefore strongly difficulty-dependent rather than a universal inability to attack.
- Extending all 720 cells to day 120 produced **3 victories, 242 defeats and 475 timeouts**. The victories were story/aggressive from DE-05 on days 102 and 116 and story/balanced from FR-01 on day 120. All retained 8,215-8,541 active personnel. The former 60-day horizon was conclusively masking viable campaigns.
- A targeted 60-run story/aggressive extension to day 180 produced **4 victories and 56 timeouts**, with victories on days 86, 102, 116 and 158. A 60-run story/managed extension produced no victories but no defeats; its best campaign held eight territories. This demonstrates a material competence gap: concentration and operational tempo can win, while conservative occupation management stalls.
- The day-120 victories captured 40-61 territories cumulatively and suffered 26-47 recaptures before simultaneously controlling the theatre. They are strategically plausible victories under the existing mechanics, but the churn is severe and remains a balance concern rather than something hidden by filtering.

No global player buff or enemy nerf was applied. Once legitimate visible-information play and an appropriate horizon demonstrated reachability, changing mobilisation, occupation, logistics or combat parameters merely to increase the count would not be evidence-led. The remaining difficulty envelope is intentional and clear: story is demonstrably winnable, standard produced no day-120 victories and hard remained highly lethal. Further parameter changes require a larger targeted tuning sweep rather than manufacturing a preferred rate in WP7.

## Canonical 720-campaign rerun

The final sample uses four seeds for every combination of 15 insertion starts, three difficulties and four policies, and runs to day 120.

| Difficulty | Policy | Victories | Defeats | Timeouts | Median victory day | Median territories | Median active personnel | Average recaptures |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| story | aggressive | 2 | 0 | 58 | 109 | 6 | 8,344 | 44.9 |
| story | balanced | 1 | 1 | 58 | 120 | 2 | 5,710 | 23.3 |
| story | cautious | 0 | 0 | 60 | — | 2 | 6,699 | 13.5 |
| story | managed | 0 | 0 | 60 | — | 3 | 7,052 | 10.9 |
| standard | aggressive | 0 | 7 | 53 | — | 1 | 4,375 | 24.4 |
| standard | balanced | 0 | 30 | 30 | — | 0 | 622 | 8.6 |
| standard | cautious | 0 | 6 | 54 | — | 1 | 4,413 | 5.3 |
| standard | managed | 0 | 17 | 43 | — | 0 | 2,536 | 10.3 |
| hard | aggressive | 0 | 54 | 6 | — | 0 | 0 | 13.5 |
| hard | balanced | 0 | 56 | 4 | — | 0 | 0 | 4.8 |
| hard | cautious | 0 | 50 | 10 | — | 0 | 0 | 3.4 |
| hard | managed | 0 | 21 | 39 | — | 0 | 1,695 | 4.8 |

DE-05 and FR-01 were the only winning starts in the four-seed-per-cell day-120 sample. That does not establish that the other 13 starts are impossible; several reached 8-12 territories at day 60, and the longer story/aggressive sample shows strong seed and timing sensitivity. It does establish that hard/balanced is pathological for this bot (56 defeats, four timeouts), while story/aggressive is the strongest tested policy.

## Failure diagnosis and system use

Trace and aggregate inspection identified territorial recapture churn as the dominant obstacle. The player often retains substantial personnel while losing simultaneous control: the winning story/aggressive traces still endured 40 and 47 recaptures. Conservative policies compound this with occupation commitments and reduced operational tempo. Network collapse and cut-off accumulation explain many standard/hard defeats, while engineering lag and hub loss amplify rather than independently cause collapse. The visible-information correction did not reveal a pattern of newly suicidal attacks: defeat count at day 60 fell from 226 to 197, while the longer horizon exposed victories.

Across the 180 managed day-120 campaigns, real state-changing telemetry recorded 7,763 defensive preparations, 3,294 entrenchments, 7,718 reconcentration moves, 304 engineering projects, 180 hub upgrades, 192 hub losses, 3,644 local-stock draw turns, 9,183 supply-priority changes, 840 coordinated assaults and 916 breakout operations. These counters increment only when the corresponding API changes state or, for stock draws, when supply is actually delivered from a disconnected local source. The required R2 systems therefore remain active rather than being bypassed by the winning aggressive policy.

Representative inspected outcomes include:

- story/aggressive seed 41 from DE-05: victory on day 102, 54 captures, 40 recaptures, 8,349 personnel and a 14% minimum network efficiency;
- story/balanced seed 16 from FR-01: victory on day 120, 40 captures, 26 recaptures, 8,541 personnel and a 57% minimum network efficiency;
- story/managed seed 55 from DE-03 at day 180: eight territories, 17 captures, 10 recaptures and 8,363 personnel, demonstrating conservative-policy stall rather than force collapse;
- hard/managed campaigns: median zero controlled territories and 1,695 personnel at day 120, demonstrating that defence and logistics actions do not neutralise hard-mode pressure.

Machine-readable reports remain in ignored balance-output directories. This document records the reviewed results; generated multi-megabyte outputs are intentionally not committed.
