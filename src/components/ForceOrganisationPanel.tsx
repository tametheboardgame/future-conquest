import { useEffect, useMemo, useState } from 'react';
import { TERRITORIES } from '../game/data';
import {
  canReorganiseFormation,
  dissolveFormation,
  formationCapability,
  mergeFormations,
  occupationRequirement,
  reorganisationBlockReason,
  renameFormation,
  splitFormation,
  transferFormationResources
} from '../game/formation-organisation';
import type { GameState, TaskGroup } from '../game/types';

interface Props {
  state: GameState;
  selectedGroup: TaskGroup | null;
  onChange: (state: GameState) => void;
}

type Mode = 'overview' | 'split' | 'transfer' | 'merge' | 'rename';

const numberValue = (value: string) => Math.max(0, Math.floor(Number(value) || 0));

export function ForceOrganisationPanel({ state, selectedGroup, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('overview');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [personnel, setPersonnel] = useState('0');
  const [functionalArmour, setFunctionalArmour] = useState('0');
  const [damagedArmour, setDamagedArmour] = useState('0');
  const [otherId, setOtherId] = useState('');

  useEffect(() => {
    setMode('overview');
    setMessage('');
    setName(selectedGroup?.name ?? '');
    setPersonnel(selectedGroup ? String(Math.max(1, Math.floor(selectedGroup.personnel / 2))) : '0');
    setFunctionalArmour(selectedGroup ? String(Math.floor(selectedGroup.functionalArmour / 2)) : '0');
    setDamagedArmour(selectedGroup ? String(Math.floor(selectedGroup.damagedArmour / 2)) : '0');
    setOtherId('');
  }, [selectedGroup?.id]);

  const compatible = useMemo(() => selectedGroup
    ? Object.values(state.taskGroups).filter(group =>
      group.id !== selectedGroup.id &&
      group.location === selectedGroup.location &&
      canReorganiseFormation(group)
    )
    : [], [selectedGroup, state.taskGroups]);

  if (!selectedGroup) return <section className="force-organisation">
    <p className="panel-label">FORCE ORGANISATION</p>
    <p className="empty-state">No formation is available to organise.</p>
  </section>;

  const capability = formationCapability(selectedGroup.personnel);
  const required = occupationRequirement(selectedGroup.location);
  const blockReason = reorganisationBlockReason(selectedGroup);
  const available = !blockReason;

  const apply = (next: GameState, success: string) => {
    if (next === state) {
      setMessage('The requested reorganisation is invalid. Check the allocation and formation status.');
      return;
    }
    onChange(next);
    setMessage(success);
    setMode('overview');
  };

  const chooseMode = (nextMode: Mode) => {
    setMessage('');
    setMode(nextMode);
    if (nextMode === 'rename') setName(selectedGroup.name);
    if ((nextMode === 'transfer' || nextMode === 'merge') && compatible.length) setOtherId(compatible[0].id);
  };

  return <section className="force-organisation">
    <div className="force-heading">
      <p className="panel-label">FORCE ORGANISATION</p>
      <span className={`capability-badge ${capability.key}`}>{capability.label}</span>
    </div>
    <p className="force-description">{capability.description}</p>
    <div className="occupation-readiness">
      <span>Occupation requirement at {TERRITORIES[selectedGroup.location].centre}</span>
      <strong>{required} personnel</strong>
      <small>{selectedGroup.personnel >= required ? 'This formation can establish territorial control.' : 'This formation could fight, but cannot secure this province alone.'}</small>
    </div>

    {blockReason && <p className="organisation-warning">{blockReason}</p>}
    {message && <p className="organisation-message">{message}</p>}

    {mode === 'overview' && <div className="organisation-actions">
      <button disabled={!available || selectedGroup.personnel < 2} onClick={() => chooseMode('split')}>Split</button>
      <button disabled={!available || !compatible.length} onClick={() => chooseMode('transfer')}>Transfer</button>
      <button disabled={!available || !compatible.length} onClick={() => chooseMode('merge')}>Merge</button>
      <button disabled={!available} onClick={() => chooseMode('rename')}>Rename</button>
      <button
        className="dissolve-action"
        disabled={!available || selectedGroup.personnel !== 0 || selectedGroup.maxPersonnel !== 0 || selectedGroup.functionalArmour !== 0 || selectedGroup.damagedArmour !== 0 || Object.keys(state.taskGroups).length <= 1}
        onClick={() => apply(dissolveFormation(state, selectedGroup.id), 'Formation dissolved.')}
      >Dissolve empty formation</button>
    </div>}

    {mode === 'split' && <div className="organisation-editor">
      <h3>Split {selectedGroup.name}</h3>
      <label>New formation name<input value={name} onChange={event => setName(event.target.value)} maxLength={48} /></label>
      <div className="allocation-grid">
        <label>Personnel<input type="number" min="1" max={Math.max(1, selectedGroup.personnel - 1)} value={personnel} onChange={event => setPersonnel(event.target.value)} /></label>
        <label>Functional armour<input type="number" min="0" max={selectedGroup.functionalArmour} value={functionalArmour} onChange={event => setFunctionalArmour(event.target.value)} /></label>
        <label>Damaged armour<input type="number" min="0" max={selectedGroup.damagedArmour} value={damagedArmour} onChange={event => setDamagedArmour(event.target.value)} /></label>
      </div>
      <p className="editor-note">Any whole-number allocation is permitted. A formation of two personnel is legal, but it has almost no territorial combat or occupation value.</p>
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button className="primary" onClick={() => apply(splitFormation(state, {
        sourceId: selectedGroup.id,
        name,
        personnel: numberValue(personnel),
        functionalArmour: numberValue(functionalArmour),
        damagedArmour: numberValue(damagedArmour)
      }), 'New formation created.')}>Confirm split</button></div>
    </div>}

    {mode === 'transfer' && <div className="organisation-editor">
      <h3>Transfer resources</h3>
      <label>Destination formation<select value={otherId} onChange={event => setOtherId(event.target.value)}>{compatible.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <div className="allocation-grid">
        <label>Personnel<input type="number" min="0" max={selectedGroup.personnel} value={personnel} onChange={event => setPersonnel(event.target.value)} /></label>
        <label>Functional armour<input type="number" min="0" max={selectedGroup.functionalArmour} value={functionalArmour} onChange={event => setFunctionalArmour(event.target.value)} /></label>
        <label>Damaged armour<input type="number" min="0" max={selectedGroup.damagedArmour} value={damagedArmour} onChange={event => setDamagedArmour(event.target.value)} /></label>
      </div>
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button className="primary" onClick={() => apply(transferFormationResources(state, {
        sourceId: selectedGroup.id,
        targetId: otherId,
        personnel: numberValue(personnel),
        functionalArmour: numberValue(functionalArmour),
        damagedArmour: numberValue(damagedArmour)
      }), 'Resources transferred.')}>Confirm transfer</button></div>
    </div>}

    {mode === 'merge' && <div className="organisation-editor">
      <h3>Merge formations</h3>
      <label>Merge into<select value={otherId} onChange={event => setOtherId(event.target.value)}>{compatible.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <label>Merged formation name<input value={name} onChange={event => setName(event.target.value)} maxLength={48} /></label>
      <p className="editor-note">All personnel, establishment capacity and armour will be conserved in the surviving formation.</p>
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button className="primary" onClick={() => apply(mergeFormations(state, otherId, selectedGroup.id, name), 'Formations merged.')}>Confirm merge</button></div>
    </div>}

    {mode === 'rename' && <div className="organisation-editor">
      <h3>Rename formation</h3>
      <label>Formation name<input value={name} onChange={event => setName(event.target.value)} maxLength={48} /></label>
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button className="primary" onClick={() => apply(renameFormation(state, selectedGroup.id, name), 'Formation renamed.')}>Confirm name</button></div>
    </div>}
  </section>;
}
