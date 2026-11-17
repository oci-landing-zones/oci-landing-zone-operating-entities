import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { emptyLzModel } from '../model/defaults';
import { getLZ } from '../services/lzStore';
import { buildGraph } from '../diagram/buildGraph';
import { useDiagramPreview } from '../wizard/useDiagramPreview';
import WizardShell from './WizardShell';
import { defaultCostGovernance } from '../services/costGovernance';

vi.mock('../services/lzStore', async (original) => ({
  ...await original<typeof import('../services/lzStore')>(), getLZ: vi.fn(),
}));
vi.mock('../diagram/buildGraph', () => ({ buildGraph: vi.fn() }));
vi.mock('../wizard/useDiagramPreview', () => ({ useDiagramPreview: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  const model = emptyLzModel();
  vi.mocked(getLZ).mockReturnValue({ id: 'test', name: 'Preserved design', createdAt: '', updatedAt: '', model });
  vi.mocked(useDiagramPreview).mockImplementation((current) => ({
    snapshot: { model: current, preview: { tables: [], inventory: { compartments: [], groups: [] }, files: ['network.json'] } },
    pending: false, deferred: false, tables: [], inventory: { compartments: [], groups: [] }, status: 'ready', error: undefined, retry: vi.fn(),
  }));
});

describe('diagram layout error recovery', () => {
  it.each(['environment', 'project'] as const)('keeps the wizard editable with a deleted cost-center %s filter', (dimension) => {
    const model = emptyLzModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), costCenterFilters: {
      CC12345: { platform: null, environment: null, project: null, [dimension]: [`${dimension}:deleted`] },
    } };
    vi.mocked(getLZ).mockReturnValue({ id: 'test', name: 'Preserved design', createdAt: '', updatedAt: '', model });
    vi.mocked(buildGraph).mockReturnValue({ nodes: [], edges: [] });
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}><Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes></MemoryRouter>);
    expect(html).toContain('Preserved design');
    expect(html).toContain('id="lz-region-short-name"');
  });
  it('shows Notifications in Foundation while keeping Tags and Budgets in Governance', () => {
    vi.mocked(buildGraph).mockReturnValue({ nodes: [], edges: [] });
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}><Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes></MemoryRouter>);
    expect(html).toContain('Governance');
    expect(html).toContain('Security');
    expect(html).toContain('Step 1 of 7');
    expect(html).not.toContain('id="lz-cis-level"');
    expect(html).toContain('id="foundation-observability-title"');
    expect(html).not.toContain('id="cost-budgets-title"');
    expect(html).not.toContain('id="cost-governance-tags-title"');
  });
  it.each([
    [2, 'id="lz-cis-level"', 1],
    [3, 'Hub Network', 2],
    [4, 'Projects', 3],
    [5, 'Shared platforms', 4],
    [6, 'id="cost-governance-tags-title"', 5],
  ] as const)('renders step %s with its original preview phase', (step, content, phase) => {
    vi.mocked(buildGraph).mockReturnValue({ nodes: [], edges: [] });
    vi.spyOn(React, 'useState').mockImplementation(((initial: unknown) => {
      const value = typeof initial === 'function' ? initial() : initial;
      return useState(value === 1 ? step : value);
    }) as typeof React.useState);
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}><Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes></MemoryRouter>);
    expect(html).toContain(`Step ${step} of 7`);
    expect(html).toContain(content);
    if (step !== 6) expect(buildGraph).toHaveBeenLastCalledWith(expect.anything(), phase, expect.anything(), undefined, expect.anything(), expect.anything());
    if (step === 2) {
      expect(html).toContain('id="security-zones-title"');
      expect(html).toContain('aria-label="Enable OCI Bastion"');
      expect(html).not.toContain('id="lz-region-short-name"');
    }
  });

  it.each([false, true])('shows a Governance visual with FinOps enabled=%s', (tagsEnabled) => {
    const model = emptyLzModel();
    model.foundation.costGovernance!.tagsEnabled = tagsEnabled;
    vi.mocked(getLZ).mockReturnValue({ id: 'test', name: 'Visual design', createdAt: '', updatedAt: '', model });
    vi.mocked(buildGraph).mockReturnValue({ nodes: [], edges: [] });
    vi.spyOn(React, 'useState').mockImplementation(((initial: unknown) => {
      const value = typeof initial === 'function' ? initial() : initial;
      return useState(value === 1 ? 6 : value);
    }) as typeof React.useState);
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}><Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes></MemoryRouter>);
    if (tagsEnabled) {
      expect(html).toContain('studio-governance-reference');
      expect(html).not.toContain('class="studio-diagram-panel"');
    } else {
      expect(html).toContain('class="studio-diagram-panel"');
      expect(html).toContain('react-flow');
      expect(html).not.toContain('studio-governance-reference');
      expect(buildGraph).toHaveBeenLastCalledWith(expect.anything(), 5, expect.anything(), undefined, expect.anything(), expect.anything());
    }
  });

  it('shows generation errors in the form while rendering the previous complete diagram', () => {
    const previous = emptyLzModel();
    vi.mocked(buildGraph).mockReturnValue({ nodes: [], edges: [] });
    vi.mocked(useDiagramPreview).mockReturnValue({
      snapshot: { model: previous, preview: { tables: [], inventory: { compartments: [], groups: [] }, files: ['network.json'] } },
      pending: false, deferred: false, tables: [], inventory: { compartments: [], groups: [] }, status: 'error',
      error: 'RUNTIME ERROR: Remote networks are required.\n  at generator.libsonnet:1', retry: vi.fn(),
    });
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}>
      <Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes>
    </MemoryRouter>);
    expect(buildGraph).toHaveBeenLastCalledWith(previous, expect.anything(), expect.anything(), undefined, [], { compartments: [], groups: [] });
    expect(html).toContain('Remote networks are required.');
    expect(html).toContain('react-flow');
    expect(html).toContain('id="diagram-preview-error" class="field-error" aria-live="polite"');
    expect(html.indexOf('id="diagram-preview-error"')).toBeGreaterThan(html.indexOf('id="lz-region-short-name"'));
    expect(html.indexOf('id="diagram-preview-error"')).toBeLessThan(html.indexOf('class="studio-diagram-panel"'));
    expect(html).not.toContain('Configuration error');
    expect(html).not.toContain('Retry diagram preview');
    expect(html).not.toContain('RUNTIME ERROR:');
    expect(html).not.toContain('generator.libsonnet');
    expect(html).not.toMatch(/out.of.sync/i);
    expect(html).not.toContain('Diagram unavailable');
  });

  it('opens a Home Review deep link and supplies current factory filenames without downloading', () => {
    vi.mocked(buildGraph).mockReturnValue({ nodes: [], edges: [] });
    vi.mocked(useDiagramPreview).mockImplementation((current) => ({
      snapshot: { model: current, preview: { tables: [], inventory: { compartments: [], groups: [] }, files: ['network.json', 'new_extension.json'] } },
      pending: false, deferred: false, tables: [], inventory: { compartments: [], groups: [] }, status: 'ready', error: undefined, retry: vi.fn(),
    }));
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test?step=review']}>
      <Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes>
    </MemoryRouter>);
    expect(html).toContain('Review your landing zone');
    expect(html).toContain('Step 7 of 7');
    expect(buildGraph).toHaveBeenLastCalledWith(expect.anything(), 6, expect.anything(), undefined, expect.anything(), expect.anything());
    expect(html).toContain('new_extension.json');
    expect(html).not.toContain('id="lz-region-short-name"');
  });

  it.each([
    [new Error('A connector has invalid coordinates.'), 'A connector has invalid coordinates.'],
    [new Error(''), 'The diagram layout could not be prepared.'],
  ])('keeps the editable design and inline error visible when layout fails: %s', (error, message) => {
    vi.mocked(buildGraph).mockImplementation(() => { throw error; });
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}>
      <Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes>
    </MemoryRouter>);
    expect(html).toContain('Preserved design');
    expect(html).toContain('id="lz-region-short-name"');
    expect(html).toContain(message);
    expect(html).toContain('id="diagram-preview-error" class="field-error"');
    expect(html).not.toContain('Retry diagram preview');
    expect(html).not.toContain('Configuration error');
    expect(html).toContain('data-preview-state="error"');
    expect(html).not.toContain('Preparing diagram');
  });
});
