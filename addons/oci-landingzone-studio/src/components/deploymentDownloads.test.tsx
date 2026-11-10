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
import { emptyHybridConnectivity, newVpn } from '../services/hybridConnectivity';
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
      <ReviewStep designName="DR export" getDiagram={() => visible} />
    </WizardProvider></MemoryRouter>);
  }

  it('includes a fresh static Home routing page and retains the supplied DR export', async () => {
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
    expect(xml).not.toContain('cmp-env-0-vcn-sn-0-ep-icon');
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
  it('keeps session keys in explicit artifacts while omitting them from the guide and browser cache', async () => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
    hybrid.customer_premises_equipments.office = { ip_address: '203.0.113.10' };
    hybrid.ipsecs.office = { ...newVpn('office'), remote_cidrs: ['172.20.0.0/16'] };
    Object.assign(hybrid.ipsecs.office.tunnels_management.tunnel_1, { secretMode: 'inline', shared_secret: 'SyntheticSessionKey123' });
    const record = createLZ('Home', model).record!;
    controls.id = record.id;
    const config = serializeConfig(model);
    vi.mocked(generateOutputs).mockResolvedValue({ config, files: { 'network.json': '{"shared_secret":"SyntheticSessionKey123"}' }, primary: ['network.json'], secondary: [] });
    renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Home" /></WizardProvider></MemoryRouter>);
    await button('Download files')();
    const files = await downloadedFiles();
    expect(files['config.jsonnet']).toContain('SyntheticSessionKey123');
    expect(files['network.json']).toContain('SyntheticSessionKey123');
    expect(files['README.txt']).not.toContain('SyntheticSessionKey123');
    expect(files['README.txt']).toContain('both Oracle tunnel endpoints');
    expect(getOutputs(record.id)).toBeNull();
  });

  it('renders preliminary Hub C files when a cached package lacks the backend alternative', () => {
    const model = emptyLzModel();
    model.network.hubKind = 'hub_c';
    const record = createLZ('Hub C', model).record!;
    controls.id = record.id;
    saveOutputs(record.id, { config: serializeConfig(model), files: { 'network.json': '{}' } });
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Hub C" /></WizardProvider></MemoryRouter>);
    expect(html).toContain('File lists are a preview');
    expect(html.split('3. Update and apply phase 2')[1]).toContain('network_backends.json');
  });

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
    expect(await downloadedFiles()).toEqual({ 'config.jsonnet': config, 'network.json': '{"revision":"fresh"}',
      'README.txt': expect.stringContaining('configuration_source = "ocibucket"') });
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

  it('uses the scope-specific guide instead of the combined guide for legacy downloads', async () => {
    const model = emptyLzModel();
    const draft = createDrDraft(model);
    saveDisasterRecoveryLZ({ name: 'Combined', model, draft, sourceLabel: 'Home' });
    vi.mocked(generateDrFileBundle).mockResolvedValue({
      'Home/network.json': '{}', 'Home/README.txt': 'Home instructions',
      'DR/network.json': '{}', 'DR/README.txt': 'DR instructions', 'README.txt': 'Combined instructions',
    });
    renderToStaticMarkup(<MemoryRouter><SavedLzList /></MemoryRouter>);
    await button('Download LZ config')();
    expect((await downloadedFiles())['README.txt']).toBe('Home instructions');
    await button('Download LZ DR config')();
    expect((await downloadedFiles())['README.txt']).toBe('DR instructions');
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
