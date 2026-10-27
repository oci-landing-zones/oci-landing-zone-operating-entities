import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import type { DiagramPreview } from '../services/diagramPreview.worker';
import { diagramPreviewView } from './useDiagramPreview';

function preview(id: string): DiagramPreview {
  return { tables: [], inventory: { compartments: [{ key: id, name: id }], groups: [] }, files: ['network.json'] };
}

describe('atomic diagram preview state', () => {
  it('exposes no structure or partial inventory before the first complete snapshot', () => {
    const model = emptyLzModel();
    const result = diagramPreviewView(undefined, model, 0);
    expect(result).toMatchObject({ snapshot: undefined, pending: true, status: 'loading', tables: [], inventory: undefined, error: undefined });
  });

  it('publishes model, tables and inventory as a single successful snapshot', () => {
    const model = emptyLzModel();
    const generated = preview('first');
    const snapshot = { model, preview: generated };
    const result = diagramPreviewView({ snapshot, outcome: { model, attempt: 0 } }, model, 0);
    expect(result.snapshot).toBe(snapshot);
    expect(result.snapshot?.model).toBe(model);
    expect(result.tables).toBe(generated.tables);
    expect(result.inventory).toBe(generated.inventory);
    expect(result.status).toBe('ready');
    expect(result.pending).toBe(false);
  });

  it('retains the complete previous model and its own inventory while rapid changes are pending', () => {
    const firstModel = emptyLzModel();
    const secondModel = { ...firstModel, foundation: { ...firstModel.foundation, regionShortName: 'second' } };
    const thirdModel = { ...secondModel, foundation: { ...secondModel.foundation, regionShortName: 'third' } };
    const generated = preview('first');
    const snapshot = { model: firstModel, preview: generated };
    const state = { snapshot, outcome: { model: firstModel, attempt: 0 } };
    for (const currentModel of [secondModel, thirdModel]) {
      const result = diagramPreviewView(state, currentModel, 0);
      expect(result.status).toBe('loading');
      expect(result.pending).toBe(true);
      expect(result.snapshot).toBe(snapshot);
      expect(result.snapshot?.model).toBe(firstModel);
      expect(result.snapshot?.model).not.toBe(currentModel);
      expect(result.tables).toBe(generated.tables);
      expect(result.inventory).toBe(generated.inventory);
    }
    const thirdPreview = preview('third');
    const settled = diagramPreviewView({ snapshot: { model: thirdModel, preview: thirdPreview }, outcome: { model: thirdModel, attempt: 0 } }, thirdModel, 0);
    expect(settled.status).toBe('ready');
    expect(settled.snapshot?.model).toBe(thirdModel);
    expect(settled.inventory).toBe(thirdPreview.inventory);
  });

  it('clears the exposed snapshot and inventory on a current error', () => {
    const model = emptyLzModel();
    const edited = { ...model, foundation: { ...model.foundation, regionShortName: 'next' } };
    const state = { snapshot: { model, preview: preview('previous') }, outcome: { model: edited, attempt: 0, error: 'Invalid owner.' } };
    const failed = diagramPreviewView(state, edited, 0);
    expect(failed).toMatchObject({ status: 'error', pending: false, error: 'Invalid owner.', snapshot: undefined, tables: [], inventory: undefined });
    const retry = diagramPreviewView(state, edited, 1);
    expect(retry.status).toBe('loading');
    expect(retry.pending).toBe(true);
    expect(retry.error).toBeUndefined();
    expect(retry.snapshot?.model).toBe(model);
    expect(diagramPreviewView({ ...state, outcome: { model: edited, attempt: 0, error: '' } }, edited, 0).snapshot).toBeUndefined();
  });

  it('does not present outcomes from a previous model or retry attempt as current', () => {
    const model = emptyLzModel();
    const edited = { ...model, foundation: { ...model.foundation, regionShortName: 'next' } };
    const snapshot = { model, preview: preview('previous') };
    const prior = { snapshot, outcome: { model, attempt: 0 } };
    expect(diagramPreviewView(prior, model, 1)).toMatchObject({ status: 'loading', pending: true, snapshot });
    const previousFailure = { snapshot, outcome: { model, attempt: 0, error: 'Old failure.' } };
    expect(diagramPreviewView(previousFailure, edited, 0)).toMatchObject({ status: 'loading', pending: true, snapshot, error: undefined });
  });
});
