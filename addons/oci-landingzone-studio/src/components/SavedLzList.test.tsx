import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { emptyLzModel } from '../model/defaults';
import { createLZ, saveDisasterRecoveryLZ, saveOutputs } from '../services/lzStore';
import { createDrDraft } from '../services/disasterRecoveryDesign';
import { drDesignFingerprint } from '../services/disasterRecoverySavedDesign';
import SavedLzList from './SavedLzList';

beforeEach(() => {
  const data = new Map<string, string>();
  Object.assign(globalThis, { window: { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } } });
});

describe('saved combined Landing Zone cards', () => {
  it('shows both regions and separate downloads without a redundant topology badge', () => {
    const model = emptyLzModel();
    const draft = { ...createDrDraft(model), region: 'eu-amsterdam-1', rpcEnabled: true };
    const saved = saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Saved Landing Zone' }).record!;
    saveOutputs(saved.id, { config: drDesignFingerprint(model, draft), files: {
      'Home/config.jsonnet': '{}', 'Home/network.json': '{}', 'DR/config.jsonnet': '{}', 'DR/network.json': '{}',
    } });
    const html = renderToStaticMarkup(<MemoryRouter><SavedLzList /></MemoryRouter>);
    expect(html).not.toContain('>Home + DR + RPC<');
    expect(html).toContain('Home: fra');
    expect(html).toContain('DR: ams');
    expect(html).toContain('Download LZ config');
    expect(html).toContain('Download LZ DR config');
    expect(html).not.toContain('Download Home + DR config');
    expect(html).not.toContain('>Stale<');
  });

  it('keeps Home-only cards and designs without RPC distinct', () => {
    const model = emptyLzModel();
    createLZ('Original Home', model);
    saveDisasterRecoveryLZ({ name: 'Combined', model, draft: { ...createDrDraft(model), region: 'eu-amsterdam-1', rpcEnabled: false }, sourceLabel: 'Saved Landing Zone' });
    const html = renderToStaticMarkup(<MemoryRouter><SavedLzList /></MemoryRouter>);
    expect(html).toContain('Original Home');
    expect(html).not.toContain('>Home + DR<');
    expect(html).not.toContain('Home + DR + RPC');
    expect(html).toContain('Download LZ DR config');
    expect(html).toContain('2 saved');
  });
});
