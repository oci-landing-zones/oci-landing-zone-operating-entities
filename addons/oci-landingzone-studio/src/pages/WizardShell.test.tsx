import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { emptyLzModel } from '../model/defaults';
import { getLZ } from '../services/lzStore';
import { buildGraph } from '../diagram/buildGraph';
import { useDiagramPreview } from '../wizard/useDiagramPreview';
import WizardShell from './WizardShell';

vi.mock('../services/lzStore', async (original) => ({
  ...await original<typeof import('../services/lzStore')>(), getLZ: vi.fn(),
}));
vi.mock('../diagram/buildGraph', () => ({ buildGraph: vi.fn() }));
vi.mock('../wizard/useDiagramPreview', () => ({ useDiagramPreview: vi.fn() }));

beforeEach(() => {
  const model = emptyLzModel();
  vi.mocked(getLZ).mockReturnValue({ id: 'test', name: 'Preserved design', createdAt: '', updatedAt: '', model });
  vi.mocked(useDiagramPreview).mockImplementation((current) => ({
    snapshot: { model: current, preview: { tables: [], inventory: { compartments: [], groups: [] } } },
    pending: false, tables: [], inventory: { compartments: [], groups: [] }, status: 'ready', error: undefined, retry: vi.fn(),
  }));
});

describe('diagram layout error recovery', () => {
  it.each([
    [new Error('A connector has invalid coordinates.'), 'A connector has invalid coordinates.'],
    [new Error(''), 'The diagram layout could not be prepared.'],
  ])('keeps the editable design and retry action visible when layout fails: %s', (error, message) => {
    vi.mocked(buildGraph).mockImplementation(() => { throw error; });
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/lz/test']}>
      <Routes><Route path="/lz/:id" element={<WizardShell />} /></Routes>
    </MemoryRouter>);
    expect(html).toContain('Preserved design');
    expect(html).toContain('id="lz-region-short-name"');
    expect(html).toContain(message);
    expect(html).toContain('Retry diagram preview');
    expect(html).toContain('data-preview-state="error"');
    expect(html).not.toContain('Preparing diagram');
  });
});
