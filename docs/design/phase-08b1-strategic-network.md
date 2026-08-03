# Phase VIII-B1 — Strategic network foundation

Status: implemented foundation  
Scope: current 15-territory campaign

## Purpose

Phase VIII-B1 introduces the data and interface foundation required for route-based movement, logistics, infrastructure disruption and later continental expansion.

The existing adjacency-based movement and binary connected-supply mechanics remain active in this release. They are retained deliberately so the network can be validated before it becomes authoritative.

## Network model

The vertical-slice theatre now contains:

- 32 strategic nodes;
- 36 explicit route edges;
- at least one node in every active territory;
- at least one route for every existing territory adjacency;
- parallel routes on selected high-capacity corridors.

Node types:

- capitals;
- major cities;
- ports;
- airports and air hubs;
- rail hubs;
- strategic crossings;
- logistics hubs.

Route types:

- road corridors;
- rail corridors;
- ferry routes;
- tunnels;
- mountain crossings;
- major river crossings.

Each route stores:

- origin and destination nodes;
- origin and destination territories;
- movement time;
- general capacity;
- supply capacity;
- heavy-armour suitability;
- persistent condition state.

## Persistent route state

Campaign save version 6 stores a state record for every route:

- open;
- damaged;
- blocked;
- destroyed;
- condition percentage;
- capacity modifier.

Older campaigns are migrated automatically and receive a complete open network.

## Interface

The command-map layer control now includes independent switches for:

- strategic routes;
- cities and hubs;
- ports;
- airports.

The selected-territory intelligence card lists local infrastructure and connected corridors.

## Deferred to later VIII-B increments

This release does not yet:

- calculate movement time from route properties;
- enforce route capacity;
- calculate supply throughput through the network;
- allow route demolition, interdiction or repair;
- give enemy command route-aware planning;
- introduce sea or air transport mechanics.

Those systems will use this canonical network rather than adding a second data model.
