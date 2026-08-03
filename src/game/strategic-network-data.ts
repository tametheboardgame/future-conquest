import type { StrategicNodeDefinition, StrategicRouteDefinition } from './types';

export const STRATEGIC_NODES: StrategicNodeDefinition[] = [
  { id: 'N-LONDON', name: 'London', territoryId: 'GB-04', type: 'capital', position: [-0.1276, 51.5072], importance: 3, supplyCapacity: 5 },
  { id: 'N-DOVER', name: 'Dover', territoryId: 'GB-04', type: 'port', position: [1.3134, 51.129], importance: 2, supplyCapacity: 3 },
  { id: 'N-HEATHROW', name: 'Heathrow air hub', territoryId: 'GB-04', type: 'airport', position: [-0.4543, 51.47], importance: 2, supplyCapacity: 3 },
  { id: 'N-RENNES', name: 'Rennes', territoryId: 'FR-01', type: 'city', position: [-1.6778, 48.1173], importance: 2, supplyCapacity: 3 },
  { id: 'N-BREST', name: 'Brest', territoryId: 'FR-01', type: 'port', position: [-4.4861, 48.3904], importance: 2, supplyCapacity: 2 },
  { id: 'N-PARIS', name: 'Paris', territoryId: 'FR-02', type: 'capital', position: [2.3522, 48.8566], importance: 3, supplyCapacity: 5 },
  { id: 'N-CALAIS', name: 'Calais', territoryId: 'FR-02', type: 'port', position: [1.8587, 50.9513], importance: 3, supplyCapacity: 4 },
  { id: 'N-LILLE', name: 'Lille', territoryId: 'FR-02', type: 'rail-hub', position: [3.0573, 50.6292], importance: 2, supplyCapacity: 4 },
  { id: 'N-STRASBOURG', name: 'Strasbourg', territoryId: 'FR-03', type: 'city', position: [7.7521, 48.5734], importance: 2, supplyCapacity: 4 },
  { id: 'N-METZ', name: 'Metz', territoryId: 'FR-03', type: 'rail-hub', position: [6.1757, 49.1193], importance: 2, supplyCapacity: 3 },
  { id: 'N-LYON', name: 'Lyon', territoryId: 'FR-05', type: 'city', position: [4.8357, 45.764], importance: 2, supplyCapacity: 4 },
  { id: 'N-LYON-AIR', name: 'Lyon air hub', territoryId: 'FR-05', type: 'airport', position: [5.0811, 45.7256], importance: 1, supplyCapacity: 2 },
  { id: 'N-DIJON', name: 'Dijon logistics hub', territoryId: 'FR-05', type: 'logistics', position: [5.0415, 47.322], importance: 2, supplyCapacity: 3 },
  { id: 'N-BRUSSELS', name: 'Brussels', territoryId: 'BE-01', type: 'capital', position: [4.3517, 50.8503], importance: 3, supplyCapacity: 5 },
  { id: 'N-ANTWERP', name: 'Antwerp', territoryId: 'BE-01', type: 'port', position: [4.4025, 51.2194], importance: 3, supplyCapacity: 5 },
  { id: 'N-NAMUR', name: 'Namur', territoryId: 'BE-02', type: 'city', position: [4.8718, 50.4674], importance: 2, supplyCapacity: 3 },
  { id: 'N-AMSTERDAM', name: 'Amsterdam', territoryId: 'NL-01', type: 'capital', position: [4.9041, 52.3676], importance: 3, supplyCapacity: 5 },
  { id: 'N-ROTTERDAM', name: 'Rotterdam', territoryId: 'NL-01', type: 'port', position: [4.4777, 51.9244], importance: 3, supplyCapacity: 5 },
  { id: 'N-LUXEMBOURG', name: 'Luxembourg', territoryId: 'LU-01', type: 'capital', position: [6.1296, 49.6116], importance: 2, supplyCapacity: 3 },
  { id: 'N-DUSSELDORF', name: 'Düsseldorf', territoryId: 'DE-02', type: 'city', position: [6.7735, 51.2277], importance: 2, supplyCapacity: 4 },
  { id: 'N-COLOGNE', name: 'Cologne rail hub', territoryId: 'DE-02', type: 'rail-hub', position: [6.9603, 50.9375], importance: 3, supplyCapacity: 5 },
  { id: 'N-FRANKFURT', name: 'Frankfurt', territoryId: 'DE-03', type: 'city', position: [8.6821, 50.1109], importance: 3, supplyCapacity: 5 },
  { id: 'N-FRA-AIR', name: 'Frankfurt air hub', territoryId: 'DE-03', type: 'airport', position: [8.5706, 50.0379], importance: 3, supplyCapacity: 4 },
  { id: 'N-STUTTGART', name: 'Stuttgart', territoryId: 'DE-05', type: 'city', position: [9.1829, 48.7758], importance: 2, supplyCapacity: 4 },
  { id: 'N-KARLSRUHE', name: 'Karlsruhe rail hub', territoryId: 'DE-05', type: 'rail-hub', position: [8.4037, 49.0069], importance: 2, supplyCapacity: 4 },
  { id: 'N-BERN', name: 'Bern', territoryId: 'CH-01', type: 'capital', position: [7.4474, 46.948], importance: 3, supplyCapacity: 4 },
  { id: 'N-BASEL', name: 'Basel rail hub', territoryId: 'CH-01', type: 'rail-hub', position: [7.5886, 47.5596], importance: 3, supplyCapacity: 4 },
  { id: 'N-ZURICH', name: 'Zürich air hub', territoryId: 'CH-01', type: 'airport', position: [8.5417, 47.3769], importance: 2, supplyCapacity: 3 },
  { id: 'N-CHUR', name: 'Chur', territoryId: 'CH-02', type: 'city', position: [9.5309, 46.8508], importance: 2, supplyCapacity: 2 },
  { id: 'N-GOTTHARD', name: 'Gotthard corridor', territoryId: 'CH-02', type: 'crossing', position: [8.57, 46.58], importance: 3, supplyCapacity: 3 },
  { id: 'N-INNSBRUCK', name: 'Innsbruck', territoryId: 'AT-01', type: 'city', position: [11.4041, 47.2692], importance: 2, supplyCapacity: 3 },
  { id: 'N-BRENNER', name: 'Brenner corridor', territoryId: 'AT-01', type: 'crossing', position: [11.5, 47.0], importance: 3, supplyCapacity: 3 }
];

