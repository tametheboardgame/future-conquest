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

  return <section className="task-groups formation-roster">
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
          return <button key={group.id} className={group.id === selectedGroup?.id ? 'active' : ''} onClick={() => onSelect(group.id)}>
            <span>
              <strong>{group.name}</strong>
              <small>{capability.label} · {group.status}</small>
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
