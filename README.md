# Future Conquest

A serious, turn-based strategy game about a finite future army invading present-day Europe to change history.

Every tactical victory consumes irreplaceable soldiers and powered armour while the modern world mobilises, adapts and escalates. If the invasion succeeds, the player discovers that it created the future it was intended to prevent.

## Current status

Pre-production and game-system design.

- Phase 1, Game Identity and Vision: approved foundation
- Phase 2, European Campaign Map: research draft and 101-territory catalogue prepared
- Next milestone: first rendered Standard Campaign territory map

## Design documents

- [Phase 1: Game Identity and Vision](docs/design/phase-01-game-identity.md)
- [Phase 2: European Campaign Map Design](docs/design/phase-02-map-design.md)
- [Design Decision Register](docs/research/decisions.md)
- [Research Source Register](docs/research/sources.md)
- [World State Overview](docs/world-state/overview.md)

## Campaign data

- [Standard territory catalogue](data/authored/territories-standard.csv)
- [Authored data rules](data/authored/README.md)
- [Source manifest requirements](data/source-manifests/README.md)

## Development principle

The game will use permanent strategic territory geometry combined with dated, versioned World States. Political control, alliances, conflicts and military capability can therefore change without redrawing the campaign map.


## Current playable systems

- Phase VIII-A: Escalation, Mobilisation and Enemy Command
- Five visible escalation stages, reinforcement arrival timelines, assessed enemy intent and confidence-rated intelligence
- Save version 5 with automatic migration from versions 4, 3 and 2

See [Phase VIII-A design](docs/design/phase-08-a-strategic-response.md).
