import type { TerritoryDefinition } from './types';

export const SLICE_IDS = ['GB-04','FR-01','FR-02','FR-03','FR-05','BE-01','BE-02','NL-01','LU-01','DE-02','DE-03','DE-05','CH-01','CH-02','AT-01'] as const;

export const TERRITORIES: Record<string, TerritoryDefinition> = {
  'GB-04': { id:'GB-04', name:'Southern England', centre:'London', terrain:'mixed-lowland', supply:5, neighbours:['FR-02'] },
  'FR-01': { id:'FR-01', name:'Northwest France', centre:'Rennes', terrain:'mixed-lowland', supply:3, neighbours:['FR-02','FR-05'] },
  'FR-02': { id:'FR-02', name:'Paris Basin', centre:'Paris', terrain:'open-lowland', supply:5, neighbours:['GB-04','FR-01','FR-03','FR-05','BE-01','BE-02'] },
  'FR-03': { id:'FR-03', name:'Northeast France', centre:'Strasbourg', terrain:'mixed-lowland', supply:4, neighbours:['FR-02','FR-05','BE-02','LU-01','DE-03','DE-05','CH-01'] },
  'FR-05': { id:'FR-05', name:'Central and Alpine France', centre:'Lyon', terrain:'mixed-upland', supply:4, neighbours:['FR-01','FR-02','FR-03','CH-01','CH-02'] },
  'BE-01': { id:'BE-01', name:'Flanders and Brussels', centre:'Brussels', terrain:'open-lowland', supply:5, neighbours:['FR-02','BE-02','NL-01'] },
  'BE-02': { id:'BE-02', name:'Wallonia', centre:'Namur', terrain:'mixed-upland', supply:3, neighbours:['FR-02','FR-03','BE-01','LU-01','DE-02'] },
  'NL-01': { id:'NL-01', name:'Southern Netherlands', centre:'Amsterdam', terrain:'open-lowland', supply:5, neighbours:['BE-01','DE-02'] },
  'LU-01': { id:'LU-01', name:'Luxembourg', centre:'Luxembourg', terrain:'mixed-upland', supply:3, neighbours:['FR-03','BE-02','DE-02','DE-03'] },
  'DE-02': { id:'DE-02', name:'Rhine-Ruhr', centre:'Düsseldorf', terrain:'mixed-lowland', supply:5, neighbours:['BE-02','NL-01','LU-01','DE-03','DE-05'] },
  'DE-03': { id:'DE-03', name:'Central Germany', centre:'Frankfurt', terrain:'mixed-upland', supply:4, neighbours:['FR-03','LU-01','DE-02','DE-05'] },
  'DE-05': { id:'DE-05', name:'Southwest Germany', centre:'Stuttgart', terrain:'mixed-upland', supply:4, neighbours:['FR-03','DE-02','DE-03','CH-01','AT-01'] },
  'CH-01': { id:'CH-01', name:'Swiss Plateau', centre:'Bern', terrain:'mixed-upland', supply:4, neighbours:['FR-03','FR-05','DE-05','CH-02','AT-01'] },
  'CH-02': { id:'CH-02', name:'Alpine Switzerland', centre:'Chur', terrain:'mountainous', supply:2, neighbours:['FR-05','CH-01','AT-01'] },
  'AT-01': { id:'AT-01', name:'Western Austria', centre:'Innsbruck', terrain:'mountainous', supply:3, neighbours:['DE-05','CH-01','CH-02'] }
};

export const TERRAIN_LABELS: Record<string,string> = {
  'open-lowland':'Open lowland', 'mixed-lowland':'Mixed lowland', 'mixed-upland':'Mixed upland', mountainous:'Mountainous'
};
