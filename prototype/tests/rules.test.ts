import { describe, expect, it } from 'vitest';
import { evaluate, initialSession, initialSnapshot, makeDraft, placeItem, placementError, readiness,
  routeStatus, sessionReducer, toggleBattery, type Draft, type Session } from '../src/game/rules';

function stored() {
  const state = initialSnapshot();
  let draft = placeItem(state, makeDraft(state), 'research', { anchor: 0, vertical: true });
  draft = placeItem(state, draft, 'battery', { anchor: 6, vertical: false });
  return { state, draft };
}
function run(session: Session, draft: Draft): Session {
  let next = sessionReducer(session, { type: 'draft', draft });
  next = sessionReducer(next, { type: 'commit' });
  expect(next.phase).toBe('resolving');
  next = sessionReducer(next, { type: 'result' });
  return sessionReducer(next, { type: 'continue' });
}

describe('cargo and routes', () => {
  it('keeps the same draft after illegal overlap, edge placement, or rotation', () => {
    const { state, draft } = stored();
    expect(placeItem(state, draft, 'battery', { anchor: 0, vertical: false })).toBe(draft);
    expect(placeItem(state, draft, 'research', { anchor: 2, vertical: false })).toBe(draft);
    expect(placementError(state, draft, 'research', { anchor: 6, vertical: true })).toContain('inside');
    expect(evaluate(state, draft).errors).toEqual([]);
  });
  it('blocks unplaced cargo and requires a top or bottom opening in S3', () => {
    const { state } = stored();
    expect(evaluate(state, makeDraft(state)).errors).toHaveLength(2);
    let draft = placeItem(state, makeDraft(state), 'research', { anchor: 0, vertical: false });
    draft = placeItem(state, draft, 'battery', { anchor: 7, vertical: false });
    expect(routeStatus(state, draft, 'middle')).toBe('locked');
    expect(evaluate(state, draft).errors).toContain('Open the top or bottom vent before continuing.');
    expect(evaluate(state, placeItem(state, draft, 'research', { anchor: 0, vertical: true })).errors).toEqual([]);
  });
  it('returns a canceled battery to the tray when its cell was reused', () => {
    const { state, draft } = stored(); state.shift = 4;
    let next = toggleBattery(state, draft);
    next = placeItem(state, next, 'research', { anchor: 6, vertical: false });
    next = toggleBattery(state, next);
    expect(next.placements.battery).toBeNull();
    expect(evaluate(state, next).errors).toContain('Place the battery in storage.');
  });
});

describe('linked decisions', () => {
  it('completes the canonical garden + research route with matching preview and outcome', () => {
    const { draft } = stored();
    let session = run(initialSession(), draft);
    expect(session.state.food).toBe(2);
    const storm: Draft = { ...session.draft, route: 'top', moveCrew: true, battery: true, devices: ['fan', 'garden'] };
    const preview = evaluate(session.state, storm);
    session = run(session, storm);
    expect(session.history[1].after).toEqual(preview.next);
    expect(session.state.food).toBe(3);
    expect(session.state.crewLocation).toBe('habitat');
    session = run(session, { ...session.draft, job: 'research', message: 'research', devices: ['radio'] });
    expect(session.phase).toBe('summary');
    expect(session.state.food).toBe(2);
    expect(session.state.message).toBe('research');
    expect(session.state.placements.research).toEqual({ anchor: 0, vertical: true });
    expect(readiness(session.state)).toBe(true);
  });
  it('lets the player save the battery for garden + radio in S5', () => {
    let session = run(initialSession(), stored().draft);
    session = run(session, { ...session.draft, route: 'bottom', moveCrew: true, devices: ['fan'] });
    expect(session.state.food).toBe(1);
    session = run(session, { ...session.draft, battery: true, devices: ['garden', 'radio'], job: 'research', message: 'research' });
    expect(session.state.food).toBe(2);
    expect(readiness(session.state)).toBe(true);
  });
  it('accepts a crew-first plan without sending research', () => {
    let session = run(initialSession(), stored().draft);
    session = run(session, { ...session.draft, route: 'top', moveCrew: true, devices: ['fan'] });
    session = run(session, { ...session.draft, devices: ['garden'] });
    expect(readiness(session.state)).toBe(true);
    expect(session.state.message).toBe('none');
  });
  it('does not mistake ready ventilation for sheltered crew or permit a needless correction', () => {
    const { state, draft } = stored(); state.shift = 4;
    const plan: Draft = { ...draft, route: 'top', devices: ['fan'] };
    const result = evaluate(state, plan);
    expect(result.next.branchReady).toBe(true);
    expect(result.next.sheltered).toBe(false);
    expect(result.risks[0]).toContain('order to move');
    const later = { ...result.next, shift: 5 as const };
    expect(evaluate(later, { ...makeDraft(later), route: 'top', devices: ['fan'], job: 'correction' }).errors).toContain('The air branch is already ready; no correction is needed.');
  });
  it('requires confirmation for an unsafe storm and never rewrites it during correction', () => {
    const { state, draft } = stored(); state.shift = 4;
    let session: Session = { state, draft: { ...draft, route: 'top' }, phase: 'planning', history: [] };
    expect(sessionReducer(session, { type: 'commit' })).toBe(session);
    session = sessionReducer(session, { type: 'commit', acceptRisk: true });
    expect(session.state.sheltered).toBe(false);
    const later = { ...session.state, shift: 5 as const };
    const fixed = evaluate(later, { ...makeDraft(later), route: 'top', devices: ['fan'], job: 'correction' });
    expect(fixed.errors).toEqual([]);
    expect(fixed.next.branchReady).toBe(true);
    expect(fixed.next.sheltered).toBe(false);
  });
});

