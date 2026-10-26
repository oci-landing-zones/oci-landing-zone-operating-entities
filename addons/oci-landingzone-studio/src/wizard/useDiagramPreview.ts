import { useEffect, useRef, useState } from 'react';
import type { LzModel } from '../model/types';
import type { RouteTable } from '../services/routeTables';
import { loadDiagramPreview } from '../services/diagramPreview';
import type { DiagramPreview } from '../services/diagramPreview.worker';

const NO_TABLES: RouteTable[] = [];

interface PreviewRequest { model: LzModel; attempt: number }
interface PreviewState {
  snapshot?: { model: LzModel; preview: DiagramPreview };
  outcome?: PreviewRequest & { error?: string };
}

/** A frozen preview always travels with the model that generated it. */
export function diagramPreviewView(state: PreviewState | undefined, model: LzModel, attempt: number) {
  const current = state?.outcome?.model === model && state.outcome.attempt === attempt ? state.outcome : undefined;
  const status = current?.error !== undefined ? 'error' : current && state?.snapshot?.model === model ? 'ready' : 'loading';
  const snapshot = status === 'error' ? undefined : state?.snapshot;
  return {
    snapshot,
    pending: status === 'loading',
    tables: snapshot?.preview.tables ?? NO_TABLES,
    inventory: snapshot?.preview.inventory,
    status,
    error: current?.error,
  };
}

export function useDiagramPreview(model: LzModel) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>();
  const previousRequest = useRef<PreviewRequest | undefined>(undefined);
  useEffect(() => {
    const controller = new AbortController();
    const request = { model, attempt };
    const previous = previousRequest.current;
    previousRequest.current = request;
    const generate = () => {
      void loadDiagramPreview(model, controller.signal).then(
        (preview) => { if (!controller.signal.aborted) setState({ snapshot: { model, preview }, outcome: request }); },
        (error: unknown) => {
          if (!controller.signal.aborted) setState((last) => ({
            snapshot: last?.snapshot,
            outcome: { ...request, error: error instanceof Error && error.message ? error.message : 'Could not generate the diagram resources.' },
          }));
        },
      );
    };
    // Repeated setup of the same initial request also stays immediate in Strict Mode.
    const debounce = previous && (previous.model !== model || previous.attempt !== attempt);
    const timer = debounce ? setTimeout(generate, 250) : undefined;
    if (!debounce) generate();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [model, attempt]);
  return { ...diagramPreviewView(state, model, attempt), retry: () => setAttempt((previous) => previous + 1) };
}
