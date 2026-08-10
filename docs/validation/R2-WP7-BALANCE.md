# R2-WP7 balance and automated playtest validation

## Validation scope

The WP7 harness drives the public campaign order APIs and gives no insertion-territory privilege or hidden enemy information. The managed policy now evaluates visible defence assessments, limits defensive reinforcement to one order per day, prepares and entrenches threatened positions, prioritises current supply needs, selects an affordable hub using occupation/logistics/resource value, repairs damaged or bottleneck routes, and records local-stock use.

The final sample contains 720 deterministic campaigns: four seeds for each of 15 insertion starts, three difficulties, and four doctrines. Campaigns ran to day 60, which was computationally practical while still exposing prolonged stalls and personnel collapse. Results were 226 defeats and 494 timeouts; there were no victories inside this horizon. This is evidence of a difficult/stalling campaign envelope, not a target win-rate failure to tune away without a product decision.

Across the 180 managed campaigns, telemetry recorded 4,604 defensive preparations, 2,713 entrenchments, 4,956 reconcentration moves, 237 engineering projects, 180 hub upgrades, 155 hub losses, 1,744 turns drawing disconnected local stocks, 6,744 supply-priority decision passes, 810 coordinated assaults, and 727 breakout operations. Every insertion start had four runs in each difficulty/doctrine cell. Standard/managed had 5 defeats and 55 timeouts; hard/managed had 29 defeats and 31 timeouts.

## Representative trace inspection

- `story-managed-hub-loss` (seed 13) captured three territories, lost four, upgraded a hub for +4 capacity, received 11 hub-value turns, then lost it while 9,854 personnel remained. The campaign continued to day 60, but ended with no controlled territory, network efficiency reaching zero, 282 cut-off formation-days, and 6,929 active personnel. This demonstrates hub value/loss, local-stock resilience and a pathological territorial collapse without an arbitrary instant defeat.
- `standard-managed-best-progress` (seed 54) reached six captures, retained three administered territories and 9,123 personnel at day 60. It used engineering, 23 preparations, 13 entrenchments, 53 reconcentrations, 35 local-stock turns, coordinated attacks, and a hub before its loss. Its 10% minimum network efficiency shows that healthy personnel does not imply healthy logistics.
- `standard-managed-cutoff-stall` (seed 17) ended in personnel collapse on day 53 after 11 captures and 12 recaptures. It started two engineering projects, lost three hubs, and issued 40 defensive reconcentrations, but repeated territorial churn and escalating infrastructure damage consumed the force. This is the clearest loss/pathology trace.
- `hard-managed-collapse` (seed 16) remained alive at day 60 with one administered territory and 5,845 personnel. Its hub survived for 56 value-turns; it used engineering, defensive preparation, entrenchment, three selective reconcentrations and 32 local-stock turns. It is an unusual long stall with significant armour but only 12% minimum network efficiency.

## Assessment and boundaries

- Aggressive play produced the most coordinated attacks but not victories; balanced play collapsed particularly often on standard and hard. No doctrine is an obvious dominant winning strategy in the tested horizon.
- Engineering is used (237 managed projects) but remains start/route-condition dependent, and some representative runs have no eligible project. It is not dead, but its campaign opportunity rate remains lower than defence and supply actions.
- Hubs materially add source capacity and often fall (155 losses in 180 managed campaigns). Hub loss is survivable and can precede later collapse rather than directly causing it.
- Local stocks repeatedly sustain disconnected formations, but zero/near-zero network efficiency and high cut-off-day totals remain common failure modes. Filtering these outcomes would hide the principal logistics pathology.
- The bot previously treated the insertion territory specially and could issue multiple defensive reinforcement choices in one decision pass. WP7 removes the special case and caps reconcentration to one formation per day, preventing uncontrolled same-day force draining while retaining visible-assessment-driven defence.
- The absence of victories by day 60 and extensive capture/recapture churn are remaining balance uncertainties. Changing capture, counterattack, escalation or victory fundamentals solely to manufacture a win rate would exceed this evidence-led WP7 correction and requires the subsequent approved audit/balance programme or product-owner direction.

Generated machine-readable reports and trace tables are written to the ignored `balance-output/` directory by `npm run simulate:current-balance` and `node scripts/trace-current-engine-balance.mjs`; this document records the reviewed, reproducible conclusions rather than committing multi-megabyte run output.
