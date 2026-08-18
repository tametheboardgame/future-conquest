import { useMemo, useState } from 'react';
import { TERRITORIES } from '../game/data';
import { formationCapability } from '../game/formation-organisation';
import type { GameState, TaskGroup } from '../game/types';

interface Props {
  state: GameState;
  selectedGroup: TaskGroup | null;
  onSelect: (id: string) => void;
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-GB').format(value);

function armourCondition(group: TaskGroup) {
  const total = group.functionalArmour + group.damagedArmour;
  const damagedPercent = total > 0 ? Math.round(group.damagedArmour / total * 100) : 0;
  if (damagedPercent >= 40) return { label: 'Heavy damage', level: 'critical', damagedPercent };
  if (damagedPercent >= 20) return { label: 'Damaged', level: 'warning', damagedPercent };
  if (damagedPercent > 0) return { label: 'Light damage', level: 'worn', damagedPercent };
  return { label: 'Armour ready', level: 'ready', damagedPercent };
}

function FormationPortrait({ damagedPercent }: { damagedPercent: number }) {
  const heavyDamage = damagedPercent >= 40;
  const damaged = damagedPercent > 0;

  return <svg className="formation-armour-miniature" viewBox="0 0 80 96" role="presentation" focusable="false">
    <defs>
      <linearGradient id="formationArmourPlate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3d4b53" />
        <stop offset="1" stopColor="#151d23" />
      </linearGradient>
      <linearGradient id="formationUnderSuit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#26333d" />
        <stop offset="1" stopColor="#0b1116" />
      </linearGradient>
    </defs>
    <rect width="80" height="96" fill="#08151b" />
    <path className="formation-portrait-ground" d="M0 79 80 64v32H0Z" />
    <g className="formation-portrait-depth" opacity=".28" transform="translate(-12 9) scale(.76)">
      <path d="M31 27 40 19l10 8-2 13H33Z" />
      <path d="M26 42h29l7 21-8 31H28l-9-31Z" />
    </g>
    <g className="formation-portrait-depth" opacity=".2" transform="translate(31 14) scale(.66)">
      <path d="M31 27 40 19l10 8-2 13H33Z" />
      <path d="M26 42h29l7 21-8 31H28l-9-31Z" />
    </g>
    <g className="formation-operator">
      <path className="under-suit" fill="url(#formationUnderSuit)" d="M31 38h18l7 12-2 31H26l-2-31Z" />
      <path className="armour-plate helmet" fill="url(#formationArmourPlate)" d="m30 18 10-7 11 7 2 13-6 8H33l-6-8Z" />
      <path className="armour-seam" d="M32 25h6m3 0h8" />
      <path className="sensor-optic" d="M33 28h5m4 0h6" />
      <path className="armour-plate shoulder left" fill="url(#formationArmourPlate)" d="m21 41 11-6 5 9-5 12-13-2Z" />
      <path className="armour-plate shoulder right" fill="url(#formationArmourPlate)" d="m48 44 5-9 11 6 2 13-13 2Z" />
      <path className="armour-plate chest" fill="url(#formationArmourPlate)" d="m31 40 9-4 10 4 5 20-7 14H32l-7-14Z" />
      <path className="armour-seam" d="m40 39 1 31M29 52h23M31 61h18" />
      <path className="under-suit limb" d="m21 51-8 18 5 3 13-17M59 51l9 13-4 5-14-14" />
      <path className="armour-plate forearm" fill="url(#formationArmourPlate)" d="m11 66 7-3 7 15-6 7-8-4Z" />
      <path className="armour-plate forearm" fill="url(#formationArmourPlate)" d="m61 63 7 1 3 15-8 4-6-7Z" />
      <path className="under-suit" d="m31 72-5 23h10l4-18 4 18h10l-5-23Z" />
      <path className="armour-plate thigh" fill="url(#formationArmourPlate)" d="m27 74 10 1-2 18H24Z" />
      <path className="armour-plate thigh" fill="url(#formationArmourPlate)" d="m43 75 10-1 3 19H45Z" />
      <path className="weapon" d="M17 59 62 72l-2 7-46-14Z" />
      <path className="weapon-detail" d="m33 64 22 6-1 3-22-6Zm20 4 6-2 6 4-5 4" />
      {damaged && <g className={heavyDamage ? 'armour-damage heavy' : 'armour-damage'}>
        <path d="m48 43-6 8 4 5-7 8" />
        <path d="m27 58 7 3-4 8" />
        {heavyDamage && <path d="m57 42-6 8 6 4m-25-31 5 5-4 6" />}
      </g>}
    </g>
    <path className="formation-readiness-scan" d="M7 88h66" />
  </svg>;
}

export function FormationRoster({ state, selectedGroup, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const formations = Object.values(state.taskGroups)
      .filter(group => {
        if (!needle) return true;
        const capability = formationCapability(group.personnel).label;
        const haystack = `${group.name} ${TERRITORIES[group.location].centre} ${group.status} ${capability}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => TERRITORIES[a.location].centre.localeCompare(TERRITORIES[b.location].centre) || a.name.localeCompare(b.name));

    return formations.reduce<Record<string, TaskGroup[]>>((result, group) => {
      const centre = TERRITORIES[group.location].centre;
      (result[centre] ??= []).push(group);
      return result;
    }, {});
  }, [query, state.taskGroups]);

  const visible = Object.values(grouped).reduce((sum, groups) => sum + groups.length, 0);

  return <section className="task-groups formation-roster" data-tutorial="formation-roster">
    <div className="roster-heading">
      <p className="panel-label">FORMATIONS</p>
      <span>{Object.keys(state.taskGroups).length}</span>
    </div>
    <input
      className="formation-search"
      type="search"
      value={query}
      onChange={event => setQuery(event.target.value)}
      placeholder="Search formation, province or status"
      aria-label="Search formations"
    />
    <div className="task-group-list">
      {visible ? Object.entries(grouped).map(([centre, groups]) => <div className="formation-location-group" key={centre}>
        <div className="formation-location-heading"><span>{centre}</span><b>{groups.length}</b></div>
        {groups.map(group => {
          const capability = formationCapability(group.personnel);
          const condition = armourCondition(group);
          return <button key={group.id} className={group.id === selectedGroup?.id ? 'active' : ''} onClick={() => onSelect(group.id)}>
            <span className={`formation-roster-portrait ${condition.level}`} aria-hidden="true">
              <FormationPortrait damagedPercent={condition.damagedPercent} />
              <i style={{ height: `${condition.damagedPercent}%` }} />
            </span>
            <span className="formation-roster-copy">
              <strong>{group.name}</strong>
              <small>{capability.label} · {group.status}</small>
              <span className="formation-condition-line">
                <span>{condition.label}</span>
                <i><b style={{ width: `${Math.max(0, 100 - condition.damagedPercent)}%` }} /></i>
              </span>
            </span>
            <span className="group-stats">
              <b>{formatNumber(group.personnel)}</b>
              <small>{Math.round(group.supply)}% supply</small>
            </span>
          </button>;
        })}
      </div>) : <p className="empty-state">No formations match this search.</p>}
    </div>
  </section>;
}
