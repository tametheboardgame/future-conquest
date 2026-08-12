import fs from 'node:fs';

const file = 'src/components/TerrainMapPrototypeImpl.tsx';
let source = fs.readFileSync(file, 'utf8');

const replace = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`WP2D line hierarchy anchor missing: ${label}`);
  source = source.replace(before, after);
};

replace(
`          'line-color': '#a6b7a8',
          'line-opacity': 0.32,
          'line-width': 0.8`,
`          'line-color': '#a6b7a8',
          'line-opacity': 0.24,
          'line-width': 0.65`,
'coastline restraint');

replace(
`          'line-color': '#d6d8c9',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.18, 5.5, 0.23, 7, 0.31, 9, 0.4],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.45, 6, 0.7, 8, 1.05]`,
`          'line-color': '#d7d9cf',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.07, 5.5, 0.1, 7, 0.16, 9, 0.23],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 6, 0.45, 8, 0.68]`,
'administrative border restraint');

replace(
`              0.1
            ],
            5.8, ['case',`,
`              0.04
            ],
            5.8, ['case',`,
'ordinary route opacity theatre');
replace(
`              0.25
            ],
            7, ['case',`,
`              0.12
            ],
            7, ['case',`,
'ordinary route opacity campaign');
replace(
`              0.44
            ],
            9, ['case',`,
`              0.26
            ],
            9, ['case',`,
'ordinary route opacity local');
replace(
`              0.58
            ]
          ],`,
`              0.42
            ]
          ],`,
'ordinary route opacity close');

replace(
`              0.75
            ],
            6, ['case',`,
`              0.5
            ],
            6, ['case',`,
'ordinary route width theatre');
replace(
`              1.05
            ],
            8, ['case',`,
`              0.7
            ],
            8, ['case',`,
'ordinary route width campaign');
replace(
`              1.45
            ],
            10, ['case',`,
`              1.0
            ],
            10, ['case',`,
'ordinary route width local');
replace(
`              1.7
            ]
          ]`,
`              1.25
            ]
          ]`,
'ordinary route width close');

replace(
`          'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.48, 6, 0.62, 8, 0.74, 10, 0.8],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 6, 1.2, 8, 1.8]`,
`          'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 6, 0.44, 8, 0.58, 10, 0.68],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.58, 6, 0.82, 8, 1.2]`,
'control border hierarchy');

replace(
`          'line-color': '#3c2623',
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 4.6, 6, 5.8, 8, 7.1, 10, 8.2]`,
`          'line-color': '#332322',
          'line-opacity': 0.72,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3.6, 6, 4.6, 8, 5.4, 10, 6.0]`,
'front underlay restraint');
replace(
`          'line-color': '#f3a15d',
          'line-opacity': 0.98,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.8, 6, 2.4, 8, 3.1, 10, 3.5]`,
`          'line-color': '#ffad66',
          'line-opacity': 0.98,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.65, 6, 2.15, 8, 2.7, 10, 3.0]`,
'front core clarity');

replace(
`            ['boolean', ['get', 'active_combat'], false], 0.98,
            ['==', ['get', 'threat_stage'], 'under-attack'], 0.98,
            ['==', ['get', 'threat_stage'], 'imminent'], 0.94,
            ['==', ['get', 'threat_stage'], 'preparing'], 0.82,
            ['==', ['get', 'threat_stage'], 'recent-combat'], 0.62,
            ['boolean', ['get', 'targeted'], false], 0.94,
            ['boolean', ['get', 'selected'], false], 0.95,`,
`            ['boolean', ['get', 'active_combat'], false], 0.96,
            ['==', ['get', 'threat_stage'], 'under-attack'], 0.94,
            ['==', ['get', 'threat_stage'], 'imminent'], 0.86,
            ['==', ['get', 'threat_stage'], 'preparing'], 0.68,
            ['==', ['get', 'threat_stage'], 'recent-combat'], 0.42,
            ['boolean', ['get', 'targeted'], false], 0.88,
            ['boolean', ['get', 'selected'], false], 0.92,`,
'state outline opacity');
replace(
`            ['boolean', ['get', 'active_combat'], false], 4,
            ['==', ['get', 'threat_stage'], 'under-attack'], 3.6,
            ['boolean', ['get', 'selected'], false], 3.2,
            ['boolean', ['get', 'targeted'], false], 2.8,
            ['==', ['get', 'threat_stage'], 'imminent'], 2.8,
            2.2`,
`            ['boolean', ['get', 'active_combat'], false], 3.1,
            ['==', ['get', 'threat_stage'], 'under-attack'], 2.8,
            ['boolean', ['get', 'selected'], false], 2.6,
            ['boolean', ['get', 'targeted'], false], 2.3,
            ['==', ['get', 'threat_stage'], 'imminent'], 2.3,
            1.8`,
'state outline width');

fs.writeFileSync(file, source);
console.log('Applied R3-WP2D strategic line hierarchy refinement.');
