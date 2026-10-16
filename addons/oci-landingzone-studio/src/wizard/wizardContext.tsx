/**
 * WizardContext — holds the canonical LzModel for the LZ currently being edited.
 *
 * Persistence-agnostic: the provider is handed an `initialModel` and an optional
 * `onChange` callback, and reports every model change through it. The shell wires
 * `onChange` to lzStore.saveLZ(id, …). Mount the provider with `key={lzId}` so it
 * re-initialises cleanly when switching between landing zones.
 */

/* eslint-disable react-refresh/only-export-components */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { LzModel } from '../model/types';
import { emptyLzModel } from '../model/defaults';

interface WizardState {
  model: LzModel;
}

type WizardAction =
  | { type: 'SET_FIELD'; path: string; value: unknown }
  | { type: 'RESET' };

/** Immutable set of a dotted path into a plain object tree. */
function setNested<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const last = keys.pop();
  if (last === undefined) return obj;

  const clone: Record<string, unknown> = { ...(obj as Record<string, unknown>) };
  let cursor = clone;
  for (const k of keys) {
    cursor[k] = { ...(cursor[k] as Record<string, unknown>) };
    cursor = cursor[k] as Record<string, unknown>;
  }
  cursor[last] = value;
  return clone as T;
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, model: setNested(state.model, action.path, action.value) };
    case 'RESET':
      return { model: emptyLzModel() };
    default:
      return state;
  }
}

interface WizardContextValue {
  model: LzModel;
  setField: (path: string, value: unknown) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({
  initialModel,
  onChange,
  children,
}: React.PropsWithChildren<{ initialModel: LzModel; onChange?: (model: LzModel) => void }>) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ model: initialModel }));

  // Report changes through onChange, skipping the initial mount so opening an LZ
  // doesn't immediately re-save it.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onChangeRef.current?.(state.model);
  }, [state.model]);

  const setField = useCallback((path: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', path, value });
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const value = useMemo<WizardContextValue>(() => ({
    model: state.model,
    setField,
    reset,
  }), [state.model, setField, reset]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
