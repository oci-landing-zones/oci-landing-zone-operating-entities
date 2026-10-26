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
import { reconcileExadata } from '../services/exadata';
import { createRegionalModel } from '../services/regionalDeployment';
import { vcnConflicts } from '../services/vcnConflicts';
import { syncDrEnvironments } from '../services/linkedDr';

export interface HomeRegionSource {
  id: string;
  name?: string;
  model?: LzModel;
}

interface WizardState {
  model: LzModel;
}

type WizardAction =
  | { type: 'SET_FIELD'; path: string; value: unknown; home?: LzModel }
  | { type: 'RESET'; home?: LzModel }
  | { type: 'SYNC_HOME'; home: LzModel };

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
      return { ...state, model: action.home
        ? syncDrEnvironments(reconcileExadata(setNested(state.model, action.path, action.value)), action.home)
        : reconcileExadata(setNested(state.model, action.path, action.value)) };
    case 'RESET':
      return { model: action.home ? syncDrEnvironments(createRegionalModel(), action.home)
        : state.model.foundation.stackScope === 'regional' ? createRegionalModel() : emptyLzModel() };
    case 'SYNC_HOME': {
      const model = syncDrEnvironments(state.model, action.home);
      return JSON.stringify(model) === JSON.stringify(state.model) ? state : { ...state, model };
    }
    default:
      return state;
  }
}

interface WizardContextValue {
  model: LzModel;
  homeSource?: HomeRegionSource;
  vcnErrors: Record<string, string[]>;
  setField: (path: string, value: unknown) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({
  initialModel,
  homeSource,
  onChange,
  children,
}: React.PropsWithChildren<{ initialModel: LzModel; homeSource?: HomeRegionSource; onChange?: (model: LzModel) => void }>) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ model: homeSource?.model
    ? syncDrEnvironments(reconcileExadata(initialModel), homeSource.model) : reconcileExadata(initialModel) }));
  useEffect(() => {
    if (homeSource?.model) dispatch({ type: 'SYNC_HOME', home: homeSource.model });
  }, [homeSource?.model]);

  // Report changes through onChange, skipping the initial mount so opening an LZ
  // doesn't immediately re-save it.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const lastReportedModel = useRef(state.model);
  useEffect(() => {
    if (lastReportedModel.current === state.model) return;
    lastReportedModel.current = state.model;
    onChangeRef.current?.(state.model);
  }, [state.model]);

  const setField = useCallback((path: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', path, value, home: homeSource?.model });
  }, [homeSource?.model]);

  const reset = useCallback(() => dispatch({ type: 'RESET', home: homeSource?.model }), [homeSource?.model]);

  const value = useMemo<WizardContextValue>(() => ({
    model: state.model,
    homeSource,
    vcnErrors: vcnConflicts(state.model),
    setField,
    reset,
  }), [state.model, homeSource, setField, reset]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}
