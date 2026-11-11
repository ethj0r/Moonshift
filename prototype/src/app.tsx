import { Component, lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { cellName, evaluate, initialSession, ITEMS, itemName, occupied, placeItem, placementError,
  readiness, ROUTES, routeStatus, sessionReducer, toggleBattery, type Device, type Draft, type Item, type Route } from './game/rules';
import { Dialog } from './ui/Dialog';
import { Icon, type IconName } from './ui/Icons';

const Scene = lazy(() => import('./scene/Scene'));
type Panel = 'cargo' | 'air' | 'garden' | 'workshop' | 'radio';
type Modal = 'pause' | 'help' | 'settings' | 'risk' | 'restart' | 'exit' | null;
type Settings = { reducedMotion: boolean; lowGraphics: boolean };
const OBJECTIVES = { 3: 'A place for everything.', 4: 'Bring everyone inside.', 5: 'Leave the crew ready.' };
const GOALS = { 3: 'Store both items. Keep an air route clear.', 4: 'Choose a route, power the fan, and move the crew.', 5: 'Save a ration for the final shift. Research is a bonus.' };
const PANEL_ICONS: Record<Panel, IconName> = { cargo: 'cargo', air: 'air', garden: 'garden', workshop: 'research', radio: 'radio' };
const PANEL_NAMES: Record<Panel, string> = { cargo: 'Storage', air: 'Shelter', garden: 'Garden', workshop: 'Research', radio: 'Radio' };

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function initialSettings(): Settings {
  const fallback = { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, lowGraphics: false };
  try { return { ...fallback, ...JSON.parse(localStorage.getItem('moonshift-preferences') ?? '{}') }; }
  catch { return fallback; }
}

export default function App() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, initialSession);
  const [screen, setScreen] = useState<'title' | 'briefing' | 'game'>('title');
  const [modal, setModal] = useState<Modal>(null);
  const [returnToPause, setReturnToPause] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [panel, setPanel] = useState<Panel>('cargo');
  const [selected, setSelected] = useState<Item | null>(null);
  const [vertical, setVertical] = useState(false);
  const [focusedCell, setFocusedCell] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [sceneError, setSceneError] = useState(false);
  const [sceneGeneration, setSceneGeneration] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [overview, setOverview] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const gridRef = useRef<HTMLDivElement>(null);
  const { state, draft, phase } = session;
  const preview = useMemo(() => evaluate(state, draft), [state, draft]);
  const cells = useMemo(() => occupied(state, draft), [state, draft]);
  const canEdit = screen === 'game' && phase === 'planning' && !modal && ready;

  useEffect(() => {
    try { localStorage.setItem('moonshift-preferences', JSON.stringify(settings)); } catch { /* Preferences remain usable in memory. */ }
  }, [settings]);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (phase !== 'resolving' || modal || !visible) return;
    const timer = setTimeout(() => dispatch({ type: 'result' }), settings.reducedMotion ? 50 : 1400);
    return () => clearTimeout(timer);
  }, [phase, modal, settings.reducedMotion, visible]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !modal && screen === 'game' && !document.querySelector('dialog[open]')) {
        if (selected) { setSelected(null); setNotice('Selection canceled. Your plan is unchanged.'); }
        else setModal('pause');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [modal, screen, selected]);

  function update(next: Draft) { if (canEdit) { dispatch({ type: 'draft', draft: next }); setNotice(''); } }
  function selectItem(item: Item) {
    if (!canEdit || state.shift === 5 || (item === 'battery' && (state.batteryUsed || draft.battery))) return;
    setSelected(item); setVertical(draft.placements[item]?.vertical ?? false); setPanel('cargo');
    setNotice(`Choose a cell for the ${item === 'battery' ? 'battery' : 'research crate'}.`);
  }
  function place(cell: number) {
    if (!canEdit || state.shift === 5) return;
    setFocusedCell(cell);
    if (!selected) { const owner = cells.get(cell); if (owner) selectItem(owner); else setNotice('Choose an item first, then its cell.'); return; }
    const placement = { anchor: cell, vertical };
    const problem = placementError(state, draft, selected, placement);
    if (problem) { setNotice(problem); return; }
    update(placeItem(state, draft, selected, placement));
    setNotice(`${itemName(selected)} placed at ${cellName(cell)}. You can still change your plan.`);
  }
  function rotate() {
    if (!canEdit || selected !== 'research') return;
    const placement = draft.placements.research;
    if (placement) {
      const next = { ...placement, vertical: !vertical };
      const problem = placementError(state, draft, 'research', next);
      if (problem) { setNotice(problem); return; }
      update(placeItem(state, draft, 'research', next));
    }
    setVertical(!vertical);
  }
  function toggleDevice(device: Device) {
    update({ ...draft, devices: draft.devices.includes(device) ? draft.devices.filter(value => value !== device) : [...draft.devices, device] });
  }
  function chooseRoute(route: Route) {
    const status = routeStatus(state, draft, route);
    if (status !== 'available') { setNotice(status === 'locked' ? 'The middle route needed a spare connection in Shift 1. Use top or bottom.' : 'Move the cargo away from this vent first.'); return; }
    update({ ...draft, route });
  }
  function run() {
    if (!canEdit) return;
    if (preview.errors.length) { setNotice(preview.errors[0]); return; }
    if (preview.risks.length) { setModal('risk'); return; }
    dispatch({ type: 'commit' }); setSelected(null);
  }
  function nextShift() {
    dispatch({ type: 'continue' }); setSelected(null); setNotice('');
    setPanel(state.shift === 3 ? 'air' : 'garden'); setOverview(false);
  }
  function restart() {
    dispatch({ type: 'restart' }); setPanel('cargo'); setSelected(null); setNotice('');
    setModal(null); setScreen('game'); setZoom(1); setOverview(false);
  }
  function closeModal() { setModal(returnToPause && (modal === 'help' || modal === 'settings') ? 'pause' : null); setReturnToPause(false); }
  function openFromPause(target: 'help' | 'settings') { setReturnToPause(true); setModal(target); }
  const titleMenu = screen !== 'game';
  const panels: Panel[] = state.shift === 3 ? ['cargo'] : state.shift === 4 ? ['cargo', 'air', 'garden', 'radio'] : ['garden', 'workshop', 'radio', ...(!state.branchReady ? ['air' as const] : [])];
  const useBattery = <button className={`button battery-button ${draft.battery ? 'is-selected' : ''}`} disabled={!canEdit || state.batteryUsed}
    aria-pressed={draft.battery} onClick={() => { update(toggleBattery(state, draft)); setSelected(null); }}>
    <Icon name="power" />{state.batteryUsed ? 'Battery used' : draft.battery ? 'Cancel battery' : 'Use spare battery'}<span className="button-meta">+1</span></button>;
  const deviceButton = (device: Device, label: string, icon: IconName, disabled = false) => <button className={`button option-button ${draft.devices.includes(device) ? 'is-selected' : ''}`}
    aria-pressed={draft.devices.includes(device)} disabled={!canEdit || disabled} onClick={() => toggleDevice(device)}>
    <Icon name={icon} /><span>{label}</span><span className="button-meta">{draft.devices.includes(device) ? <Icon name="check" size={16} /> : '1 power'}</span></button>;

  return <main className={`app ${titleMenu ? 'menu-mode' : 'game-mode'} ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
    <div className="scene-region" aria-label="Interactive isometric lunar outpost">
      <SceneBoundary key={sceneGeneration} onError={() => setSceneError(true)}>
        <Suspense fallback={null}><Scene state={state} draft={draft} phase={phase} selected={selected} vertical={vertical}
          focusedCell={focusedCell} interactive={canEdit} paused={!!modal} menu={titleMenu} lowGraphics={settings.lowGraphics}
          reducedMotion={settings.reducedMotion} zoom={zoom} overview={overview}
          onCell={place} onItem={selectItem} onFacility={value => { if (canEdit && panels.includes(value)) setPanel(value); }}
          onReady={() => setReady(true)} onProgress={setLoadProgress} onError={() => setSceneError(true)} /></Suspense>
      </SceneBoundary>
    </div>

    {titleMenu ? <section className="title-menu" aria-label="Main menu">
      <div className="mission-patch"><Icon name="crew" size={23} /><span>OUTPOST 03</span><span className="patch-star">✦</span></div>
      <h1>MOONSHIFT</h1><p className="title-subtitle">A little lunar rescue.</p>
      {screen === 'title' ? <>
        <p className="title-description">Three crew. One small outpost.<br />Every thoughtful choice helps.</p>
        <nav className="main-menu-buttons" aria-label="Start menu">
          <button className="button primary menu-button" disabled={!ready || sceneError} onClick={() => setScreen('briefing')}>Start shift 3 <Icon name="arrow" size={21} /></button>
          <button className="button menu-button" onClick={() => setModal('help')}>How to play</button>
          <button className="button menu-button" onClick={() => setModal('settings')}>Settings</button>
        </nav>
        <p className="prototype-note">A three-shift story · Play at your own pace</p>
      </> : <div className="briefing panel">
        <h2>A storm is on its way.</h2><p>B.E.E.P. has brought a battery and a research crate. The air is repaired, and the garden needs one more care turn.</p>
        <ol className="briefing-steps"><li>Store your cargo.</li><li>Shelter all three astronauts.</li><li>Save food for the final shift.</li></ol>
        <p className="hint">You have 3 team rations. One ration feeds the whole crew for one shift.</p>
        <button className="button primary" onClick={() => { setScreen('game'); setPanel('cargo'); }}>Begin</button>
        <button className="text-button" onClick={() => setScreen('title')}>Back to menu</button>
      </div>}
    </section> : <>
      <header className="hud">
        <div className="objective"><span className="shift-label">SHIFT {state.shift} <span>OF 6</span></span><h1>{OBJECTIVES[state.shift]}</h1><p>{GOALS[state.shift]}</p></div>
        <div className="status-cluster"><div className="resource"><Icon name="food" /><div><span>Food</span><strong data-testid="food-count">{state.food}</strong></div></div>
          <div className="resource"><Icon name="power" /><div><span>Flexible power</span><strong>{phase === 'planning' ? `${preview.power.used}/${preview.power.available}` : '—'}</strong></div></div>
          <button className="icon-button pause-button" aria-label="Pause game" onClick={() => setModal('pause')}><Icon name="pause" /></button></div>
      </header>

      <section className="action-region" aria-label="Shift planning" aria-disabled={!canEdit}>
        <div className="context-panel panel">
          <nav className="panel-tabs" aria-label="Outpost actions">{panels.map(value => <button key={value} className={panel === value ? 'active' : ''}
            aria-pressed={panel === value} onClick={() => { setPanel(value); setNotice(''); }}><Icon name={PANEL_ICONS[value]} size={19} /><span>{PANEL_NAMES[value]}</span></button>)}</nav>
          <div className="panel-body">
            {panel === 'cargo' && <>
              <div className="section-heading"><h2>Make a little room.</h2><span className="small-label">3 × 3</span></div>
              <p className="panel-description">Choose an item, then a cell. Striped cells carry air.</p>
              <div className="cargo-items">{ITEMS.map(item => <button key={item} className={`cargo-card ${selected === item ? 'selected' : ''}`}
                disabled={!canEdit || (item === 'battery' && (state.batteryUsed || draft.battery))} aria-label={`Select ${item === 'research' ? 'research crate' : 'battery'}`} aria-pressed={selected === item} onClick={() => selectItem(item)}>
                <Icon name={item === 'battery' ? 'power' : 'research'} size={27} /><strong>{item === 'battery' ? 'Battery' : 'Research'}</strong><span>{item === 'battery' ? state.batteryUsed ? 'Used' : draft.battery ? 'Scheduled' : '1 cell' : '2 cells'}</span></button>)}</div>
              <div className="storage-grid" ref={gridRef} role="group" aria-label="Storage cells" onKeyDown={event => {
                if (event.key.toLowerCase() === 'r') { event.preventDefault(); rotate(); }
                const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
                if (moves[event.key] !== undefined) {
                  event.preventDefault(); const current = Number((event.target as HTMLElement).dataset.cell ?? 0);
                  const next = Math.max(0, Math.min(8, current + moves[event.key]));
                  gridRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
                }
              }}>{Array.from({ length: 9 }, (_, cell) => <button key={cell} data-cell={cell}
                className={`${cell % 3 === 1 ? 'vent-cell' : ''} ${cells.has(cell) ? `occupied ${cells.get(cell)}` : ''} ${focusedCell === cell ? 'cell-focused' : ''}`}
                disabled={!canEdit} onFocus={() => setFocusedCell(cell)} aria-label={`${cellName(cell)}, ${cells.has(cell) ? itemName(cells.get(cell)!) : cell % 3 === 1 ? cell === 4 ? 'middle vent, connection missing' : 'available vent' : 'empty'}`} onClick={() => place(cell)}>
                <span>{cellName(cell)}</span>{cells.has(cell) ? <Icon name={cells.get(cell) === 'battery' ? 'power' : 'research'} size={17} /> : cell % 3 === 1 ? <span className="vent-lines">≋</span> : <span className="cell-dot">·</span>}</button>)}</div>
              <div className="row-actions"><button className="button small" disabled={!canEdit || selected !== 'research'} onClick={rotate}><Icon name="rotate" size={17} />Rotate</button>
                <button className="text-button" disabled={!selected} onClick={() => { setSelected(null); setNotice('Selection canceled.'); }}>Cancel</button></div>
              <p className="hint">{selected === 'research' ? `${vertical ? 'Vertical' : 'Horizontal'} · Rotate with R in the grid.` : 'Top and bottom vents can reach the shelter.'}</p>
            </>}
            {panel === 'air' && <>
              <h2>{state.shift === 4 ? 'A safe place to wait.' : 'One repair before we go.'}</h2><p className="panel-description">{state.shift === 4 ? 'The walls reduce exposure. The fan brings fresh air.' : 'Repair the air branch. It cannot undo the earlier storm.'}</p>
              <div className="route-list">{ROUTES.map((route, index) => <button className={`button route-button ${draft.route === route ? 'is-selected' : ''}`} key={route}
                aria-pressed={draft.route === route} disabled={!canEdit} onClick={() => chooseRoute(route)}>
                <span className={`route-dots route-${route}`}>{'●'.repeat(index + 1)}</span><span>{route[0].toUpperCase() + route.slice(1)} route<small>{routeStatus(state, draft, route) === 'available' ? 'Clear for air' : routeStatus(state, draft, route) === 'locked' ? 'Needs Shift 1 connection' : 'Blocked by cargo'}</small></span>{draft.route === route && <Icon name="check" size={17} />}</button>)}</div>
              {state.shift === 5 && <button className={`button option-button ${draft.job === 'correction' ? 'is-selected' : ''}`} aria-pressed={draft.job === 'correction'} disabled={!canEdit}
                onClick={() => update({ ...draft, job: draft.job === 'correction' ? 'none' : 'correction' })}><Icon name="air" />Correct air branch<span className="button-meta">1 job</span></button>}
              {deviceButton('fan', 'Power the fan', 'air')}
              {state.shift === 4 && <button className={`button option-button ${draft.moveCrew ? 'is-selected' : ''}`} aria-pressed={draft.moveCrew} disabled={!canEdit} onClick={() => update({ ...draft, moveCrew: !draft.moveCrew })}><Icon name="crew" />Move crew to shelter<span className="button-meta">{draft.moveCrew ? <Icon name="check" size={16} /> : 'Order'}</span></button>}
              {useBattery}
            </>}
            {panel === 'garden' && <>
              <Icon name="garden" size={35} /><h2>A little care goes far.</h2><p className="panel-description">{state.harvested ? 'The harvest is safely in the food store. Thank you, little plants.' : 'The garden has had one care turn. One more brings two team rations.'}</p>
              <div className="garden-progress"><span className="done"><Icon name="check" size={16} />Planted</span><span className={state.harvested ? 'done' : ''}>{state.harvested && <Icon name="check" size={16} />}Harvest</span></div>
              {deviceButton('garden', state.harvested ? 'Already harvested' : 'Care for garden', 'garden', state.harvested)}{useBattery}
              <p className="hint">Harvest happens before the crew eats. Each care turn uses 1 power.</p>
            </>}
            {panel === 'workshop' && <>
              <Icon name="research" size={35} /><h2>Something worth sharing.</h2><p className="panel-description">The workshop can prepare the research crate. Sending it is a bonus; crew safety comes first.</p>
              <button className={`button option-button ${draft.job === 'research' ? 'is-selected' : ''}`} aria-pressed={draft.job === 'research'} disabled={!canEdit}
                onClick={() => update({ ...draft, job: draft.job === 'research' ? 'none' : 'research' })}><Icon name="research" />Prepare research<span className="button-meta">{draft.job === 'research' ? <Icon name="check" size={16} /> : '1 job'}</span></button>
              <p className="hint">One job this shift. Use the radio to send prepared research.</p>
              <button className="text-button" onClick={() => setPanel('radio')}>Open radio controls <Icon name="arrow" size={16} /></button>
            </>}
            {panel === 'radio' && <>
              <Icon name="radio" size={35} /><h2>A familiar voice.</h2><p className="panel-description">{state.shift === 4 ? 'A routine update is optional. Shelter comes first.' : 'Power the radio, then choose one message to send.'}</p>
              {deviceButton('radio', 'Power the radio', 'radio')}
              {state.shift === 5 && <fieldset className="message-options"><legend>One message</legend>{(['none', 'report', 'research'] as const).map(message => <label key={message}><input type="radio" name="message" value={message} checked={draft.message === message} disabled={!canEdit} onChange={() => update({ ...draft, message })} />{message === 'none' ? 'No message' : message === 'report' ? 'Station report' : 'Research results'}</label>)}</fieldset>}
              {useBattery}<p className="hint">The pickup call belongs to Shift 6, beyond this prototype.</p>
            </>}
            <div className="planning-notice" role="status" aria-live="polite">{notice || (preview.errors.length ? preview.errors[0] : 'Your changes are a plan. Nothing is used until you run the shift.')}</div>
          </div>
        </div>
      </section>
      <div className="view-controls" aria-label="Camera controls"><button className="icon-button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(.8, value - .1))}>−</button><button className="button small" aria-pressed={overview} onClick={() => { setOverview(value => !value); setZoom(1); }}>Overview</button><button className="icon-button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(1.35, value + .1))}>+</button></div>
      {phase === 'planning' && <footer className="commit-panel panel"><div className="preview-row"><span>After this shift</span><strong><Icon name="food" size={18} />{preview.next.food} rations</strong></div>
        <p>{state.shift === 4 ? preview.next.sheltered ? 'The crew will be sheltered.' : 'Shelter plan is not ready yet.' : state.shift === 5 ? preview.next.food >= 1 ? 'A ration remains for the final shift.' : 'No ration reserved for the final shift.' : `${ROUTES.filter(route => routeStatus(state, draft, route) === 'available').length} air routes available.`}</p>
        <button className="button primary run-button" disabled={!ready || !!modal || !!preview.errors.length} onClick={run}>Run shift {state.shift}<Icon name="arrow" /></button>
        {preview.errors.length > 0 && <span className="commit-reason">{preview.errors[0]}</span>}
      </footer>}
      <div className="crew-status"><Icon name="crew" size={17} />3 crew · {state.crewLocation === 'shelter' ? 'In shelter' : 'At habitat'}<span>Main air ready</span></div>
    </>}

    {!ready && !sceneError && <div className="loading-badge" role="status"><span className="loading-dot" />Getting the outpost ready… {Math.round(loadProgress * 100)}%</div>}
    {sceneError && <section className="scene-error panel" role="alert"><h2>The outpost needs a moment.</h2><p>3D could not start. Check that WebGL 2 is available, then try again. Your committed plan is kept.</p><button className="button primary" onClick={() => { setSceneError(false); setReady(false); setSceneGeneration(value => value + 1); }}>Retry 3D</button><button className="text-button" onClick={() => setScreen('title')}>Return to title</button></section>}
    {screen === 'game' && phase === 'resolving' && <div className="resolving-panel panel" role="status"><Icon name={state.shift === 4 ? 'crew' : 'check'} size={30} /><p>B.E.E.P. is on it.</p><button className="text-button" onClick={() => dispatch({ type: 'result' })}>Skip feedback</button></div>}
    {screen === 'game' && phase === 'result' && !modal && <Dialog title={state.shift === 3 ? 'Everything has a place.' : state.shift === 4 ? state.sheltered ? 'All three, safely inside.' : 'The storm has passed.' : 'A thoughtful shift.'} onClose={nextShift}>
      <span className="result-tag">SHIFT {state.shift} COMPLETE</span><ul className="result-list">{session.history.at(-1)?.effects.map(effect => <li key={effect}><Icon name="check" size={16} /><span>{effect}</span></li>)}</ul>
      <p className="crew-quote">{state.shift === 3 ? '“Room to work. Room to breathe.”' : state.shift === 4 ? state.sheltered ? '“We made it together. Nice work, B.E.E.P.”' : '“We need a safer plan for next time.”' : '“Small choices make a big difference.”'}</p>
      <button className="button primary" onClick={nextShift}>{state.shift === 5 ? 'See mission summary' : `Continue to shift ${state.shift + 1}`}<Icon name="arrow" /></button>
    </Dialog>}
    {screen === 'game' && phase === 'summary' && !modal && <Dialog title={readiness(state) ? 'Ready for the final shift.' : 'Let’s try another plan.'} onClose={() => setScreen('title')}>
      <p>{readiness(state) ? 'Three astronauts, a little more comfortable, thanks to you.' : 'Every plan teaches us something. Here is what the crew still needs.'}</p>
      <ul className="summary-list"><li><Icon name="crew" /><span>Storm shelter</span><strong>{state.sheltered ? 'All 3 protected' : 'Not protected'}</strong></li><li><Icon name="food" /><span>Food reserve</span><strong>{state.food} rations</strong></li><li><Icon name="air" /><span>Air branch</span><strong>{state.branchReady ? 'Ready' : 'Needs repair'}</strong></li><li><Icon name="research" /><span>Research bonus</span><strong>{state.message === 'research' ? 'Sent!' : state.sampleReady ? 'Prepared' : 'Not sent'}</strong></li></ul>
      <p className="cause-story">{state.harvested ? 'One more garden care turn added two rations before the crew ate.' : 'The garden needed one more care turn. Without its harvest, the final ration is missing.'} {state.sheltered === false ? state.branchReady ? 'Air readiness and a crew movement order are separate steps.' : 'The crew needed a clear route, fan power, and an order to move.' : ''}</p>
      <p className="hint">This slice ends after Shift 5. Pickup has not been requested yet.</p>
      <button className="button primary" onClick={restart}>Try another plan<Icon name="rotate" /></button><button className="text-button" onClick={() => setScreen('title')}>Return to title</button>
    </Dialog>}

    {modal && <Dialog title={modal === 'pause' ? 'A moment to think.' : modal === 'help' ? 'A few little pointers.' : modal === 'settings' ? 'Make yourself comfortable.' : modal === 'risk' ? state.shift === 4 ? 'Continue without shelter?' : 'Food is running short.' : modal === 'restart' ? 'Start a fresh plan?' : 'Return to the title?'} onClose={closeModal}>
      {modal === 'pause' && <div className="modal-menu"><button className="button primary" onClick={() => setModal(null)}>Resume</button><button className="button" onClick={() => openFromPause('help')}>How to play</button><button className="button" onClick={() => openFromPause('settings')}>Settings</button><button className="text-button" onClick={() => setModal('restart')}>Restart slice</button><button className="text-button" onClick={() => setModal('exit')}>Return to title</button></div>}
      {modal === 'help' && <><div className="help-row"><Icon name="cargo" size={30} /><div><h3>Choose. Place. Rotate.</h3><p>Select cargo, then a cell. Keep the top or bottom striped vent clear. R rotates a selected crate in the grid.</p></div></div><div className="help-row"><Icon name="power" size={30} /><div><h3>One little unit of power.</h3><p>The fan, garden, and radio each need one. Your battery adds one extra unit, once.</p></div></div><div className="help-row"><Icon name="crew" size={30} /><div><h3>Plan, then make it happen.</h3><p>Preview changes before running a shift. The shelter needs air and a crew movement order.</p></div></div><p className="hint">Use Tab to reach controls, arrows in the grid, and Enter or Space to choose. Escape pauses or closes a panel.</p><button className="button primary" onClick={closeModal}>Got it</button></>}
      {modal === 'settings' && <><label className="setting-row"><span><strong>Reduced motion</strong><small>Use immediate feedback instead of travel animations.</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={event => setSettings({ ...settings, reducedMotion: event.target.checked })} /></label><label className="setting-row"><span><strong>Low graphics</strong><small>Lower drawing resolution and simplify glass.</small></span><input type="checkbox" checked={settings.lowGraphics} onChange={event => setSettings({ ...settings, lowGraphics: event.target.checked })} /></label><button className="button primary" onClick={closeModal}>Done</button></>}
      {modal === 'risk' && <><div className="risk-message"><Icon name="warning" />{preview.risks.join(' ')}</div><p>You can return to your plan and change it. Continuing records this outcome.</p><button className="button primary" autoFocus onClick={() => setModal(null)}>Return to plan</button><button className="text-button danger-text" onClick={() => { setModal(null); setSelected(null); dispatch({ type: 'commit', acceptRisk: true }); }}>{state.shift === 4 ? 'Continue without shelter' : 'Continue with this food plan'}</button></>}
      {(modal === 'restart' || modal === 'exit') && <><p>Your current three-shift run will end. A fresh run starts with the same cargo and supplies.</p><button className="button primary" autoFocus onClick={() => setModal('pause')}>Keep playing</button><button className="text-button danger-text" onClick={() => { if (modal === 'restart') restart(); else { dispatch({ type: 'restart' }); setScreen('title'); setModal(null); } }}>{modal === 'restart' ? 'Restart slice' : 'Return to title'}</button></>}
    </Dialog>}
  </main>;
}
