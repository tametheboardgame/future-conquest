# R2-WP3 - Territory Resources, Stockpiles & Logistics Hubs

Status: ACTIVE

Objective: make territory-level resources and logistics meaningfully visible and strategically consequential, including local resilience when formations are disconnected from the main network.

Acceptance criteria:

- expose the meaningful territory/resource dimensions: Food, Industry, Energy, Transport, Medical and Military Stores;
- territories can hold meaningful local stocks/reserves rather than all supply behaviour being abstract/global;
- disconnected forces can continue operating from available local stocks for a limited period rather than failing instantly;
- logistics hubs can be constructed and/or upgraded where geography, local resources and the strategic network justify them;
- hub capability must have persistent strategic value to supply movement, resilience or throughput;
- hub loss must matter materially without creating an arbitrary instant-defeat state;
- resource, stockpile and hub behaviour must integrate with existing logistics/network systems rather than creating a parallel disconnected model;
- the UI must make the relevant resource/stock/hub state understandable enough for the player to make informed decisions;
- save/load compatibility must be preserved for supported saves.

Validation expectations:

- focused resource/stockpile/hub regressions;
- logistics and route interaction regressions;
- save/load migration coverage;
- full repository tests and production build;
- deterministic campaign simulations and representative traces sufficient to show disconnected-force behaviour, hub value and hub-loss consequences are functioning as intended.
