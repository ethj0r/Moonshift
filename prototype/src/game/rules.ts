export type Shift = 3 | 4 | 5;
export type Item = 'battery' | 'research';
export type Route = 'top' | 'middle' | 'bottom';
export type Device = 'fan' | 'garden' | 'radio';
export type Placement = { anchor: number; vertical: boolean };
export type Job = 'none' | 'research' | 'correction';
export type Message = 'none' | 'report' | 'research';
export type Phase = 'planning' | 'resolving' | 'result' | 'summary';

export interface Snapshot {
  shift: Shift;
  food: number;
  missedMeals: number;
  batteryUsed: boolean;
  placements: Record<Item, Placement | null>;
  gardenTurns: number;
  harvested: boolean;
  branchReady: boolean;
  sheltered: boolean | null;
  crewLocation: 'habitat' | 'shelter';
  sampleReady: boolean;
  message: Message;
  routineSent: boolean;
}

export interface Draft {
  placements: Record<Item, Placement | null>;
  battery: boolean;
  devices: Device[];
  route: Route | null;
  moveCrew: boolean;
  job: Job;
  message: Message;
}

export interface Evaluation {
  next: Snapshot;
  errors: string[];
  risks: string[];
  effects: string[];
  power: { used: number; available: number };
}

export interface Session {
  state: Snapshot;
  draft: Draft;
  phase: Phase;
  history: { shift: Shift; before: Snapshot; after: Snapshot; effects: string[] }[];
}

export const ITEMS: Item[] = ['battery', 'research'];
export const ROUTES: Route[] = ['top', 'middle', 'bottom'];
export const ROUTE_CELL: Record<Route, number> = { top: 1, middle: 4, bottom: 7 };
export const cellName = (cell: number) => `${'ABC'[Math.floor(cell / 3)]}${cell % 3 + 1}`;
export const itemName = (item: Item) => item === 'battery' ? 'Spare battery' : 'Research crate';

export function initialSnapshot(): Snapshot {
  return { shift: 3, food: 3, missedMeals: 0, batteryUsed: false,
    placements: { battery: null, research: null }, gardenTurns: 1, harvested: false,
    branchReady: false, sheltered: null, crewLocation: 'habitat', sampleReady: false,
    message: 'none', routineSent: false };
}

export function makeDraft(state: Snapshot): Draft {
  return { placements: structuredClone(state.placements), battery: false, devices: [],
    route: null, moveCrew: false, job: 'none', message: 'none' };
}

export function initialSession(): Session {
  const state = initialSnapshot();
  return { state, draft: makeDraft(state), phase: 'planning', history: [] };
}

export function footprint(item: Item, placement: Placement): number[] {
  return item === 'battery' ? [placement.anchor] : [placement.anchor, placement.anchor + (placement.vertical ? 3 : 1)];
}

function legalFootprint(item: Item, placement: Placement) {
  return Number.isInteger(placement.anchor) && placement.anchor >= 0 && placement.anchor < 9
    && footprint(item, placement).every(cell => cell < 9)
    && !(item === 'research' && !placement.vertical && placement.anchor % 3 === 2);
}

export function occupied(state: Snapshot, draft: Draft): Map<number, Item> {
  const cells = new Map<number, Item>();
  for (const item of ITEMS) {
    if (item === 'battery' && (state.batteryUsed || draft.battery)) continue;
    const placement = draft.placements[item];
    if (placement) for (const cell of footprint(item, placement)) cells.set(cell, item);
  }
  return cells;
}

export function routeStatus(state: Snapshot, draft: Draft, route: Route): 'blocked' | 'locked' | 'available' {
  if (occupied(state, draft).has(ROUTE_CELL[route])) return 'blocked';
  return route === 'middle' ? 'locked' : 'available';
}

