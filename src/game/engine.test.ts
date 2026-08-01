import { describe, expect, it } from 'vitest';
import { TERRITORIES } from './data';
import { beginOperation, endTurn, futureFormations, modernFormations, moveSelectedFormation, newGame, selectFormation, selectTerritory, totalFuturePersonnel } from './engine';

describe('formation campaign engine',()=>{
  it('creates the finite future army and persistent defenders deterministically',()=>{
    const first=newGame(42042),second=newGame(42042);
    expect(first).toEqual(second);
    expect(totalFuturePersonnel(first)).toBe(10000);
    expect(futureFormations(first)).toHaveLength(6);
    expect(futureFormations(first).filter(formation=>formation.generalPresent)).toHaveLength(1);
    expect(modernFormations(first)).toHaveLength(14);
  });

  it('moves only the selected formation and consumes its daily order',()=>{
    let state=newGame(31001);
    const destination=TERRITORIES[state.portalTerritory].neighbours[0];
    state.territories[destination]={controller:'player',occupation:'controlled',legitimacy:55,resistance:25,capturedTurn:1};
    state=selectFormation(state,'FC-A');
    state=selectTerritory(state,destination);
    state=moveSelectedFormation(state);
    expect(state.formations['FC-A'].territoryId).toBe(destination);
    expect(state.formations['FC-A'].operations).toBe(0);
    expect(state.formations['FC-B'].territoryId).toBe(state.portalTerritory);
  });

  it('starts and resolves a persistent multi-day operation',()=>{
    let state=newGame(77531);
    const target=TERRITORIES[state.portalTerritory].neighbours[0];
    const originalDefenders=modernFormations(state).filter(formation=>formation.territoryId===target).reduce((sum,formation)=>sum+formation.personnel,0);
    state=selectFormation(state,'FC-A');
    state=selectTerritory(state,target);
    state=beginOperation(state);
    expect(state.battle?.target).toBe(target);
    expect(state.formations['FC-A'].status).toBe('engaged');
    for(let day=0;day<7&&state.battle;day++)state=endTurn(state);
    const survivingDefenders=modernFormations(state).filter(formation=>formation.territoryId===target).reduce((sum,formation)=>sum+formation.personnel,0);
    expect(survivingDefenders).toBeLessThan(originalDefenders);
    expect(state.battle).toBeNull();
  });

  it('allows the enemy to retake an undefended front territory',()=>{
    let state=newGame(90511);
    const target=TERRITORIES[state.portalTerritory].neighbours[0];
    state.turn=10;
    state.territories[target]={controller:'player',occupation:'contested',legitimacy:48,resistance:40,capturedTurn:2};
    state=endTurn(state);
    expect(state.territories[target].controller).toBe('enemy');
    expect(state.events.some(event=>event.text.includes('retaken'))).toBe(true);
  });

  it('isolates a formation that cannot trace controlled territory to the portal',()=>{
    let state=newGame(44119);
    const remote=Object.keys(state.territories).find(id=>id!==state.portalTerritory&&!TERRITORIES[state.portalTerritory].neighbours.includes(id))!;
    state.territories[remote]={controller:'player',occupation:'contested',legitimacy:50,resistance:35,capturedTurn:1};
    state.formations['FC-A'].territoryId=remote;
    state=endTurn(state);
    expect(state.formations['FC-A'].supply).toBe('isolated');
    expect(state.formations['FC-A'].cohesion).toBeLessThan(100);
  });

  it('introduces persistent coalition reinforcements at escalation thresholds',()=>{
    let state=newGame(77701);
    state.escalation=18;
    state=endTurn(state);
    expect(state.reinforcementStage).toBe(1);
    expect(state.formations['RF-1']).toBeDefined();
    expect(state.formations['RF-1'].reinforcement).toBe(true);
  });

  it('ends the campaign when the General is lost',()=>{
    let state=newGame(12004);
    state.formations['FC-HQ'].personnel=0;
    state.formations['FC-HQ'].status='destroyed';
    state=endTurn(state);
    expect(state.status).toBe('defeat');
    expect(state.events[0].text).toContain('General');
  });
});
