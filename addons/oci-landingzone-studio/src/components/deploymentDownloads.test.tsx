import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { strFromU8, unzipSync } from 'fflate';
import { emptyLzModel } from '../model/defaults';
import { createLZ, getOutputs, saveDisasterRecoveryLZ, saveOutputs } from '../services/lzStore';
import { createDrDraft } from '../services/disasterRecoveryDesign';
import { drDesignFingerprint } from '../services/disasterRecoverySavedDesign';
import { serializeConfig } from '../services/lzConfig';
import { generateOutputs } from '../generator/generate';
import { generateDrFileBundle } from '../services/disasterRecoveryGeneration';
import { downloadBlob } from '../export/zip';
import { WizardProvider } from '../wizard/wizardContext';
import ReviewStep from '../wizard/steps/ReviewStep';
import SavedLzList from './SavedLzList';

const controls = vi.hoisted(() => ({ id: '', buttons: [] as { children?: unknown; onClick?: () => Promise<void> }[] }));
vi.mock('react/jsx-dev-runtime', async (original) => {
  const actual = await original<typeof import('react/jsx-dev-runtime')>();
  return { ...actual, jsxDEV: (...args: Parameters<typeof actual.jsxDEV>) => {
    if (args[0] === 'button') controls.buttons.push(args[1] as (typeof controls.buttons)[number]);
    return actual.jsxDEV(...args);
  } };
});
vi.mock('react/jsx-runtime', async (original) => {
  const actual = await original<typeof import('react/jsx-runtime')>();
  return { ...actual, jsx: (...args: Parameters<typeof actual.jsx>) => {
    if (args[0] === 'button') controls.buttons.push(args[1] as (typeof controls.buttons)[number]);
    return actual.jsx(...args);
  } };
});
vi.mock('react-router-dom', async (original) => ({ ...await original<typeof import('react-router-dom')>(), useParams: () => ({ id: controls.id }) }));
vi.mock('../generator/generate', () => ({ generateOutputs: vi.fn() }));
vi.mock('../services/disasterRecoveryGeneration', () => ({ generateDrFileBundle: vi.fn() }));
vi.mock('../export/zip', async (original) => ({ ...await original<typeof import('../export/zip')>(), downloadBlob: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  controls.buttons = [];
  const data = new Map<string, string>();
  Object.assign(globalThis, { window: { localStorage: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } } });
});

function button(label: string) {
  const control = controls.buttons.find((item) => item.children === label);
  expect(control, `Missing ${label} button`).toBeDefined();
  return control!.onClick!;
}

async function downloadedFiles() {
  const blob = vi.mocked(downloadBlob).mock.calls.at(-1)![1];
  return Object.fromEntries(Object.entries(unzipSync(new Uint8Array(await blob.arrayBuffer()))).map(([name, value]) => [name, strFromU8(value)]));
}

describe('deployment downloads use the current factory', () => {
  it.each(['Review', 'saved card'])('regenerates matching cached outputs for every %s download', async (surface) => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    const record = createLZ('Home', model).record!;
    controls.id = record.id;
    const config = serializeConfig(model);
    saveOutputs(record.id, { config, files: { 'network.json': '{"revision":"old"}', 'removed.json': '{"revision":"old"}' } });
    vi.mocked(generateOutputs).mockResolvedValue({ config, files: { 'network.json': '{"revision":"fresh"}' }, primary: ['network.json'], secondary: [] });
    renderToStaticMarkup(<MemoryRouter>{surface === 'Review'
      ? <WizardProvider initialModel={model}><ReviewStep designName="Home" /></WizardProvider>
      : <SavedLzList />}</MemoryRouter>);
    const click = button(surface === 'Review' ? 'Download files' : 'Download LZ config');

    await click();
    await click();

    expect(generateOutputs).toHaveBeenCalledTimes(2);
    expect(await downloadedFiles()).toEqual({ 'config.jsonnet': config, 'network.json': '{"revision":"fresh"}' });
    expect(getOutputs(record.id)?.files).toEqual({ 'network.json': '{"revision":"fresh"}' });
  });

  it('regenerates each legacy regional download without merging cached files', async () => {
    const model = emptyLzModel();
    const draft = createDrDraft(model);
    const record = saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Home' }).record!;
    saveOutputs(record.id, { config: drDesignFingerprint(model, draft), files: {
      'Home/config.jsonnet': '{}', 'Home/network.json': '{"revision":"old"}', 'DR/config.jsonnet': '{}', 'DR/network.json': '{"revision":"old"}', 'Home/removed.json': '{"revision":"old"}',
    } });
    vi.mocked(generateDrFileBundle).mockResolvedValue({ 'Home/network.json': '{"revision":"fresh-home"}', 'DR/network.json': '{"revision":"fresh-dr"}' });
    renderToStaticMarkup(<MemoryRouter><SavedLzList /></MemoryRouter>);

    await button('Download LZ config')();
    expect(await downloadedFiles()).toEqual({ 'network.json': '{"revision":"fresh-home"}' });
    await button('Download LZ DR config')();
    expect(await downloadedFiles()).toEqual({ 'network.json': '{"revision":"fresh-dr"}' });
    expect(generateDrFileBundle).toHaveBeenCalledTimes(2);
    expect(getOutputs(record.id)?.files).toEqual({ 'Home/network.json': '{"revision":"fresh-home"}', 'DR/network.json': '{"revision":"fresh-dr"}' });
  });

  it.each(['Review', 'saved card', 'legacy card'])('retains the previous saved package without downloading it after %s generation fails', async (surface) => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    const draft = createDrDraft(model);
    const record = surface === 'legacy card'
      ? saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Home' }).record!
      : createLZ('Home', model).record!;
    controls.id = record.id;
    const files: Record<string, string> = surface === 'legacy card'
      ? { 'Home/config.jsonnet': '{}', 'Home/network.json': '{"revision":"old"}', 'DR/config.jsonnet': '{}', 'DR/network.json': '{"revision":"old"}' }
      : { 'network.json': '{"revision":"old"}' };
    saveOutputs(record.id, { config: surface === 'legacy card' ? drDesignFingerprint(model, draft) : serializeConfig(model), files });
    const saved = getOutputs(record.id);
    vi.mocked(generateOutputs).mockRejectedValue(new Error('Factory failed'));
    vi.mocked(generateDrFileBundle).mockRejectedValue(new Error('Factory failed'));
    renderToStaticMarkup(<MemoryRouter>{surface === 'Review'
      ? <WizardProvider initialModel={model}><ReviewStep designName="Home" /></WizardProvider>
      : <SavedLzList />}</MemoryRouter>);

    await button(surface === 'Review' ? 'Download files' : 'Download LZ config')();

    expect(downloadBlob).not.toHaveBeenCalled();
    expect(getOutputs(record.id)).toEqual(saved);
  });
});