describe('resource and transition invariants', () => {
  it('deducts exactly once despite repeated commit, result, and continue inputs', () => {
    let session = { ...initialSession(), draft: stored().draft };
    session = sessionReducer(session, { type: 'commit' });
    expect(sessionReducer(session, { type: 'commit' })).toBe(session);
    expect(session.state.food).toBe(2);
    expect(session.history).toHaveLength(1);
    session = sessionReducer(session, { type: 'result' });
    expect(sessionReducer(session, { type: 'result' })).toBe(session);
    session = sessionReducer(session, { type: 'continue' });
    expect(sessionReducer(session, { type: 'continue' })).toBe(session);
  });
  it('does not mutate committed state during preview and resets the entire run', () => {
    const { state, draft } = stored();
    const original = structuredClone(state);
    evaluate(state, draft); expect(state).toEqual(original);
    const session = run(initialSession(), draft);
    expect(sessionReducer(session, { type: 'restart' })).toEqual(initialSession());
  });
  it('blocks over-budget power even after confirmation and rejects reused batteries', () => {
    const { state, draft } = stored(); state.shift = 4;
    expect(evaluate(state, { ...draft, battery: true, devices: ['fan', 'garden', 'radio'] }).errors[0]).toContain('more power');
    state.batteryUsed = true;
    expect(evaluate(state, { ...draft, battery: true }).errors).toContain('The battery is unavailable this shift.');
  });
  it('adds harvest before the meal, harvests only once, and keeps food nonnegative', () => {
    const { state, draft } = stored(); state.shift = 5; state.food = 0;
    const grown = evaluate(state, { ...draft, devices: ['garden'] });
    expect(grown.next.food).toBe(1);
    expect(grown.next.missedMeals).toBe(0);
    expect(evaluate({ ...grown.next }, { ...makeDraft(grown.next), devices: ['garden'] }).errors).toContain('The garden has already been harvested.');
    const hungry = evaluate(state, draft);
    expect(hungry.next.food).toBe(0);
    expect(hungry.next.missedMeals).toBe(1);
  });
  it('forecasts a missing S6 ration without claiming a missed meal in S5', () => {
    const { state, draft } = stored(); state.shift = 5; state.food = 1;
    const result = evaluate(state, draft);
    expect(result.risks[0]).toContain('final shift');
    expect(result.next.missedMeals).toBe(0);
    expect(readiness(result.next)).toBe(false);
  });
  it('requires powered radio and prepared research for a research transmission', () => {
    const { state, draft } = stored(); state.shift = 5;
    state.placements = structuredClone(draft.placements);
    expect(evaluate(state, { ...draft, message: 'research' }).errors).toHaveLength(2);
    expect(evaluate(state, { ...draft, job: 'research', devices: ['radio'], message: 'research' }).next.message).toBe('research');
  });
});
