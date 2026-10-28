/**
 * WizardShell — Milestone 0 vertical slice, styled in the Oracle Redwood / OCI
 * look. Proves the whole pipeline end to end:
 *   form inputs → canonical LzModel → live React Flow diagram
 *              → debug config preview → Review downloads
 */

import React, { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { WizardProvider, useWizard, type HomeRegionSource } from '../wizard/wizardContext';
import { getLZ, linkedHomeRecord, renameLZ, saveLZ } from '../services/lzStore';
import { normalizeModel } from '../model/defaults';
import { legacyRegionalModel } from '../services/regionalDeployment';
import type { DiagramOptions, LzModel } from '../model/types';
import WizardStepper, { WIZARD_STEPS } from '../wizard/WizardStepper';
import FoundationStep from '../wizard/steps/FoundationStep';
import HubNetworkStep from '../wizard/steps/HubNetworkStep';
import EnvNetworkStep from '../wizard/steps/EnvNetworkStep';
import PlatformsStep from '../wizard/steps/PlatformsStep';
import ReviewStep from '../wizard/steps/ReviewStep';
import { createDiagramGraph } from '../wizard/diagramGraph';
import { allFlowIds, buildFlowTraces, specFromId } from '../services/flowTrace';
import { flowGroup } from '../diagram/flowOverlayGeometry';
import LzDiagram, { DiagramZoomControls } from '../diagram/LzDiagram';
import { serializeConfig } from '../services/lzConfig';
import JsonViewer from '../components/JsonViewer';
import ViewModeToggle, { type ViewMode } from '../components/ViewModeToggle';
import FlowSidebar from '../components/FlowSidebar';
import { hasHubLoadBalancer } from '../services/hubKinds';
import type { FlowFocus } from '../diagram/FlowOverlay';
import TopBar from '../components/TopBar';
import { oracle } from '../theme';
import { EMPTY_DEBUG_SEQUENCE, registerDebugClick } from '../services/debugMode';
import { ErrorNotice } from '../components/FieldError';
import InfoButton from '../components/InfoButton';
import { useDiagramPreview } from '../wizard/useDiagramPreview';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';
/** First step with spoke subnets — and therefore endpoints and traceable flows. */
const FLOW_STEP = 3;

const STEP_PROGRESS_LABELS: Record<number, string> = {
  1: 'Set deployment type, location and environments',
  2: 'Set up the shared network',
  3: 'Organize projects and configure environment networks',
  4: 'Add shared services and workload platforms',
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
  placeholder: { padding: '28px 18px', border: `1px dashed ${oracle.borderStrong}`, borderRadius: 6, background: oracle.surfaceAlt, color: oracle.textMuted, fontSize: 13, lineHeight: 1.55 } as React.CSSProperties,

  grid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' } as React.CSSProperties,
  panel:   { border: `1px solid ${oracle.border}`, borderRadius: 8, background: oracle.surface, boxShadow: '0 1px 2px rgba(32,31,28,0.04)' } as React.CSSProperties,
  panelAccent: { height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' } as React.CSSProperties,
  panelBody: { padding: 20 } as React.CSSProperties,
  panelTitle: { fontSize: 15, fontWeight: 700, marginBottom: 16, color: oracle.ink } as React.CSSProperties,

  diagramHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '14px 20px 6px' } as React.CSSProperties,
  diagramTitle: { fontSize: 15, fontWeight: 700, color: oracle.ink } as React.CSSProperties,
  diagramCanvas: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: '0 0 8px 8px', position: 'relative' } as React.CSSProperties,

  actions: { display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' } as React.CSSProperties,
  stepFooter: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${oracle.border}` } as React.CSSProperties,
  stepPosition: { color: oracle.textMuted, fontSize: 12.5, fontWeight: 700, textAlign: 'center' } as React.CSSProperties,
  primary: { padding: '9px 16px', fontSize: 13, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontWeight: 700 } as React.CSSProperties,
  secondary: { padding: '9px 14px', fontSize: 13, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
  flowBtn: { padding: '6px 10px', fontSize: 12, border: `1px solid ${oracle.red}`, borderRadius: 4, background: oracle.redTint, color: oracle.redDark, cursor: 'pointer', fontWeight: 700 } as React.CSSProperties,
};

function WizardBody({ name, onNameChange, onNameBlur, nameError, saveState, saveRevision }: {
  name: string;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  nameError: string | null;
  saveState: 'saved' | 'error';
  saveRevision: number;
}) {
  const { model, reset, homeSource } = useWizard();
  const [activeStep, setActiveStep] = React.useState(1);
  const [flowsCollapsed, setFlowsCollapsed] = React.useState(false);
  const [flowSteps, setFlowSteps] = React.useState<Record<string, number | null>>({});
  const [flowFocus, setFlowFocus] = React.useState<FlowFocus | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>('split');
  const [debugMode, setDebugMode] = React.useState(false);
  const debugClicks = React.useRef(EMPTY_DEBUG_SEQUENCE);
  const [diagramOpts, setDiagramOpts] = React.useState<DiagramOptions>({});
  const formPanel = React.useRef<HTMLDivElement>(null);
  const activeStepLabel = STEP_PROGRESS_LABELS[activeStep]
    ?? WIZARD_STEPS.find((s) => s.id === activeStep)?.label
    ?? '';

  // Load the complete generation chunk and boot Jsonnet after the first paint.
  // Generate shares its singleton promise, so an in-flight warm-up also removes
  // duplicate work without delaying the dashboard.
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
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
    formPanel.current?.scrollTo({ top: 0 });
  }, [activeStep]);

  const showForm = viewMode === 'split' || viewMode === 'form';
  const showDiagram = viewMode === 'split' || viewMode === 'diagram';
  const routing = useDiagramPreview(model);
  const snapshot = routing.snapshot;
  const renderedModel = snapshot?.model ?? model;
  React.useEffect(() => {
    setDiagramOpts((previous) => {
      const activeFlows = previous.activeFlows?.filter((id) => specFromId(renderedModel, id, '') !== null);
      return activeFlows?.length === previous.activeFlows?.length ? previous : { ...previous, activeFlows };
    });
  }, [renderedModel]);
  const supportsFlowTracing = renderedModel.environments.some((env) => env.projectNetworkEnabled !== false && env.network.subnets.length > 0)
    && ['hub_a', 'hub_b', 'hub_c', 'hub_e'].includes(renderedModel.network.hubKind);

  // The endpoints / route-table dots and flows are a diagram-only-mode layer — in
  // split and form modes the diagram stays a clean overview. Endpoints live in the
  // spoke subnets, so the layer starts at step 3 (Projects); earlier steps only
  // point there. Review downloads retain the layers chosen in diagram mode.
  const diagramOnly = viewMode === 'diagram';
  const flowStepReached = activeStep >= FLOW_STEP;
  const flowLayer = diagramOnly && flowStepReached;
  const chosenOpts = useMemo<DiagramOptions>(
    () => {
      // Hidden flows draw nothing, so their traces cannot keep the route tables open;
      // the picks stay in state and return with Show flows.
      if (!supportsFlowTracing || !diagramOpts.showFlows) return { ...diagramOpts, activeFlows: [], allFlows: false, focusFlow: undefined };
      // A clicked flow only stays selected while it is still being traced.
      const activeFlows = diagramOpts.activeFlows?.filter((id) => specFromId(renderedModel, id, '') !== null);
      const traced = diagramOpts.allFlows ? allFlowIds(renderedModel) : activeFlows ?? [];
      const focusFlow = traced.some((id) => flowGroup(id) === diagramOpts.focusFlow) ? diagramOpts.focusFlow : undefined;
      return { ...diagramOpts, activeFlows, focusFlow };
    },
    [diagramOpts, supportsFlowTracing, renderedModel],
  );
  const effectiveOpts = useMemo<DiagramOptions>(() => flowLayer ? chosenOpts : {
    ...chosenOpts, showDots: false, showEndpoints: false, showFlows: false, activeFlows: [], allFlows: false, focusFlow: undefined,
  }, [flowLayer, chosenOpts]);
  // The diagram's layer buttons hand back the rendered options; keep only the layer
  // toggles so flow picks hidden by Hide flows are not overwritten.
  function setDiagramLayers(next: DiagramOptions) {
    setDiagramOpts((o) => ({ ...o, showFlows: next.showFlows, showEndpoints: next.showEndpoints, showDots: next.showDots, openTables: next.openTables }));
  }
  // Clicking a flow path (or its sidebar row in all-flows mode) selects it; clicking it again clears.
  function selectFlow(group: string | null) {
    setDiagramOpts((o) => ({ ...o, focusFlow: group && o.focusFlow !== group ? group : undefined }));
    if (group) setFlowsCollapsed(false);
  }
  // The docked flow picker rides alongside the diagram in diagram-only mode from
  // Projects onward (same gate as the Show-flows button). `gridCols` widens the diagram
  // area into two columns to seat it (a thin rail when collapsed).
  const flowsOpen = supportsFlowTracing && flowLayer && !!effectiveOpts.showFlows;
  // Split view has no room for the picker: one click switches to diagram-only
  // with the picker open. Before step 3 the diagram points at step 3 instead.
  function openFlows() {
    setDiagramOpts((o) => ({ ...o, showFlows: true }));
    setFlowsCollapsed(false);
    setViewMode('diagram');
  }
  const flowHint = supportsFlowTracing && activeStep === 2
    ? { label: 'Endpoints and traffic flows appear in step 3', action: 'Go to step 3 →', onClick: () => setActiveStep(FLOW_STEP) }
    : undefined;
  const gridCols = viewMode === 'split'
    ? '1fr 1fr'
    : flowsOpen
      ? (flowsCollapsed ? '1fr 52px' : '1fr 320px')
      : '1fr';
  const getDiagram = useMemo(() => snapshot ? createDiagramGraph(snapshot.model, snapshot.preview) : undefined, [snapshot]);
  const diagramResult = useMemo(() => {
    if (!getDiagram) return {};
    try {
      return { diagram: getDiagram(flowLayer ? WIZARD_STEPS.length : activeStep, effectiveOpts) };
    } catch (error) {
      return { error: error instanceof Error && error.message ? error.message : 'The diagram layout could not be prepared.' };
    }
  }, [getDiagram, activeStep, flowLayer, effectiveOpts]);
  const diagram = diagramResult.diagram;
  const diagramError = diagramResult.error ?? routing.error;
  const diagramStatus = diagramResult.error ? 'error' : routing.status;
  function exportDiagram() {
    if (diagramStatus !== 'ready' || !getDiagram || snapshot?.model !== model) throw new Error('Wait for the current diagram preview before exporting.');
    return getDiagram(WIZARD_STEPS.length, chosenOpts);
  }
  // Flow traces drive the step-by-step hop list in the sidebar (the diagram reads
  // the same traces via buildGraph). Only meaningful in diagram-only mode.
  const flowTraces = useMemo(
    () => {
      if (!diagramOnly || !snapshot) return [];
      return effectiveOpts.allFlows
        ? buildFlowTraces(snapshot.model, allFlowIds(snapshot.model), 'kind', snapshot.preview.tables)
        : buildFlowTraces(snapshot.model, effectiveOpts.activeFlows ?? [], 'flow', snapshot.preview.tables);
    },
    [diagramOnly, effectiveOpts.activeFlows, effectiveOpts.allFlows, snapshot],
  );
  // Manual packet stepping: null = auto-play, a number = that 0-based hop.
  function onFlowStep(id: string, action: 'prev' | 'next' | 'play' | 'goto', hop?: number) {
    const grp = (tid: string) => { const np = tid.split('#')[0].split(':'); return `${np[0]}:${np[1]}`; };
    const n = flowTraces.find((t) => grp(t.id) === id)?.hops.length ?? 0;
    setFlowSteps((prev) => {
      const cur = prev[id];
      const next = action === 'play' ? null
        : action === 'goto' ? Math.max(0, Math.min(hop ?? 0, n - 1))
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

  const previewError = diagramStatus === 'error' && <div style={{ margin: '0 20px 12px' }}>
    <ErrorNotice title="Diagram unavailable">
      <div>{diagramError?.split('\n')[0].replace(/^RUNTIME ERROR:\s*/, '')}</div>
      {diagramError?.includes('\n') && <details style={{ marginTop: 8 }}>
        <summary>Technical details</summary>
        <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>{diagramError}</pre>
      </details>}
    </ErrorNotice>
    <button type="button" style={layout.secondary} onClick={routing.retry}>Retry diagram preview</button>
  </div>;

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
            <span role="status" className="studio-save-status" style={{ ...layout.saveState, color: saveState === 'error' ? '#ffd1cc' : '#dff4df' }}>
              {saveState === 'error' ? 'Not saved' : <span key={saveRevision} className={`studio-save-confirmation${saveRevision ? ' studio-save-confirmation--updated' : ''}`}>
                Saved<span className="studio-save-location"> locally</span>
              </span>}
            </span>
            <button type="button" style={layout.navBtn} onClick={resetWizard} disabled={!!homeSource && !homeSource.model}>Reset</button>
          </>
        )}
      />

      <div style={layout.page} className={`studio-page${showDiagram ? ' studio-page--visual' : ''}`}>
        {showForm && (
          <>
            <div style={layout.header}>
              <div>
                <h1 style={{ ...layout.title, marginTop: 0 }}>{name}</h1>
                <p style={layout.sub}>Step {activeStep} of {WIZARD_STEPS.length}: {activeStepLabel}</p>
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
              <div ref={formPanel} className="studio-form-panel" role="region" aria-label="Landing zone configuration" tabIndex={viewMode === 'split' ? 0 : undefined}
                style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                {!showDiagram && previewError}
                {activeStep === 1 ? (
                  <FoundationStep name={name} onNameChange={onNameChange} onNameBlur={onNameBlur} nameError={nameError} />
                ) : activeStep === 2 ? (
                  <HubNetworkStep />
                ) : activeStep === 3 ? (
                  <EnvNetworkStep />
                ) : activeStep === 4 ? (
                  <PlatformsStep />
                ) : activeStep === 5 ? (
                  <ReviewStep designName={name} getDiagram={exportDiagram} diagramReady={diagramStatus === 'ready'} />
                ) : null}
              </div>
            )}

            {showDiagram && (
              <ReactFlowProvider>
              <section className="studio-diagram-panel" style={layout.panel}>
                <div style={layout.panelAccent} />
                <div style={layout.diagramHeader}>
                  <div className="studio-info-heading" style={{ marginBottom: 0 }}>
                    <h2 style={layout.diagramTitle}>Network diagram</h2>
                    {flowLayer && <InfoButton title="Routing tables and flows"><p>Tables come from the current Blueprint Factory configuration. Dynamic DRG rows preview the routes allowed by its import distributions. Remote peering routes are expectations based on the remote CIDRs you supplied.</p><p>This is a configuration preview, not live OCI routing state. The packet follows the network connection lines and briefly highlights the rule used at each hop.</p></InfoButton>}
                  </div>
                  {viewMode === 'split' && supportsFlowTracing && flowStepReached && (
                    <button type="button" className="studio-flow-button" style={layout.flowBtn} onClick={openFlows} title="Show network flows in the full-width diagram">
                      Show network flows ⤢
                    </button>
                  )}
                  <DiagramZoomControls disabled={!diagram || routing.pending} />
                </div>
                {previewError}
                {!!diagram?.flowErrors?.length && <div style={{ margin: '0 20px 12px' }}>
                  <ErrorNotice title="Flow preview unavailable">{diagram.flowErrors.map((message) => <div key={message}>{message}</div>)}</ErrorNotice>
                </div>}
                <div className="studio-diagram-canvas" aria-busy={routing.pending} data-preview-state={diagramStatus}
                  style={layout.diagramCanvas}>
                  {diagram ? <div style={{ height: '100%' }} inert={routing.pending || undefined}>
                      <LzDiagram diagram={diagram} options={effectiveOpts} onOptionsChange={flowLayer ? setDiagramLayers : undefined} flowSteps={flowSteps} showFlowControl={supportsFlowTracing} flowHint={flowHint} flowFocus={flowsOpen ? flowFocus : null}
                        onFlowSelect={flowsOpen ? selectFlow : undefined} onFlowHover={(group) => setFlowFocus(group ? { group } : null)} />
                  </div> : <div role="status" style={{ height: '100%', display: 'grid', placeItems: 'center', color: oracle.textMuted, fontSize: 13 }}>
                    {diagramStatus === 'error' ? 'Diagram unavailable' : 'Preparing diagram…'}
                  </div>}
                  {diagram && routing.pending && <div style={{ position: 'absolute', inset: 0, zIndex: 3000 }}>
                    <span role="status" style={{ position: 'absolute', top: 12, left: 12, padding: '4px 8px', background: oracle.surface, color: oracle.textMuted, fontSize: 13 }}>Updating diagram…</span>
                  </div>}
                </div>
              </section>
              </ReactFlowProvider>
            )}

            {flowsOpen && (
              <div className="studio-flow-sidebar" style={{ height: 'calc(100vh - 185px)' }} inert={routing.pending || undefined}>
                <FlowSidebar
                  ingressAvailable={hasHubLoadBalancer(renderedModel)}
                  environments={renderedModel.environments.filter((env) => env.projectNetworkEnabled !== false).map((e, i) => ({
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
                  onFocusChange={setFlowFocus}
                  allFlows={!!effectiveOpts.allFlows}
                  onAllFlowsChange={(allFlows) => setDiagramOpts((o) => ({ ...o, allFlows, focusFlow: undefined }))}
                  selected={effectiveOpts.focusFlow ?? null}
                  onSelect={selectFlow}
                />
              </div>
            )}
        </div>

        {stepNav}

        {debugMode && (
          <JsonViewer title="Landing Zone Config" value={configText} onClose={() => setDebugMode(false)} />
        )}
      </div>
    </div>
  );
}

function WizardEditor({ id, initialName, initialModel, homeLzId }: { id: string; initialName: string; initialModel: LzModel; homeLzId?: string }) {
  const [name, setName] = React.useState(initialName);
  const lastSavedName = React.useRef(initialName);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [storageError, setStorageError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<'saved' | 'error'>('saved');
  const [saveRevision, setSaveRevision] = React.useState(0);
  const readHome = (): HomeRegionSource | undefined => {
    if (!homeLzId) return undefined;
    const record = getLZ(id);
    const home = record ? linkedHomeRecord(record) : null;
    return { id: homeLzId, name: home?.name, model: home?.model };
  };
  const [homeSource, setHomeSource] = React.useState(readHome);
  React.useEffect(() => {
    if (!homeLzId) return;
    const refresh = () => {
      const record = getLZ(id);
      const home = record ? linkedHomeRecord(record) : null;
      const next = { id: homeLzId, name: home?.name, model: home?.model };
      setHomeSource((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [id, homeLzId]);

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
    setSaveRevision((revision) => revision + 1);
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
    <WizardProvider initialModel={initialModel} homeSource={homeSource} onChange={(model) => {
      const result = saveLZ(id, model);
      setStorageError(result.ok ? null : result.message ?? 'Could not save changes to this browser.');
      setSaveState(result.ok ? 'saved' : 'error');
      if (result.ok) setSaveRevision((revision) => revision + 1);
    }}>
      {storageError && <div style={{ position: 'sticky', top: 0, zIndex: 20, padding: '0 24px', background: oracle.surface, fontFamily: FONT }}><ErrorNotice title="Changes could not be saved">{storageError}</ErrorNotice></div>}
      <WizardBody name={name} onNameChange={onNameChange} onNameBlur={onNameBlur} nameError={nameError} saveState={saveState} saveRevision={saveRevision} />
    </WizardProvider>
  );
}

export default function WizardShell() {
  const { id } = useParams();
  const record = id ? getLZ(id) : null;
  if (!record) return <Navigate to="/" replace />;
  // key by id so the provider re-initialises cleanly when switching LZs.
  let model: LzModel;
  try { model = record.disasterRecovery ? legacyRegionalModel(record.model, record.disasterRecovery.draft) : normalizeModel(record.model); }
  catch (error) {
    return <main style={{ padding: 32, fontFamily: FONT, color: oracle.text, background: oracle.surface }}>
      <h1>This saved DR design needs review</h1>
      <ErrorNotice>{error instanceof Error ? error.message : 'This combined design cannot be represented by the standard editor.'}</ErrorNotice>
      <p>The original Home and DR source and its existing downloads remain saved. Return home to download its files before creating a new regional design.</p>
      <a href={import.meta.env.BASE_URL}>Return to Landing Zones</a>
    </main>;
  }
  return <WizardEditor key={record.id} id={record.id} initialName={record.name} initialModel={model} homeLzId={record.homeLzId} />;
}
