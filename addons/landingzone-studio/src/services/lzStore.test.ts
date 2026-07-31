import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLZ, deleteLZ, duplicateLZ, getLZ, listLZs, renameLZ, saveLZ,
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

beforeEach(() => {
  (globalThis as unknown as { window: unknown }).window = { localStorage: memoryStorage() };
});

describe('lzStore', () => {
  it('creates a record and lists it', () => {
    const rec = createLZ('Acme Prod');
    expect(rec.id).toBeTruthy();
    const list = listLZs();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: rec.id, name: 'Acme Prod' });
  });

  it('round-trips the canonical model via getLZ', () => {
    const rec = createLZ();
    const fetched = getLZ(rec.id);
    expect(fetched?.model).toEqual(emptyLzModel());
  });

  it('saveLZ updates the stored model', () => {
    const rec = createLZ();
    const next = { ...emptyLzModel(), environments: [{ name: 'prod', securityZone: true, network: envNetworkDefaults(0) }] };
    saveLZ(rec.id, next);
    expect(getLZ(rec.id)?.model.environments).toEqual([{ name: 'prod', securityZone: true, network: envNetworkDefaults(0) }]);
  });

  it('renameLZ updates name in record and index', () => {
    const rec = createLZ('Old');
    renameLZ(rec.id, 'New');
    expect(getLZ(rec.id)?.name).toBe('New');
    expect(listLZs()[0].name).toBe('New');
  });

  it('duplicateLZ clones the model under a new id with a "Copy of" name', () => {
    const rec = createLZ('Base');
    saveLZ(rec.id, { ...emptyLzModel(), foundation: { realm: 'oc1', region: 'us-ashburn-1', regionShortName: 'iad' } });
    const copy = duplicateLZ(rec.id);
    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(rec.id);
    expect(copy!.name).toBe('Copy of Base');
    expect(copy!.model.foundation.region).toBe('us-ashburn-1');
    expect(listLZs()).toHaveLength(2);
  });

  it('deleteLZ removes the record and its index entry', () => {
    const a = createLZ('A');
    const b = createLZ('B');
    deleteLZ(a.id);
    expect(getLZ(a.id)).toBeNull();
    const list = listLZs();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(listLZs()).toEqual([]);
  });
});