export const STRATEGIC_ROUTES: StrategicRouteDefinition[] = [
  { id: 'R-CHANNEL-TUNNEL', name: 'Channel Tunnel', fromNodeId: 'N-DOVER', toNodeId: 'N-CALAIS', fromTerritoryId: 'GB-04', toTerritoryId: 'FR-02', type: 'tunnel', movementDays: 2, capacity: 3, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-RENNES-PARIS', name: 'Brittany–Paris corridor', fromNodeId: 'N-RENNES', toNodeId: 'N-PARIS', fromTerritoryId: 'FR-01', toTerritoryId: 'FR-02', type: 'rail', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-RENNES-LYON', name: 'Western interior corridor', fromNodeId: 'N-RENNES', toNodeId: 'N-LYON', fromTerritoryId: 'FR-01', toTerritoryId: 'FR-05', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-PARIS-STRASBOURG', name: 'Paris–Strasbourg rail corridor', fromNodeId: 'N-PARIS', toNodeId: 'N-STRASBOURG', fromTerritoryId: 'FR-02', toTerritoryId: 'FR-03', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-PARIS-LYON', name: 'Paris–Lyon high-capacity corridor', fromNodeId: 'N-PARIS', toNodeId: 'N-LYON', fromTerritoryId: 'FR-02', toTerritoryId: 'FR-05', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-PARIS-BRUSSELS', name: 'Paris–Brussels corridor', fromNodeId: 'N-LILLE', toNodeId: 'N-BRUSSELS', fromTerritoryId: 'FR-02', toTerritoryId: 'BE-01', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-PARIS-NAMUR', name: 'Champagne–Wallonia corridor', fromNodeId: 'N-PARIS', toNodeId: 'N-NAMUR', fromTerritoryId: 'FR-02', toTerritoryId: 'BE-02', type: 'road', movementDays: 1, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-STRASBOURG-LYON', name: 'Rhône–Alsace corridor', fromNodeId: 'N-STRASBOURG', toNodeId: 'N-DIJON', fromTerritoryId: 'FR-03', toTerritoryId: 'FR-05', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-STRASBOURG-NAMUR', name: 'Ardennes corridor', fromNodeId: 'N-METZ', toNodeId: 'N-NAMUR', fromTerritoryId: 'FR-03', toTerritoryId: 'BE-02', type: 'road', movementDays: 2, capacity: 2, supplyCapacity: 2, heavyArmour: true },
  { id: 'R-STRASBOURG-LUX', name: 'Moselle corridor', fromNodeId: 'N-METZ', toNodeId: 'N-LUXEMBOURG', fromTerritoryId: 'FR-03', toTerritoryId: 'LU-01', type: 'rail', movementDays: 1, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-STRASBOURG-FRANKFURT', name: 'Upper Rhine–Main corridor', fromNodeId: 'N-STRASBOURG', toNodeId: 'N-FRANKFURT', fromTerritoryId: 'FR-03', toTerritoryId: 'DE-03', type: 'rail', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-STRASBOURG-STUTTGART', name: 'Black Forest corridor', fromNodeId: 'N-STRASBOURG', toNodeId: 'N-KARLSRUHE', fromTerritoryId: 'FR-03', toTerritoryId: 'DE-05', type: 'road', movementDays: 1, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-STRASBOURG-BASEL', name: 'Upper Rhine crossing', fromNodeId: 'N-STRASBOURG', toNodeId: 'N-BASEL', fromTerritoryId: 'FR-03', toTerritoryId: 'CH-01', type: 'river-crossing', movementDays: 1, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-LYON-BERN', name: 'Jura–Swiss Plateau corridor', fromNodeId: 'N-LYON', toNodeId: 'N-BERN', fromTerritoryId: 'FR-05', toTerritoryId: 'CH-01', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-LYON-GOTTHARD', name: 'Alpine approach corridor', fromNodeId: 'N-LYON', toNodeId: 'N-GOTTHARD', fromTerritoryId: 'FR-05', toTerritoryId: 'CH-02', type: 'mountain-pass', movementDays: 3, capacity: 1, supplyCapacity: 1, heavyArmour: false },
  { id: 'R-BRUSSELS-NAMUR', name: 'Belgian central corridor', fromNodeId: 'N-BRUSSELS', toNodeId: 'N-NAMUR', fromTerritoryId: 'BE-01', toTerritoryId: 'BE-02', type: 'rail', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-BRUSSELS-AMSTERDAM', name: 'Low Countries corridor', fromNodeId: 'N-ANTWERP', toNodeId: 'N-ROTTERDAM', fromTerritoryId: 'BE-01', toTerritoryId: 'NL-01', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-NAMUR-LUX', name: 'Ardennes–Luxembourg corridor', fromNodeId: 'N-NAMUR', toNodeId: 'N-LUXEMBOURG', fromTerritoryId: 'BE-02', toTerritoryId: 'LU-01', type: 'road', movementDays: 1, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-NAMUR-DUSSELDORF', name: 'Wallonia–Rhine corridor', fromNodeId: 'N-NAMUR', toNodeId: 'N-COLOGNE', fromTerritoryId: 'BE-02', toTerritoryId: 'DE-02', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-ROTTERDAM-DUSSELDORF', name: 'Rhine freight corridor', fromNodeId: 'N-ROTTERDAM', toNodeId: 'N-DUSSELDORF', fromTerritoryId: 'NL-01', toTerritoryId: 'DE-02', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-LUX-DUSSELDORF', name: 'Eifel–Rhine corridor', fromNodeId: 'N-LUXEMBOURG', toNodeId: 'N-DUSSELDORF', fromTerritoryId: 'LU-01', toTerritoryId: 'DE-02', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-LUX-FRANKFURT', name: 'Luxembourg–Main corridor', fromNodeId: 'N-LUXEMBOURG', toNodeId: 'N-FRANKFURT', fromTerritoryId: 'LU-01', toTerritoryId: 'DE-03', type: 'rail', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-DUSSELDORF-FRANKFURT', name: 'Rhine–Main rail corridor', fromNodeId: 'N-COLOGNE', toNodeId: 'N-FRANKFURT', fromTerritoryId: 'DE-02', toTerritoryId: 'DE-03', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-DUSSELDORF-STUTTGART', name: 'Western German corridor', fromNodeId: 'N-DUSSELDORF', toNodeId: 'N-STUTTGART', fromTerritoryId: 'DE-02', toTerritoryId: 'DE-05', type: 'road', movementDays: 2, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-FRANKFURT-STUTTGART', name: 'Main–Neckar corridor', fromNodeId: 'N-FRANKFURT', toNodeId: 'N-STUTTGART', fromTerritoryId: 'DE-03', toTerritoryId: 'DE-05', type: 'rail', movementDays: 1, capacity: 5, supplyCapacity: 5, heavyArmour: true },
  { id: 'R-STUTTGART-BERN', name: 'Swabia–Swiss Plateau corridor', fromNodeId: 'N-STUTTGART', toNodeId: 'N-BASEL', fromTerritoryId: 'DE-05', toTerritoryId: 'CH-01', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-STUTTGART-INNSBRUCK', name: 'Swabia–Tyrol corridor', fromNodeId: 'N-STUTTGART', toNodeId: 'N-INNSBRUCK', fromTerritoryId: 'DE-05', toTerritoryId: 'AT-01', type: 'road', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-BERN-CHUR', name: 'Swiss east–west corridor', fromNodeId: 'N-BERN', toNodeId: 'N-CHUR', fromTerritoryId: 'CH-01', toTerritoryId: 'CH-02', type: 'rail', movementDays: 2, capacity: 3, supplyCapacity: 3, heavyArmour: true },
  { id: 'R-ZURICH-INNSBRUCK', name: 'Arlberg corridor', fromNodeId: 'N-ZURICH', toNodeId: 'N-INNSBRUCK', fromTerritoryId: 'CH-01', toTerritoryId: 'AT-01', type: 'mountain-pass', movementDays: 2, capacity: 2, supplyCapacity: 2, heavyArmour: true },
  { id: 'R-CHUR-INNSBRUCK', name: 'Engadin–Tyrol corridor', fromNodeId: 'N-CHUR', toNodeId: 'N-INNSBRUCK', fromTerritoryId: 'CH-02', toTerritoryId: 'AT-01', type: 'mountain-pass', movementDays: 3, capacity: 1, supplyCapacity: 1, heavyArmour: false },
  { id: 'R-DOVER-CALAIS-FERRY', name: 'Dover–Calais ferry route', fromNodeId: 'N-DOVER', toNodeId: 'N-CALAIS', fromTerritoryId: 'GB-04', toTerritoryId: 'FR-02', type: 'ferry', movementDays: 2, capacity: 2, supplyCapacity: 2, heavyArmour: false },
  { id: 'R-ANTWERP-ROTTERDAM-ROAD', name: 'Antwerp–Rotterdam motorway', fromNodeId: 'N-ANTWERP', toNodeId: 'N-ROTTERDAM', fromTerritoryId: 'BE-01', toTerritoryId: 'NL-01', type: 'road', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-PARIS-BRUSSELS-ROAD', name: 'Paris–Brussels motorway', fromNodeId: 'N-LILLE', toNodeId: 'N-BRUSSELS', fromTerritoryId: 'FR-02', toTerritoryId: 'BE-01', type: 'road', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-COLOGNE-FRANKFURT-ROAD', name: 'Rhine–Main motorway', fromNodeId: 'N-COLOGNE', toNodeId: 'N-FRANKFURT', fromTerritoryId: 'DE-02', toTerritoryId: 'DE-03', type: 'road', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-FRANKFURT-STUTTGART-ROAD', name: 'Main–Neckar motorway', fromNodeId: 'N-FRANKFURT', toNodeId: 'N-STUTTGART', fromTerritoryId: 'DE-03', toTerritoryId: 'DE-05', type: 'road', movementDays: 1, capacity: 4, supplyCapacity: 4, heavyArmour: true },
  { id: 'R-GOTTHARD-BRENNER', name: 'Central Alpine logistics arc', fromNodeId: 'N-GOTTHARD', toNodeId: 'N-BRENNER', fromTerritoryId: 'CH-02', toTerritoryId: 'AT-01', type: 'mountain-pass', movementDays: 3, capacity: 1, supplyCapacity: 1, heavyArmour: false }
];

export const STRATEGIC_NODE_BY_ID = Object.fromEntries(
  STRATEGIC_NODES.map(node => [node.id, node])
) as Record<string, StrategicNodeDefinition>;

export const STRATEGIC_ROUTE_BY_ID = Object.fromEntries(
  STRATEGIC_ROUTES.map(route => [route.id, route])
) as Record<string, StrategicRouteDefinition>;
