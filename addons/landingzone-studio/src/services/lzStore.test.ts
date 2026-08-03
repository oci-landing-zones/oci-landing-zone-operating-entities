import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLZ, defaultLzName, deleteLZ, duplicateLZ, getLZ, listLZs, renameLZ, saveLZ, saveOutputs,
} from './lzStore';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  };
}

function createSaved(name?: string) {
  const result = createLZ(name);
  expect(result.ok).toBe(true);
  expect(result.record).toBeDefined();
  return result.record!;
}

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: memoryStorage() };
});

describe('lzStore', () => {
  it('creates browser-local date names from an injected clock', () => {
    const clock = new Date(2026, 7, 3, 9, 7, 42);
    const created = createLZ(undefined, emptyLzModel(), clock);
    expect(created.record).toMatchObject({
      name: 'Landing Zone 2026-08-03 09:07',
      createdAt: clock.toISOString(),
      updatedAt: clock.toISOString(),
    });
  });

  it('adds the first available collision suffix to generated names', () => {
    const clock = new Date(2026, 7, 3, 9, 7);
    expect(defaultLzName(clock, [
      'Landing Zone 2026-08-03 09:07',
      'Landing Zone 2026-08-03 09:07 (2)',
      'Landing Zone 2026-08-03 09:07 (4)',
    ])).toBe('Landing Zone 2026-08-03 09:07 (3)');

    createLZ(undefined, emptyLzModel(), clock);
    expect(createLZ(undefined, emptyLzModel(), clock).record?.name).toBe('Landing Zone 2026-08-03 09:07 (2)');
  });

  it('creates a record and lists it', () => {
    const rec = createSaved('Acme Prod');
    expect(rec.id).toBeTruthy();
    const list = listLZs();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: rec.id, name: 'Acme Prod' });
  });

  it('round-trips the canonical model via getLZ', () => {
    const rec = createSaved();
    const fetched = getLZ(rec.id);
    expect(fetched?.model).toEqual(emptyLzModel());
  });

  it('saveLZ updates the stored model', () => {
    const rec = createSaved();
    const next = { ...emptyLzModel(), environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }] };
    saveLZ(rec.id, next);
    expect(getLZ(rec.id)?.model.environments).toEqual([{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }]);
  });

  it('renameLZ updates name in record and index', () => {
    const rec = createSaved('Old');
    renameLZ(rec.id, 'New');
    expect(getLZ(rec.id)?.name).toBe('New');
    expect(listLZs()[0].name).toBe('New');
  });

  it('does not commit an empty name', () => {
    const rec = createSaved('Keep me');
    expect(renameLZ(rec.id, '   ')).toMatchObject({ ok: false, message: expect.stringMatching(/cannot be empty/) });
    expect(getLZ(rec.id)?.name).toBe('Keep me');
    expect(listLZs()[0].name).toBe('Keep me');
  });

  it('persists consecutive model and name changes immediately', () => {
    const rec = createSaved('Initial');
    const first = { ...emptyLzModel(), foundation: { ...emptyLzModel().foundation, region: 'us-ashburn-1', regionShortName: 'iad' } };
    const second = { ...first, environments: [{ id: 'environment-1', name: 'prod', securityZone: true, network: envNetworkDefaults(0) }] };
    expect(saveLZ(rec.id, first).ok).toBe(true);
    expect(renameLZ(rec.id, 'Current').ok).toBe(true);
    expect(saveLZ(rec.id, second).ok).toBe(true);
    expect(getLZ(rec.id)).toMatchObject({ name: 'Current', model: second });
  });

  it('duplicateLZ clones the model under a new id with a "Copy of" name', () => {
    const rec = createSaved('Base');
    saveLZ(rec.id, { ...emptyLzModel(), foundation: { realm: 'oc1', region: 'us-ashburn-1', regionShortName: 'iad' } });
    const copy = duplicateLZ(rec.id);
    expect(copy.ok).toBe(true);
    expect(copy.record!.id).not.toBe(rec.id);
    expect(copy.record!.name).toBe('Copy of Base');
    expect(copy.record!.model.foundation.region).toBe('us-ashburn-1');
    expect(listLZs()).toHaveLength(2);
  });

  it('deleteLZ removes the record and its index entry', () => {
    const a = createSaved('A');
    const b = createSaved('B');
    deleteLZ(a.id);
    expect(getLZ(a.id)).toBeNull();
    const list = listLZs();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(listLZs()).toEqual([]);
  });

  it('returns a visible failure instead of throwing when browser storage rejects writes', () => {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: { ...memoryStorage(), setItem: () => { throw new Error('quota'); } },
    };
    const created = createLZ();
    expect(created).toMatchObject({ ok: false, message: expect.stringMatching(/not saved/) });
  });

  it('reports when generated ZIP persistence fails without discarding the generated result', () => {
    const rec = createSaved();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: { ...memoryStorage(), setItem: () => { throw new Error('quota'); } },
    };
    expect(saveOutputs(rec.id, { config: '{}', files: { 'network.json': '{}' } })).toMatchObject({ ok: false, message: expect.stringMatching(/ZIP was downloaded/) });
  });
});
