/**
 * WizardShell — Milestone 0 vertical slice, styled in the Oracle Redwood / OCI
 * look. Proves the whole pipeline end to end:
 *   form inputs → canonical LzModel → live React Flow diagram
 *              → debug config preview → Review downloads
 */

import React, { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { WizardProvider, useWizard } from '../wizard/wizardContext';
import { getLZ, renameLZ, saveLZ } from '../services/lzStore';
import { normalizeModel } from '../model/defaults';
import type { DiagramOptions, LzModel } from '../model/types';
import WizardStepper, { WIZARD_STEPS } from '../wizard/WizardStepper';
import FoundationStep from '../wizard/steps/FoundationStep';
import HubNetworkStep from '../wizard/steps/HubNetworkStep';
import EnvNetworkStep from '../wizard/steps/EnvNetworkStep';
import PlatformTemplatesStep from '../wizard/steps/PlatformTemplatesStep';
import ReviewStep from '../wizard/steps/ReviewStep';
import { buildGraph } from '../diagram/buildGraph';
import { buildFlowTraces } from '../services/flowTrace';
import LzDiagram from '../diagram/LzDiagram';
import { serializeConfig } from '../services/lzConfig';
import JsonViewer from '../components/JsonViewer';
import ViewModeToggle, { type ViewMode } from '../components/ViewModeToggle';
import FlowSidebar from '../components/FlowSidebar';
import TopBar from '../components/TopBar';
import { oracle } from '../theme';
import { EMPTY_DEBUG_SEQUENCE, registerDebugClick } from '../services/debugMode';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const STEP_PROGRESS_LABELS: Record<number, string> = {
  1: 'Name your landing zone and select its region',
  2: 'Set up the shared network',
  3: 'Add projects and their networks',
  4: 'Add workload platforms',
  5: 'Review and download your files',
};

const layout = {
  app:     { minHeight: '100vh', background: oracle.appBg, fontFamily: FONT, color: oracle.text } as React.CSSProperties,

  page:    { maxWidth: 1440, margin: '0 auto', padding: '20px 24px 56px' } as React.CSSProperties,
  header:  { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '8px 0 22px' } as React.CSSProperties,
  title:   { fontSize: 24, fontWeight: 700, marginBottom: 4, color: oracle.ink } as React.CSSProperties,
  sub:     { color: oracle.textMuted, fontSize: 14 } as React.CSSProperties,
  resetBtn:{ padding: '7px 14px', fontSize: 13, border: `1px solid ${oracle.border}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
  navBtn:  { padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 6, cursor: 'pointer' } as React.CSSProperties,
  saveState: { fontSize: 12.5, fontWeight: 700, color: '#fff' } as React.CSSProperties,
  headerActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as React.CSSProperties,
  placeholder: { padding: '28px 18px', border: `1px dashed ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surfaceAlt, color: oracle.textMuted, fontSize: 13, lineHeight: 1.55 } as React.CSSProperties,

  grid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' } as React.CSSProperties,
  panel:   { border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' } as React.CSSProperties,
  panelAccent: { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' } as React.CSSProperties,
  panelBody: { padding: 20 } as React.CSSProperties,
  panelTitle: { fontSize: 15, fontWeight: 700, marginBottom: 16, color: oracle.ink } as React.CSSProperties,

  diagramHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 12px' } as React.CSSProperties,
  diagramTitle: { fontSize: 15, fontWeight: 700, color: oracle.ink } as React.CSSProperties,
  diagramCanvas: { height: 460, overflow: 'hidden', borderRadius: '0 0 8px 8px' } as React.CSSProperties,
  diagramRail: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '14px 0', width: '100%', height: 260, border: `1px solid ${oracle.border}`, borderTop: `3px solid ${oracle.red}`, borderRadius: 8, background: oracle.surface, cursor: 'pointer', boxShadow: '0 1px 2px rgba(32,31,28,0.04)' } as React.CSSProperties,
  railChevron: { fontSize: 20, fontWeight: 800, color: oracle.red, lineHeight: 1 } as React.CSSProperties,
  railLabel: { writingMode: 'vertical-rl', fontSize: 13, fontWeight: 700, color: oracle.ink, letterSpacing: 0.4 } as React.CSSProperties,

  actions: { display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' } as React.CSSProperties,
  stepFooter: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${oracle.border}` } as React.CSSProperties,
  stepPosition: { color: oracle.textMuted, fontSize: 12.5, fontWeight: 700, textAlign: 'center' } as React.CSSProperties,
  primary: { padding: '9px 16px', fontSize: 13, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontWeight: 700 } as React.CSSProperties,
  secondary: { padding: '9px 14px', fontSize: 13, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
};

function WizardBody({ name, onNameChange, onNameBlur, nameError, saveState }: {
  name: string;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  nameError: string | null;
  saveState: 'saved' | 'error';
}) {
  const { model, reset } = useWizard();
  const [activeStep, setActiveStep] = React.useState(1);
  const [diagramCollapsed, setDiagramCollapsed] = React.useState(false);
  const [flowsCollapsed, setFlowsCollapsed] = React.useState(false);
  const [flowSteps, setFlowSteps] = React.useState<Record<string, number | null>>({});
  const [viewMode, setViewMode] = React.useState<ViewMode>('split');
  const [debugMode, setDebugMode] = React.useState(false);
  const debugClicks = React.useRef(EMPTY_DEBUG_SEQUENCE);
  const [diagramOpts, setDiagramOpts] = React.useState<DiagramOptions>({});
  const activeStepLabel = STEP_PROGRESS_LABELS[activeStep]
    ?? WIZARD_STEPS.find((s) => s.id === activeStep)?.label
    ?? '';

  // Load the complete generation chunk and boot Jsonnet after the first paint.
  // Generate shares its singleton promise, so an in-flight warm-up also removes
  // duplicate work without delaying the dashboard or disclaimer.
  React.useEffect(() => {
    const warm = () => {
      void import('../generator/generate')
        .then(({ warmGenerator }) => warmGenerator())
        .catch(() => { /* Generate reports the error and can retry. */ });
    };
    if (window.requestIdleCallback) {
      const idleId = window.requestIdleCallback(warm, { timeout: 1_000 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timerId = window.setTimeout(warm, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  // Changing step should start at the top, not wherever the previous step was scrolled.
  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [activeStep]);

  const showForm = viewMode === 'split' || viewMode === 'form';
  const showDiagram = viewMode === 'split' || viewMode === 'diagram';
  const supportsFlowTracing = model.network.hubKind === 'hub_a' || model.network.hubKind === 'hub_b' || model.network.hubKind === 'hub_c' || model.network.hubKind === 'hub_e';
  const railActive = viewMode === 'split' && diagramCollapsed;

  // The endpoints / route-table dots (and, later, flows) are a diagram-only-mode
  // layer — in split and form modes the diagram stays a clean overview. The
  // Review builds a separate step-5 structural graph for Draw.io export.
  const diagramOnly = viewMode === 'diagram';
  const effectiveOpts = useMemo<DiagramOptions>(
    () => {
      if (!diagramOnly) return { ...diagramOpts, showDots: false, showEndpoints: false, showFlows: false, activeFlows: [] };
      const base = supportsFlowTracing ? diagramOpts : { ...diagramOpts, showFlows: false, activeFlows: [] };
      return base;
    },
    [diagramOnly, diagramOpts, supportsFlowTracing],
  );
  // The docked flow picker rides alongside the diagram in diagram-only mode from
  // Hub Network onward (same gate as the Show-flows button). `gridCols` widens the diagram
  // area into two columns to seat it (a thin rail when collapsed).
  const flowsOpen = supportsFlowTracing && diagramOnly && activeStep >= 2 && !!effectiveOpts.showFlows;
  const gridCols = viewMode === 'split'
    ? (diagramCollapsed ? '1fr 48px' : '1fr 1fr')
    : flowsOpen
      ? (flowsCollapsed ? '1fr 52px' : '1fr 320px')
      : '1fr';
  const diagram = useMemo(() => buildGraph(model, activeStep, effectiveOpts), [model, activeStep, effectiveOpts]);
  // Flow traces drive the step-by-step hop list in the sidebar (the diagram reads
  // the same traces via buildGraph). Only meaningful in diagram-only mode.
  const flowTraces = useMemo(
    () => (diagramOnly ? buildFlowTraces(model, effectiveOpts.activeFlows ?? []) : []),
    [diagramOnly, model, effectiveOpts.activeFlows],
  );
  // Manual packet stepping: null = auto-play, a number = that 0-based hop.
  function onFlowStep(id: string, action: 'prev' | 'next' | 'play') {
    const grp = (tid: string) => { const np = tid.split('#')[0].split(':'); return `${np[0]}:${np[1]}`; };
    const n = flowTraces.find((t) => grp(t.id) === id)?.hops.length ?? 0;
    setFlowSteps((prev) => {
      const cur = prev[id];
      const next = action === 'play' ? null
        : action === 'next' ? (cur == null ? 0 : Math.min(cur + 1, n - 1))
        : (cur == null ? 0 : Math.max(cur - 1, 0));
      return { ...prev, [id]: next };
    });
  }
  const configText = useMemo(() => serializeConfig(model, activeStep), [model, activeStep]);

  function resetWizard() {
    if (!window.confirm('Clear all inputs for this Landing Zone?')) return;
    reset();
  }

  function registerTopBarDebugClick() {
    const result = registerDebugClick(debugClicks.current, Date.now());
    debugClicks.current = result.sequence;
    if (result.activated) setDebugMode(true);
  }

  // Back / Next live in one full-width footer beneath the workspace so they do
  // not interrupt either column or change position between steps.
  const prevStep = WIZARD_STEPS.find((s) => s.id === activeStep - 1);
  const nextStep = WIZARD_STEPS.find((s) => s.id === activeStep + 1);
  const stepNav = (
    <nav style={layout.stepFooter} className="wizard-footer-nav" aria-label="Step navigation">
      {prevStep ? (
        <button
          type="button"
          style={{ ...layout.secondary, justifySelf: 'start', gridColumn: 1 }}
          className="wizard-prev-button"
          aria-label={`Back to step ${prevStep.id}: ${prevStep.label}`}
          onClick={() => setActiveStep(prevStep.id)}
        >
          ← Back: {prevStep.label}
        </button>
      ) : <span />}
      <span style={layout.stepPosition}>Step {activeStep} of {WIZARD_STEPS.length}</span>
      {nextStep && (
        <button
          type="button"
          style={{ ...layout.primary, justifySelf: 'end', gridColumn: 3 }}
          className="wizard-next-button"
          aria-label={`Continue to step ${nextStep.id}: ${nextStep.label}`}
          onClick={() => setActiveStep(nextStep.id)}
        >
          Next: {nextStep.label} →
        </button>
      )}
      {!nextStep && <span />}
    </nav>
  );

  return (
    <div style={layout.app}>
      <TopBar
        onEmptySpaceClick={registerTopBarDebugClick}
        center={<ViewModeToggle mode={viewMode} onChange={setViewMode} />}
        right={(
          <>
            <span role="status" style={{ ...layout.saveState, color: saveState === 'error' ? '#ffd1cc' : '#dff4df' }}>
              {saveState === 'error' ? 'Not saved' : 'Saved locally'}
            </span>
            {debugMode && <button type="button" style={layout.navBtn} onClick={() => setDebugMode(false)}>Debug on · Exit</button>}
            <button type="button" style={layout.navBtn} onClick={resetWizard}>Reset</button>
          </>
        )}
      />

      <div style={layout.page} className="studio-page">
        {/* The page header (title + name) and the step pills only appear in the
            split Form + Diagram view; single-focus modes stay chrome-free so the
            content gets the whole area. Actions live in the TopBar, always reachable. */}
        {viewMode === 'split' && (
          <>
            <div style={layout.header}>
              <div>
                <div style={layout.title}>{name}</div>
                <div style={layout.sub}>Step {activeStep} of {WIZARD_STEPS.length} — {activeStepLabel}</div>
              </div>
            </div>

            <WizardStepper active={activeStep} onSelect={setActiveStep} />
          </>
        )}

        <div
          style={{ ...layout.grid, gridTemplateColumns: gridCols }}
          className={`studio-workspace${viewMode === 'split' ? ' studio-workspace--split' : ''}${flowsOpen ? ' studio-workspace--flows' : ''}`}
        >
            {showForm && (
              <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                {activeStep === 1 ? (
                  <FoundationStep name={name} onNameChange={onNameChange} onNameBlur={onNameBlur} nameError={nameError} />
                ) : activeStep === 2 ? (
                  <HubNetworkStep />
                ) : activeStep === 3 ? (
                  <EnvNetworkStep />
                ) : activeStep === 4 ? (
                  <PlatformTemplatesStep />
                ) : activeStep === 5 ? (
                  <ReviewStep designName={name} />
                ) : null}
              </div>
            )}

            {showDiagram && (railActive ? (
              <button
                type="button"
                style={layout.diagramRail}
                onClick={() => setDiagramCollapsed(false)}
                title="Show diagram"
                aria-label="Show diagram"
              >
                <span style={layout.railChevron}>‹</span>
                <span style={layout.railLabel}>Network Diagram</span>
              </button>
            ) : (
              <section style={layout.panel}>
                <div style={layout.panelAccent} />
                <div style={layout.diagramHeader}>
                  <div style={layout.diagramTitle}>Network Diagram</div>
                  {viewMode === 'split' && (
                    <button type="button" style={layout.secondary} onClick={() => setDiagramCollapsed(true)} title="Collapse to the side">
                      Collapse ›
                    </button>
                  )}
                </div>
                <div className="studio-diagram-canvas" style={diagramOnly ? { ...layout.diagramCanvas, height: 'calc(100vh - 185px)' } : layout.diagramCanvas}>
                  <ReactFlowProvider>
                    <LzDiagram diagram={diagram} options={effectiveOpts} onOptionsChange={diagramOnly && activeStep >= 2 ? setDiagramOpts : undefined} flowSteps={flowSteps} showFlowControl={supportsFlowTracing} />
                  </ReactFlowProvider>
                </div>
              </section>
            ))}

            {flowsOpen && (
              <div className="studio-flow-sidebar" style={{ height: 'calc(100vh - 185px)' }}>
                <FlowSidebar
                  environments={model.environments.map((e, i) => ({
                    name: e.name.trim() || `env${i + 1}`,
                    roles: (e.network?.subnets ?? []).map((sn) => sn.name.split('-').pop() || ''),
                  }))}
                  active={effectiveOpts.activeFlows ?? []}
                  traces={flowTraces}
                  steps={flowSteps}
                  onStep={onFlowStep}
                  onChange={(next) => setDiagramOpts((o) => ({ ...o, activeFlows: next }))}
                  collapsed={flowsCollapsed}
                  onToggleCollapse={() => setFlowsCollapsed((c) => !c)}
                />
              </div>
            )}
        </div>

        {stepNav}

        {debugMode && (
          <JsonViewer title="Landing Zone Config" value={configText} />
        )}
      </div>
    </div>
  );
}

function WizardEditor({ id, initialName, initialModel }: { id: string; initialName: string; initialModel: LzModel }) {
  const [name, setName] = React.useState(initialName);
  const lastSavedName = React.useRef(initialName);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [storageError, setStorageError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<'saved' | 'error'>('saved');

  function onNameChange(value: string) {
    setName(value);
    if (!value.trim()) {
      setNameError('Name cannot be empty. The last saved name will be restored.');
      return;
    }
    const result = renameLZ(id, value);
    if (!result.ok) {
      setStorageError(result.message ?? 'Could not save the new Landing Zone name.');
      setSaveState('error');
      return;
    }
    lastSavedName.current = value.trim();
    setNameError(null);
    setStorageError(null);
    setSaveState('saved');
  }

  function onNameBlur() {
    if (!name.trim()) {
      setName(lastSavedName.current);
      setNameError(null);
      return;
    }
    if (name !== name.trim()) onNameChange(name.trim());
  }

  return (
    <WizardProvider initialModel={initialModel} onChange={(model) => {
      const result = saveLZ(id, model);
      setStorageError(result.ok ? null : result.message ?? 'Could not save changes to this browser.');
      setSaveState(result.ok ? 'saved' : 'error');
    }}>
      {storageError && <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 20, padding: '10px 24px', color: '#7b1e17', background: '#fdf0ef', borderBottom: '1px solid #d0a2a2', fontFamily: FONT }}>{storageError}</div>}
      <WizardBody name={name} onNameChange={onNameChange} onNameBlur={onNameBlur} nameError={nameError} saveState={saveState} />
    </WizardProvider>
  );
}

export default function WizardShell() {
  const { id } = useParams();
  const record = id ? getLZ(id) : null;
  if (!record) return <Navigate to="/" replace />;
  // key by id so the provider re-initialises cleanly when switching LZs.
  return <WizardEditor key={record.id} id={record.id} initialName={record.name} initialModel={normalizeModel(record.model)} />;
}
