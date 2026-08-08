import { useEffect, useMemo, useState } from 'react';
import { TERRITORIES } from '../game/data';
import {
  canReorganiseFormation,
  dissolveFormation,
  formationCapability,
  mergeFormationValidation,
  mergeFormations,
  occupationRequirement,
  proportionalSplitArmour,
  reorganisationBlockReason,
  renameFormation,
  renameFormationValidation,
  splitFormation,
  splitFormationValidation,
  suggestSplitFormationName,
  transferFormationResources,
  transferFormationValidation
} from '../game/formation-organisation';
import type { GameState, TaskGroup } from '../game/types';

interface Props {
  state: GameState;
  selectedGroup: TaskGroup | null;
  onChange: (state: GameState) => void;
}

type Mode = 'overview' | 'split' | 'transfer' | 'merge' | 'rename';
type MessageTone = 'success' | 'error';

const numberValue = (value: string) => value.trim() === '' ? 0 : Number(value);

export function ForceOrganisationPanel({ state, selectedGroup, onChange }: Props) {
  const [mode, setMode] = useState<Mode>('overview');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<MessageTone>('success');
  const [name, setName] = useState('');
  const [personnel, setPersonnel] = useState('0');
  const [functionalArmour, setFunctionalArmour] = useState('0');
  const [damagedArmour, setDamagedArmour] = useState('0');
  const [otherId, setOtherId] = useState('');
  const [automaticSplitArmour, setAutomaticSplitArmour] = useState(true);

  useEffect(() => {
    setMode('overview');
    setMessage('');
    setMessageTone('success');
    setName(selectedGroup?.name ?? '');
    setPersonnel(selectedGroup ? String(Math.max(1, Math.floor(selectedGroup.personnel / 2))) : '0');
    setFunctionalArmour('0');
    setDamagedArmour('0');
    setOtherId('');
    setAutomaticSplitArmour(true);
  }, [selectedGroup?.id, selectedGroup?.status, selectedGroup?.order?.type, selectedGroup?.order?.target]);

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

  const splitInput = {
    sourceId: selectedGroup.id,
    name,
    personnel: numberValue(personnel),
    functionalArmour: numberValue(functionalArmour),
    damagedArmour: numberValue(damagedArmour)
  };
  const transferInput = {
    sourceId: selectedGroup.id,
    targetId: otherId,
    personnel: numberValue(personnel),
    functionalArmour: numberValue(functionalArmour),
    damagedArmour: numberValue(damagedArmour)
  };
  const splitValidation = mode === 'split' ? splitFormationValidation(state, splitInput) : null;
  const transferValidation = mode === 'transfer' ? transferFormationValidation(state, transferInput) : null;
  const mergeValidation = mode === 'merge' ? mergeFormationValidation(state, otherId, selectedGroup.id, name) : null;
  const renameValidation = mode === 'rename' ? renameFormationValidation(state, selectedGroup.id, name) : null;

  const apply = (next: GameState, success: string, validation?: string | null) => {
    if (validation) {
      setMessage(validation);
      setMessageTone('error');
      return;
    }
    if (next === state) {
      setMessage('The request could not be completed because the formation state changed. Review the highlighted restriction and try again.');
      setMessageTone('error');
      return;
    }
    onChange(next);
    setMessage(success);
    setMessageTone('success');
    setMode('overview');
  };

  const setProportionalArmour = (requestedPersonnel: number) => {
    const allocation = proportionalSplitArmour(selectedGroup, requestedPersonnel);
    setFunctionalArmour(String(allocation.functionalArmour));
    setDamagedArmour(String(allocation.damagedArmour));
  };

  const chooseMode = (nextMode: Mode) => {
    setMessage('');
    setMessageTone('success');
    setMode(nextMode);
    if (nextMode === 'split') {
      const splitPersonnel = Math.max(1, Math.floor(selectedGroup.personnel / 2));
      setName(suggestSplitFormationName(state, selectedGroup.id));
      setPersonnel(String(splitPersonnel));
      setProportionalArmour(splitPersonnel);
      setAutomaticSplitArmour(true);
    }
    if (nextMode === 'rename') setName(selectedGroup.name);
    if (nextMode === 'transfer') {
      setPersonnel('0');
      setFunctionalArmour('0');
      setDamagedArmour('0');
      if (compatible.length) setOtherId(compatible[0].id);
    }
    if (nextMode === 'merge') {
      setName(selectedGroup.name);
      if (compatible.length) setOtherId(compatible[0].id);
    }
  };

  const updateSplitPersonnel = (value: string) => {
    setPersonnel(value);
    if (automaticSplitArmour) setProportionalArmour(numberValue(value));
  };

  const resetSplitArmour = () => {
    setAutomaticSplitArmour(true);
    setProportionalArmour(numberValue(personnel));
  };

  const splitPeople = Math.max(0, Math.floor(numberValue(personnel) || 0));
  const splitFunctional = Math.max(0, Math.floor(numberValue(functionalArmour) || 0));
  const splitDamaged = Math.max(0, Math.floor(numberValue(damagedArmour) || 0));

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
    {message && <p className={messageTone === 'error' ? 'organisation-warning' : 'organisation-message'}>{message}</p>}

    {mode === 'overview' && <div className="organisation-actions">
      <button title={blockReason ?? undefined} disabled={!available || selectedGroup.personnel < 2} onClick={() => chooseMode('split')}>Split</button>
      <button title={blockReason ?? undefined} disabled={!available || !compatible.length} onClick={() => chooseMode('transfer')}>Transfer</button>
      <button title={blockReason ?? undefined} disabled={!available || !compatible.length} onClick={() => chooseMode('merge')}>Merge</button>
      <button title={blockReason ?? undefined} disabled={!available} onClick={() => chooseMode('rename')}>Rename</button>
      <button
        className="dissolve-action"
        title={blockReason ?? undefined}
        disabled={!available || selectedGroup.personnel !== 0 || selectedGroup.maxPersonnel !== 0 || selectedGroup.functionalArmour !== 0 || selectedGroup.damagedArmour !== 0 || Object.keys(state.taskGroups).length <= 1}
        onClick={() => apply(dissolveFormation(state, selectedGroup.id), 'Formation dissolved.')}
      >Dissolve empty formation</button>
    </div>}

    {mode === 'split' && <div className="organisation-editor">
      <h3>Split {selectedGroup.name}</h3>
      <label>New formation name<input value={name} onChange={event => setName(event.target.value)} maxLength={48} /></label>
      <p className="editor-note">Names are unique. The next numbered name is suggested automatically.</p>
      <div className="allocation-grid">
        <label>Personnel<input type="number" step="1" min="1" max={Math.max(1, selectedGroup.personnel - 1)} value={personnel} onChange={event => updateSplitPersonnel(event.target.value)} /></label>
        <label>Functional armour<input type="number" step="1" min="0" max={Math.min(selectedGroup.functionalArmour, Math.max(0, splitPeople))} value={functionalArmour} onChange={event => { setFunctionalArmour(event.target.value); setAutomaticSplitArmour(false); }} /></label>
        <label>Damaged armour<input type="number" step="1" min="0" max={selectedGroup.damagedArmour} value={damagedArmour} onChange={event => { setDamagedArmour(event.target.value); setAutomaticSplitArmour(false); }} /></label>
      </div>
      <div className="allocation-helper-row">
        <span>{automaticSplitArmour ? 'Armour allocation follows the personnel split.' : 'Armour allocation has been manually overridden.'}</span>
        <button type="button" onClick={resetSplitArmour}>Use proportional armour</button>
      </div>
      <div className="allocation-preview">
        <div><span>New formation</span><strong>{splitPeople.toLocaleString('en-GB')} personnel · {splitFunctional.toLocaleString('en-GB')} functional · {splitDamaged.toLocaleString('en-GB')} damaged</strong></div>
        <div><span>{selectedGroup.name} remains</span><strong>{Math.max(0, selectedGroup.personnel - splitPeople).toLocaleString('en-GB')} personnel · {Math.max(0, selectedGroup.functionalArmour - splitFunctional).toLocaleString('en-GB')} functional · {Math.max(0, selectedGroup.damagedArmour - splitDamaged).toLocaleString('en-GB')} damaged</strong></div>
      </div>
      <p className="editor-note">Functional powered armour assigned to the new formation cannot exceed its personnel. Extra serviceable suits remain with the parent formation.</p>
      {splitValidation && <p className="organisation-warning">{splitValidation}</p>}
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button disabled={Boolean(splitValidation)} className="primary" onClick={() => apply(splitFormation(state, splitInput), 'New formation created.', splitValidation)}>Confirm split</button></div>
    </div>}

    {mode === 'transfer' && <div className="organisation-editor">
      <h3>Transfer resources</h3>
      <label>Destination formation<select value={otherId} onChange={event => setOtherId(event.target.value)}>{compatible.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <div className="allocation-grid">
        <label>Personnel<input type="number" step="1" min="0" max={selectedGroup.personnel} value={personnel} onChange={event => setPersonnel(event.target.value)} /></label>
        <label>Functional armour<input type="number" step="1" min="0" max={selectedGroup.functionalArmour} value={functionalArmour} onChange={event => setFunctionalArmour(event.target.value)} /></label>
        <label>Damaged armour<input type="number" step="1" min="0" max={selectedGroup.damagedArmour} value={damagedArmour} onChange={event => setDamagedArmour(event.target.value)} /></label>
      </div>
      {transferValidation && <p className="organisation-warning">{transferValidation}</p>}
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button disabled={Boolean(transferValidation)} className="primary" onClick={() => apply(transferFormationResources(state, transferInput), 'Resources transferred.', transferValidation)}>Confirm transfer</button></div>
    </div>}

    {mode === 'merge' && <div className="organisation-editor">
      <h3>Merge formations</h3>
      <label>Merge into<select value={otherId} onChange={event => setOtherId(event.target.value)}>{compatible.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
      <label>Merged formation name<input value={name} onChange={event => setName(event.target.value)} maxLength={48} /></label>
      <p className="editor-note">All personnel, establishment capacity and armour will be conserved in the surviving formation.</p>
      {mergeValidation && <p className="organisation-warning">{mergeValidation}</p>}
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button disabled={Boolean(mergeValidation)} className="primary" onClick={() => apply(mergeFormations(state, otherId, selectedGroup.id, name), 'Formations merged.', mergeValidation)}>Confirm merge</button></div>
    </div>}

    {mode === 'rename' && <div className="organisation-editor">
      <h3>Rename formation</h3>
      <label>Formation name<input value={name} onChange={event => setName(event.target.value)} maxLength={48} /></label>
      {renameValidation && <p className="organisation-warning">{renameValidation}</p>}
      <div className="editor-actions"><button onClick={() => setMode('overview')}>Cancel</button><button disabled={Boolean(renameValidation)} className="primary" onClick={() => apply(renameFormation(state, selectedGroup.id, name), 'Formation renamed.', renameValidation)}>Confirm name</button></div>
    </div>}
  </section>;
}