export function placementError(state: Snapshot, draft: Draft, item: Item, placement: Placement): string | null {
  if (state.shift === 5) return 'Storage is locked after the storm.';
  if (item === 'battery' && (state.batteryUsed || draft.battery)) return 'This battery is already scheduled or used.';
  if (!legalFootprint(item, placement)) return 'Both crate cells must fit inside the board.';
  const other = new Map(occupied(state, draft));
  for (const [cell, owner] of other) if (owner === item) other.delete(cell);
  const collision = footprint(item, placement).find(cell => other.has(cell));
  return collision === undefined ? null : `${cellName(collision)} already holds the ${other.get(collision) === 'battery' ? 'battery' : 'research crate'}.`;
}

export function placeItem(state: Snapshot, draft: Draft, item: Item, placement: Placement): Draft {
  return placementError(state, draft, item, placement) ? draft
    : { ...draft, placements: { ...draft.placements, [item]: placement } };
}

export function toggleBattery(state: Snapshot, draft: Draft): Draft {
  if (state.shift === 3 || state.batteryUsed) return draft;
  if (!draft.battery) return { ...draft, battery: true };
  const restored = { ...draft, battery: false };
  const previous = draft.placements.battery;
  if (previous && placementError(state, restored, 'battery', previous)) {
    return { ...restored, placements: { ...restored.placements, battery: null } };
  }
  return restored;
}

export function evaluate(state: Snapshot, draft: Draft): Evaluation {
  const next = structuredClone(state);
  const errors: string[] = [], risks: string[] = [], effects: string[] = [];
  const power = { used: draft.devices.length, available: 1 + Number(draft.battery && !state.batteryUsed) };
  const selected = new Set(draft.devices);
  if (selected.size !== draft.devices.length) errors.push('A device can only receive power once.');
  if (power.used > power.available) errors.push(`Your plan needs ${power.used - power.available} more power. Turn a device off or use the battery.`);
  if (draft.battery && (state.batteryUsed || state.shift === 3)) errors.push('The battery is unavailable this shift.');
  const allowed: Device[] = state.shift === 3 ? [] : state.shift === 4 ? ['fan', 'garden', 'radio'] : ['garden', 'radio', 'fan'];
  if (draft.devices.some(device => !allowed.includes(device))) errors.push('This device cannot run during this shift.');
  if (state.shift !== 5 && (draft.job !== 'none' || draft.message !== 'none')) errors.push('Jobs and chosen messages open in Shift 5.');

  const used = new Set<number>();
  for (const item of ITEMS) {
    if (item === 'battery' && (state.batteryUsed || draft.battery)) continue;
    const placement = draft.placements[item];
    if (!placement) errors.push(`Place the ${item === 'battery' ? 'battery' : 'research crate'} in storage.`);
    else if (!legalFootprint(item, placement)) errors.push('Cargo must fit inside the board.');
    else for (const cell of footprint(item, placement)) {
      if (used.has(cell)) errors.push(`Two items overlap at ${cellName(cell)}.`);
      used.add(cell);
    }
  }
  if (state.shift === 5 && JSON.stringify(state.placements) !== JSON.stringify(draft.placements)) errors.push('Storage positions are locked after Shift 4.');
  const routeAvailable = draft.route !== null && routeStatus(state, draft, draft.route) === 'available';
  if (state.shift === 3 && !ROUTES.some(route => routeStatus(state, draft, route) === 'available')) errors.push('Open the top or bottom vent before continuing.');
  if (selected.has('garden') && state.harvested) errors.push('The garden has already been harvested.');
  next.placements = structuredClone(draft.placements);
  if (draft.battery && !state.batteryUsed) {
    next.batteryUsed = true;
    next.placements.battery = null;
    effects.push('Spare battery used: +1 power this shift.');
  }
  if (state.shift === 4) {
    next.branchReady = routeAvailable && selected.has('fan');
    next.sheltered = next.branchReady && draft.moveCrew;
    next.crewLocation = next.sheltered ? 'shelter' : 'habitat';
    if (!next.sheltered) {
      risks.push(!draft.route ? 'Choose an air route, power the fan, and order the crew to shelter.'
        : !routeAvailable ? 'The selected route cannot carry air. The crew will remain exposed.'
          : !selected.has('fan') ? 'The fan has no power. The crew cannot shelter.'
            : 'Air is ready, but the crew has no order to move. They will stay in the habitat.');
    }
    effects.push(next.sheltered ? 'All three astronauts sheltered during the storm.' : 'The crew did not shelter during the storm.');
    if (selected.has('radio')) { next.routineSent = true; effects.push('Routine station update sent.'); }
  }
  if (state.shift === 5) {
    if (selected.has('fan') && draft.job !== 'correction') errors.push('Fan power in Shift 5 requires the route correction job.');
    if (draft.job === 'correction') {
      if (state.branchReady) errors.push('The air branch is already ready; no correction is needed.');
      if (!routeAvailable) errors.push('Choose an available air route for the correction.');
      if (!selected.has('fan')) errors.push('Route correction needs one power unit for the fan.');
      if (!state.branchReady && routeAvailable && selected.has('fan')) {
        next.branchReady = true;
        effects.push('Air branch corrected. The earlier storm outcome stays unchanged.');
      }
    }
    if (draft.job === 'research') { next.sampleReady = true; effects.push('Research prepared in the workshop.'); }
    if (draft.message !== 'none') {
      if (!selected.has('radio')) errors.push('Power the radio before sending a message.');
      if (draft.message === 'research' && !next.sampleReady) errors.push('Prepare the research before sending it.');
      if (selected.has('radio') && (draft.message !== 'research' || next.sampleReady)) {
        next.message = draft.message;
        effects.push(draft.message === 'research' ? 'Research sent to the team.' : 'Station report sent.');
      }
    }
  }
  if (selected.has('garden') && !state.harvested) {
    next.gardenTurns += 1;
    if (next.gardenTurns >= 2) {
      next.harvested = true; next.food += 2;
      effects.push('Garden harvest: +2 team rations.');
    }
  }
  if (state.shift === 5 && next.food < 2) risks.push('There will not be enough food for Shift 5 and the final shift. Finish the garden care if you can.');
  if (next.food > 0) { next.food -= 1; effects.push('One team ration shared by the three astronauts.'); }
  else { next.missedMeals += 1; effects.push('The crew missed a team ration.'); }
  return { next, errors: [...new Set(errors)], risks, effects, power };
}

