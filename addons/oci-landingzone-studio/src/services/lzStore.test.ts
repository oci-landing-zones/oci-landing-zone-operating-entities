import { beforeEach, describe, expect, it } from 'vitest';
import {
  createLZ, createDrLZ, linkedHomeRecord, defaultLzName, deleteLZ, duplicateLZ, getLZ, listLZs, renameLZ, saveLZ, saveOutputs, saveDisasterRecoveryLZ, getOutputs, restoreCombinedDesign,
} from './lzStore';
import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import { createDrDraft } from './disasterRecoveryDesign';
import { legacyRegionalModel } from './regionalDeployment';
import { serializeConfig } from './lzConfig';
import { isCurrentOutputSet } from '../generator/outputNames';
import { drDesignFingerprint, isCurrentDrOutputSet } from './disasterRecoverySavedDesign';

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
  it.each(['regional', 'complete'] as const)('retains and restores the original combined source when the first edit uses %s scope', (scope) => {
    const home = emptyLzModel();
    const draft = { ...createDrDraft(home), region: 'eu-amsterdam-1' };
    const combined = saveDisasterRecoveryLZ({ name: 'Combined', model: home, draft, sourceLabel: 'Saved Home' }).record!;
    const regional = legacyRegionalModel(home, draft);
    regional.foundation.stackScope = scope;
    expect(saveLZ(combined.id, regional).ok).toBe(true);
    expect(getLZ(combined.id)?.previousCombinedDesign).toEqual({ home, draft, sourceLabel: 'Saved Home' });
    expect(getLZ(combined.id)?.disasterRecovery).toBeUndefined();
    regional.foundation.region = 'eu-paris-1';
    expect(saveLZ(combined.id, regional).ok).toBe(true);
    expect(getLZ(combined.id)?.previousCombinedDesign?.home).toEqual(home);
    const copy = duplicateLZ(combined.id).record!;
    expect(copy.previousCombinedDesign).toEqual(getLZ(combined.id)?.previousCombinedDesign);
    expect(restoreCombinedDesign(copy.id).ok).toBe(true);
    expect(getLZ(copy.id)?.disasterRecovery?.draft).toEqual(draft);
    expect(getLZ(copy.id)?.model).toEqual(home);
    expect(getLZ(combined.id)?.model).toEqual(regional);
  });
  it('saves a separate Home + DR + RPC design without changing its Home source', () => {
    const home = createSaved('Home source');
    const draft = { ...createDrDraft(home.model), region: 'eu-amsterdam-1', rpcEnabled: true };
    const saved = saveDisasterRecoveryLZ({ name: 'Home source · Home + DR + RPC', model: home.model, draft, sourceLabel: 'Saved Landing Zone' });
    expect(saved.ok).toBe(true);
    expect(saved.record?.id).not.toBe(home.id);
    expect(getLZ(saved.record!.id)?.disasterRecovery).toEqual({ draft, sourceLabel: 'Saved Landing Zone' });
    expect(getLZ(home.id)?.disasterRecovery).toBeUndefined();
    expect(listLZs()).toHaveLength(2);
  });

  it('updates and duplicates a combined design without losing DR selections or outputs', () => {
    const model = emptyLzModel();
    const draft = { ...createDrDraft(model), region: 'eu-amsterdam-1', rpcEnabled: true };
    const created = saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Imported config.jsonnet' }).record!;
    const changed = { ...draft, rpcEnabled: false, region: 'af-johannesburg-1' };
    expect(saveDisasterRecoveryLZ({ id: created.id, name: created.name, model, draft: changed, sourceLabel: 'Imported config.jsonnet' }).ok).toBe(true);
    expect(listLZs()).toHaveLength(1);
    expect(getLZ(created.id)?.disasterRecovery?.draft).toEqual(changed);
    saveOutputs(created.id, { config: 'snapshot', files: { 'DR/network.json': '{}' } });
    const copy = duplicateLZ(created.id).record!;
    expect(copy.disasterRecovery?.draft).toEqual(changed);
    expect(getOutputs(copy.id)?.files).toEqual({ 'DR/network.json': '{}' });
  });

  it('rolls back a DR update when the dashboard index cannot be written', () => {
    const model = emptyLzModel();
    const draft = createDrDraft(model);
    const created = saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Saved Landing Zone' }).record!;
    const previous = getLZ(created.id);
    const storage = window.localStorage;
    const write = storage.setItem.bind(storage);
    storage.setItem = (key, value) => { if (key === 'lzng.lz.index') throw new Error('quota'); write(key, value); };
    expect(saveDisasterRecoveryLZ({ id: created.id, name: 'Changed', model, draft: { ...draft, rpcEnabled: true }, sourceLabel: 'Saved Landing Zone' }).ok).toBe(false);
    expect(getLZ(created.id)).toEqual(previous);
    expect(listLZs()[0].name).toBe('Combined');
  });

  it('retains regional artifacts across reopen and marks them stale after a DR change', () => {
    const model = emptyLzModel();
    const draft = { ...createDrDraft(model), region: 'eu-amsterdam-1', rpcEnabled: true };
    const created = saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Saved Landing Zone' }).record!;
    const files = { 'Home/config.jsonnet': '{}', 'Home/network.json': '{}', 'DR/config.jsonnet': '{}', 'DR/network.json': '{}', 'Home-original/config.jsonnet': '{}' };
    expect(saveOutputs(created.id, { config: drDesignFingerprint(model, draft), files }).ok).toBe(true);
    expect(isCurrentDrOutputSet(getLZ(created.id)!, getOutputs(created.id)!)).toBe(true);
    expect(getOutputs(created.id)?.files).toEqual(files);
    saveDisasterRecoveryLZ({ id: created.id, name: 'Combined', model, draft: { ...draft, rpcEnabled: false }, sourceLabel: 'Saved Landing Zone' });
    expect(isCurrentDrOutputSet(getLZ(created.id)!, getOutputs(created.id)!)).toBe(false);
  });
  it('retains descriptions when saving, reopening and duplicating a design', () => {
    const saved = createSaved('Description test');
    saved.model.foundation.description = 'Finance production\nPrivate workloads';
    expect(saveLZ(saved.id, saved.model).ok).toBe(true);
    expect(getLZ(saved.id)?.model.foundation.description).toBe('Finance production\nPrivate workloads');
    const copied = duplicateLZ(saved.id);
    expect(copied.ok).toBe(true);
    const duplicate = listLZs().find((record) => record.id !== saved.id)!;
    expect(getLZ(duplicate.id)?.model.foundation.description).toBe('Finance production\nPrivate workloads');
  });
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

  it('starts new designs without Exadata and preserves selections in saved designs', () => {
    const rec = createSaved('Exadata draft');
    expect(rec.model.exadata.exacc.enabled).toBe(false);
    expect(rec.model.exadata.exacs.enabled).toBe(false);

    const selected = { ...rec.model, exadata: {
      ...rec.model.exadata,
      exacc: { ...rec.model.exadata.exacc, enabled: true },
    } };
    expect(saveLZ(rec.id, selected).ok).toBe(true);
    expect(getLZ(rec.id)?.model.exadata.exacc.enabled).toBe(true);
    expect(getLZ(rec.id)?.model.exadata.exacs.enabled).toBe(false);
    expect(createSaved('Fresh design').model.exadata.exacc.enabled).toBe(false);
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
    saveLZ(rec.id, { ...emptyLzModel(), foundation: { realm: 'oc1', region: 'us-ashburn-1', regionShortName: 'iad', cisLevel: 2 } });
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


describe('linked DR records', () => {
  it('copies all Home inputs with stable identities and no cached outputs', () => {
    const model = emptyLzModel();
    model.foundation.drRegion = 'eu-amsterdam-1';
    model.network.hubVcnCidr = '10.42.0.0/21';
    model.remotePeeringConnections = [{ id: 'rpc-1', name: 'peer', role: 'acceptor', peerRegionName: 'eu-paris-1', remoteCidrs: ['172.20.0.0/16'] }];
    const home = createLZ('Home', model).record!;
    saveOutputs(home.id, { config: serializeConfig(model), files: { 'network.json': '{}' } });
    const before = window.localStorage.getItem(`lzng.lz.${home.id}`);
    const result = createDrLZ(home.id);
    expect(result.ok).toBe(true);
    const dr = result.record!;
    expect(dr).toMatchObject({ name: 'Home DR', homeLzId: home.id });
    expect(dr.id).not.toBe(home.id);
    expect(dr.model).toEqual({ ...model, foundation: { ...model.foundation, stackScope: 'regional', homeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams', drRegion: undefined } });
    expect(dr.model.network).not.toBe(model.network);
    expect(dr.model.environments[0].network).not.toBe(model.environments[0].network);
    expect(getOutputs(dr.id)).toBeNull();
    expect(window.localStorage.getItem(`lzng.lz.${home.id}`)).toBe(before);
    expect(linkedHomeRecord(dr)?.id).toBe(home.id);
    expect(serializeConfig(dr.model)).not.toContain(home.id);
    expect(JSON.parse(window.localStorage.getItem(`lzng.lz.${dr.id}`)!)).toMatchObject({ homeLzId: home.id });
  });

  it.each(['', 'eu-frankfurt-1', 'invalid', 'eu-madrid-2'])('starts with an empty DR region for an unavailable Home DR setting: %s', (region) => {
    const home = createSaved('Home');
    home.model.foundation.drRegion = region;
    saveLZ(home.id, home.model);
    expect(createDrLZ(home.id).record!.model.foundation).toMatchObject({ region: '', regionShortName: '', homeRegion: 'eu-frankfurt-1' });
  });

  it('supports an empty Home environment set', () => {
    const model = { ...emptyLzModel(), environments: [], projects: [] };
    const home = createLZ('Hub only', model).record!;
    expect(createDrLZ(home.id).record!.model.environments).toEqual([]);
  });

  it('rejects regional, combined, linked, corrupt and ambiguous Home sources', () => {
    const regional = emptyLzModel();
    regional.foundation.stackScope = 'regional';
    expect(createDrLZ(createLZ('Regional', regional).record!.id).ok).toBe(false);
    const home = createSaved('Home');
    const combined = saveDisasterRecoveryLZ({ name: 'Combined', model: home.model, draft: createDrDraft(home.model), sourceLabel: 'Home' }).record!;
    expect(createDrLZ(combined.id).ok).toBe(false);
    const dr = createDrLZ(home.id).record!;
    expect(createDrLZ(dr.id).ok).toBe(false);
    for (const patch of [
      { model: { ...home.model, version: 'bad' } },
      { model: { ...home.model, version: '0.16.0', environments: [home.model.environments[0], home.model.environments[0]] } },
      { model: { ...home.model, exadata: undefined } },
      { model: { ...home.model, environments: [{ ...home.model.environments[0], id: '' }] } },
      { model: { ...home.model, projects: [{ ...home.model.projects[0], id: '' }] } },
      { model: { ...home.model, environments: [home.model.environments[0], home.model.environments[0]] } },
      { model: { ...home.model, environments: [{ ...home.model.environments[0], name: '' }] } },
      { homeLzId: dr.id },
    ]) {
      window.localStorage.setItem(`lzng.lz.${home.id}`, JSON.stringify({ ...home, ...patch }));
      expect(createDrLZ(home.id).ok).toBe(false);
      expect(linkedHomeRecord(dr)).toBeNull();
      expect(getLZ(dr.id)?.model.environments).toEqual(dr.model.environments);
    }
    expect(createDrLZ('missing').ok).toBe(false);
  });

  it('derives Home membership, order and names on every read while retaining DR network choices', () => {
    const home = createSaved('Home');
    const dr = createDrLZ(home.id).record!;
    dr.model.environments[0].network = { vcnCidr: '172.16.0.0/21', subnets: [{ name: 'web', cidr: '172.16.0.0/24' }] };
    dr.model.environments[0].projectNetworkEnabled = false;
    expect(saveLZ(dr.id, dr.model).ok).toBe(true);
    const stored = window.localStorage.getItem(`lzng.lz.${dr.id}`);
    const added = { id: 'new-environment', name: 'dev', securityZone: false, network: envNetworkDefaults(2, 'dev') };
    home.model.environments = [home.model.environments[1], { ...home.model.environments[0], name: 'production' }, added];
    expect(saveLZ(home.id, home.model).ok).toBe(true);
    const fetched = getLZ(dr.id)!;
    expect(fetched.model.environments.map(({ id, name }) => ({ id, name }))).toEqual(home.model.environments.map(({ id, name }) => ({ id, name })));
    expect(fetched.model.environments[1]).toMatchObject({ projectNetworkEnabled: false, network: dr.model.environments[0].network });
    expect(fetched.model.environments[2]).toEqual(added);
    expect(window.localStorage.getItem(`lzng.lz.${dr.id}`)).toBe(stored);
    expect(getLZ(home.id)?.model.environments).toEqual(home.model.environments);
  });

  it('enforces fresh Home metadata when an older DR tab saves, retaining independent DR inputs', () => {
    const home = createSaved('Home');
    const dr = createDrLZ(home.id).record!;
    const stale = structuredClone(dr.model);
    home.model.foundation.region = 'us-ashburn-1';
    home.model.foundation.realm = 'oc19';
    home.model.environments = [{ ...home.model.environments[1], name: 'renamed' }];
    saveLZ(home.id, home.model);
    const homeBefore = window.localStorage.getItem(`lzng.lz.${home.id}`);
    stale.foundation = { ...stale.foundation, stackScope: 'complete', realm: 'wrong', homeRegion: 'wrong', region: 'eu-madrid-2', regionShortName: 'vll' };
    stale.environments[1].network.vcnCidr = '172.20.0.0/21';
    stale.environments[1].name = 'illegal-rename';
    expect(saveLZ(dr.id, stale).ok).toBe(true);
    const saved = getLZ(dr.id)!;
    expect(saved.model.foundation).toMatchObject({ stackScope: 'regional', realm: 'oc19', homeRegion: 'us-ashburn-1', region: 'eu-madrid-2' });
    expect(saved.model.environments).toHaveLength(1);
    expect(saved.model.environments[0]).toMatchObject({ id: home.model.environments[0].id, name: 'renamed', network: { vcnCidr: '172.20.0.0/21' } });
    expect(saved.homeLzId).toBe(home.id);
    expect(window.localStorage.getItem(`lzng.lz.${home.id}`)).toBe(homeBefore);
  });

  it('keeps missing or changed-scope sources as visible orphan links without losing the saved snapshot', () => {
    const home = createSaved('Home');
    const dr = createDrLZ(home.id).record!;
    const before = window.localStorage.getItem(`lzng.lz.${dr.id}`);
    saveOutputs(dr.id, { config: 'retained', files: { 'network.json': '{}' } });
    home.model.foundation.stackScope = 'regional';
    saveLZ(home.id, home.model);
    expect(getLZ(dr.id)?.homeLzId).toBe(home.id);
    expect(getLZ(dr.id)?.model).toEqual(dr.model);
    expect(linkedHomeRecord(dr)).toBeNull();
    expect(saveLZ(dr.id, { ...dr.model, environments: [] })).toMatchObject({ ok: false, message: expect.stringMatching(/Home.*unavailable/) });
    expect(window.localStorage.getItem(`lzng.lz.${dr.id}`)).toBe(before);
    deleteLZ(home.id);
    expect(getLZ(dr.id)?.homeLzId).toBe(home.id);
    expect(getLZ(dr.id)?.model).toEqual(dr.model);
    expect(getOutputs(dr.id)?.config).toBe('retained');
  });

  it('marks linked outputs stale after Home changes and never copies the stale cache', () => {
    const home = createSaved('Home');
    const dr = createDrLZ(home.id).record!;
    saveOutputs(dr.id, { config: serializeConfig(dr.model), files: { 'network.json': '{}' } });
    expect(isCurrentOutputSet(getOutputs(dr.id), serializeConfig(getLZ(dr.id)!.model))).toBe(true);
    home.model.environments[0].name = 'renamed';
    saveLZ(home.id, home.model);
    expect(isCurrentOutputSet(getOutputs(dr.id), serializeConfig(getLZ(dr.id)!.model))).toBe(false);
    const copy = duplicateLZ(dr.id).record!;
    expect(copy.homeLzId).toBe(home.id);
    expect(copy.model.environments[0].name).toBe('renamed');
    expect(getOutputs(copy.id)).toBeNull();
  });

  it('copies a linked record and its current output cache while retaining the relationship', () => {
    const home = createSaved('Home');
    const dr = createDrLZ(home.id).record!;
    saveOutputs(dr.id, { config: serializeConfig(dr.model), files: { 'network.json': '{}' } });
    const copy = duplicateLZ(dr.id).record!;
    expect(copy.homeLzId).toBe(home.id);
    expect(getOutputs(copy.id)?.config).toBe(serializeConfig(copy.model));
  });

  it('rolls back linked creation and save failures without writing the Home record', () => {
    const home = createSaved('Home');
    const dr = createDrLZ(home.id).record!;
    const drBefore = window.localStorage.getItem(`lzng.lz.${dr.id}`);
    home.model.environments[0].name = 'new-name';
    saveLZ(home.id, home.model);
    const homeBefore = window.localStorage.getItem(`lzng.lz.${home.id}`);
    const write = window.localStorage.setItem.bind(window.localStorage);
    const keys: string[] = [];
    window.localStorage.setItem = (key, value) => { keys.push(key); if (key === 'lzng.lz.index') throw new Error('quota'); write(key, value); };
    expect(createDrLZ(home.id).ok).toBe(false);
    expect(listLZs()).toHaveLength(2);
    expect(saveLZ(dr.id, { ...dr.model, environments: [] }).ok).toBe(false);
    expect(window.localStorage.getItem(`lzng.lz.${dr.id}`)).toBe(drBefore);
    expect(window.localStorage.getItem(`lzng.lz.${home.id}`)).toBe(homeBefore);
    expect(keys).not.toContain(`lzng.lz.${home.id}`);
    expect(keys.filter((key) => /^lzng\.lz\.(?!index)/.test(key))).toHaveLength(3);
  });
});
