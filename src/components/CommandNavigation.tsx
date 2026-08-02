export type CommandView = 'map' | 'forces' | 'operations' | 'territories' | 'intelligence' | 'campaign';

interface Props {
  active: CommandView;
  onChange: (view: CommandView) => void;
  badges: Partial<Record<CommandView, string | number>>;
}

const ITEMS: Array<{ id: CommandView; code: string; label: string }> = [
  { id: 'map', code: 'MAP', label: 'Command map' },
  { id: 'forces', code: 'FRC', label: 'Forces' },
  { id: 'operations', code: 'OPS', label: 'Operations' },
  { id: 'territories', code: 'TER', label: 'Territories' },
  { id: 'intelligence', code: 'INT', label: 'Intelligence' },
  { id: 'campaign', code: 'SYS', label: 'Campaign' }
];

export function CommandNavigation({ active, onChange, badges }: Props) {
  return <nav className="command-navigation" aria-label="Primary command views">
    <div className="command-brand" aria-hidden="true">
      <strong>FC</strong>
      <span>VII-A</span>
    </div>
    <div className="command-nav-items">
      {ITEMS.map(item => <button
        type="button"
        key={item.id}
        className={active === item.id ? 'active' : ''}
        aria-current={active === item.id ? 'page' : undefined}
        onClick={() => onChange(item.id)}
        data-command-view={item.id}
      >
        <span className="command-nav-code">{item.code}</span>
        <span className="command-nav-label">{item.label}</span>
        {badges[item.id] !== undefined && <b>{badges[item.id]}</b>}
      </button>)}
    </div>
    <div className="command-nav-footer"><i /> COMMAND LINK</div>
  </nav>;
}
