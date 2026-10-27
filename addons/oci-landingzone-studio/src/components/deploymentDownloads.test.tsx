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
import { downloadTextFile } from '../export/download';
import { loadDiagramPreview } from '../services/diagramPreview';
import type { DiagramModel } from '../model/types';
import type { DiagramPreview } from '../services/diagramPreview.worker';
import type { HomeRegionSource } from '../wizard/wizardContext';
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
vi.mock('../services/diagramPreview', () => ({ loadDiagramPreview: vi.fn() }));
vi.mock('../export/download', () => ({ downloadTextFile: vi.fn() }));
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

describe('diagram downloads', () => {
  const preview: DiagramPreview = { tables: [], inventory: { compartments: [], groups: [] }, files: ['network.json'] };
  const visible: DiagramModel = { nodes: [{ id: 'visible-dr', kind: 'region', label: 'Visible DR diagram', x: 0, y: 0, width: 100, height: 100 }], edges: [] };

  function renderReview(regional: boolean, homeSource?: HomeRegionSource) {
    const model = emptyLzModel();
    model.foundation.stackScope = regional ? 'regional' : 'complete';
    return renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model} homeSource={homeSource}>
      <ReviewStep designName="DR export" getDiagram={() => visible} diagramOptions={{ showEndpoints: true }} />
    </WizardProvider></MemoryRouter>);
  }

  it('includes a fresh Home page and retains the visible DR page and selected layers', async () => {
    const home = emptyLzModel();
    vi.mocked(loadDiagramPreview).mockResolvedValue(preview);
    const html = renderReview(true, { id: 'home', model: home });
    expect(html).toContain('separate DR and Home Region pages');
    await button('Export diagram (.drawio)')();
    const xml = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(xml.match(/<diagram\b/g)).toHaveLength(2);
    expect(xml).toContain('name="DR"');
    expect(xml).toContain('name="Home Region"');
    expect(xml).toContain('Visible DR diagram');
    expect(xml).toContain('sn-fra-lz-prod-web');
    expect(xml).toContain('cmp-env-0-vcn-sn-0-ep-icon');
    expect(vi.mocked(loadDiagramPreview).mock.calls[0][0]).toEqual(home);
    expect(downloadTextFile).toHaveBeenCalledWith('dr-export.drawio', xml, 'application/xml');
  });

  it.each([false, true])('exports a single page without inventing a Home source: regional=%s', async (regional) => {
    const html = renderReview(regional);
    if (regional) expect(html).toContain('no linked Home Region');
    await button('Export diagram (.drawio)')();
    const xml = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(xml.match(/<diagram\b/g)).toHaveLength(1);
    expect(xml).toContain(`name="${regional ? 'DR' : 'Landing Zone'}"`);
    expect(loadDiagramPreview).not.toHaveBeenCalled();
  });

  it('does not silently omit the Home page when the linked source is missing or generation fails', async () => {
    renderReview(true, { id: 'missing-home' });
    await button('Export diagram (.drawio)')();
    expect(loadDiagramPreview).not.toHaveBeenCalled();
    expect(downloadTextFile).not.toHaveBeenCalled();
    controls.buttons = [];
    renderReview(true, { id: 'home', model: emptyLzModel() });
    vi.mocked(loadDiagramPreview).mockRejectedValueOnce(new Error('Home generation failed'));
    await button('Export diagram (.drawio)')();
    expect(downloadTextFile).not.toHaveBeenCalled();
  });

  it('cancels a superseded export and prevents its late result from downloading', async () => {
    let finishFirst!: (value: DiagramPreview) => void;
    vi.mocked(loadDiagramPreview)
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce(preview);
    renderReview(true, { id: 'home', model: emptyLzModel() });
    const click = button('Export diagram (.drawio)');
    const first = click();
    await click();
    finishFirst(preview);
    await first;
    expect(vi.mocked(loadDiagramPreview).mock.calls[0][1].aborted).toBe(true);
    expect(downloadTextFile).toHaveBeenCalledTimes(1);
  });
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
    saveOutputs(record.id, { config, files: { 'network.json': 'old', 'removed.json': 'old' } });
    vi.mocked(generateOutputs).mockResolvedValue({ config, files: { 'network.json': 'fresh' }, primary: ['network.json'], secondary: [] });
    renderToStaticMarkup(<MemoryRouter>{surface === 'Review'
      ? <WizardProvider initialModel={model}><ReviewStep designName="Home" /></WizardProvider>
      : <SavedLzList />}</MemoryRouter>);
    const click = button(surface === 'Review' ? 'Download files' : 'Download LZ config');

    await click();
    await click();

    expect(generateOutputs).toHaveBeenCalledTimes(2);
    expect(await downloadedFiles()).toEqual({ 'config.jsonnet': config, 'network.json': 'fresh' });
    expect(getOutputs(record.id)?.files).toEqual({ 'network.json': 'fresh' });
  });

  it('regenerates each legacy regional download without merging cached files', async () => {
    const model = emptyLzModel();
    const draft = createDrDraft(model);
    const record = saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Home' }).record!;
    saveOutputs(record.id, { config: drDesignFingerprint(model, draft), files: {
      'Home/config.jsonnet': '{}', 'Home/network.json': 'old', 'DR/config.jsonnet': '{}', 'DR/network.json': 'old', 'Home/removed.json': 'old',
    } });
    vi.mocked(generateDrFileBundle).mockResolvedValue({ 'Home/network.json': 'fresh-home', 'DR/network.json': 'fresh-dr' });
    renderToStaticMarkup(<MemoryRouter><SavedLzList /></MemoryRouter>);

    await button('Download LZ config')();
    expect(await downloadedFiles()).toEqual({ 'network.json': 'fresh-home' });
    await button('Download LZ DR config')();
    expect(await downloadedFiles()).toEqual({ 'network.json': 'fresh-dr' });
    expect(generateDrFileBundle).toHaveBeenCalledTimes(2);
    expect(getOutputs(record.id)?.files).toEqual({ 'Home/network.json': 'fresh-home', 'DR/network.json': 'fresh-dr' });
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
      ? { 'Home/config.jsonnet': '{}', 'Home/network.json': 'old', 'DR/config.jsonnet': '{}', 'DR/network.json': 'old' }
      : { 'network.json': 'old' };
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