export type SessionAction = { type: 'draft'; draft: Draft } | { type: 'commit'; acceptRisk?: boolean }
  | { type: 'result' } | { type: 'continue' } | { type: 'restart' };

export function sessionReducer(session: Session, action: SessionAction): Session {
  if (action.type === 'restart') return initialSession();
  if (action.type === 'draft') return session.phase === 'planning' ? { ...session, draft: action.draft } : session;
  if (action.type === 'commit') {
    if (session.phase !== 'planning') return session;
    const result = evaluate(session.state, session.draft);
    if (result.errors.length || (result.risks.length && !action.acceptRisk)) return session;
    return { ...session, state: result.next, phase: 'resolving',
      history: [...session.history, { shift: session.state.shift, before: session.state, after: result.next, effects: result.effects }] };
  }
  if (action.type === 'result') return session.phase === 'resolving' ? { ...session, phase: 'result' } : session;
  if (action.type === 'continue' && session.phase === 'result') {
    if (session.state.shift === 5) return { ...session, phase: 'summary' };
    const state = { ...session.state, shift: (session.state.shift + 1) as Shift, crewLocation: 'habitat' as const };
    return { ...session, state, draft: makeDraft(state), phase: 'planning' };
  }
  return session;
}

export function readiness(state: Snapshot) {
  return state.sheltered === true && state.missedMeals === 0 && state.food >= 1;
}
