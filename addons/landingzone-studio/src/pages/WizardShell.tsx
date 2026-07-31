/**
 * WizardShell — Milestone 0 vertical slice, styled in the Oracle Redwood / OCI
 * look. Proves the whole pipeline end to end:
 *   form inputs → canonical LzModel → live React Flow diagram
 *              → JSON preview        → Download .drawio (opens in draw.io)
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
import FinishStep from '../wizard/steps/FinishStep';
import { buildGraph } from '../diagram/buildGraph';
import { buildFlowTraces } from '../services/flowTrace';
import LzDiagram from '../diagram/LzDiagram';
import { toDrawioXml } from '../export/toDrawio';
import { serializeConfig } from '../services/lzConfig';
import { downloadTextFile } from '../export/download';
import JsonViewer from '../components/JsonViewer';
import ViewModeToggle, { type ViewMode } from '../components/ViewModeToggle';
import FlowSidebar from '../components/FlowSidebar';
import TopBar from '../components/TopBar';
import { oracle } from '../theme';

const FONT = '"Oracle Sans", "Helvetica Neue", system-ui, -apple-system, sans-serif';

const layout = {
  app:     { minHeight: '100vh', background: oracle.appBg, fontFamily: FONT, color: oracle.text } as React.CSSProperties,

  page:    { maxWidth: 1440, margin: '0 auto', padding: '20px 24px 56px' } as React.CSSProperties,
  header:  { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '8px 0 22px' } as React.CSSProperties,
  title:   { fontSize: 24, fontWeight: 700, marginBottom: 4, color: oracle.ink } as React.CSSProperties,
  nameInput: { fontSize: 24, fontWeight: 700, color: oracle.ink, fontFamily: FONT, border: '1px solid transparent', background: 'transparent', borderRadius: 4, padding: '2px 6px', margin: '0 0 4px -6px', minWidth: 320, outline: 'none' } as React.CSSProperties,
  sub:     { color: oracle.textMuted, fontSize: 14 } as React.CSSProperties,
  resetBtn:{ padding: '7px 14px', fontSize: 13, border: `1px solid ${oracle.border}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
  navBtn:  { padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 6, cursor: 'pointer' } as React.CSSProperties,
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
  primary: { padding: '9px 16px', fontSize: 13, border: `1px solid ${oracle.redDark}`, borderRadius: 4, background: oracle.red, color: '#fff', cursor: 'pointer', fontWeight: 700 } as React.CSSProperties,
  secondary: { padding: '9px 14px', fontSize: 13, border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface, color: oracle.text, cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
};

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || 'landing-zone';
}

function WizardBody({ name, onRename }: { name: string; onRename: (v: string) => void }) {
  const { model, reset } = useWizard();
  const [activeStep, setActiveStep] = React.useState(1);
  const [diagramCollapsed, setDiagramCollapsed] = React.useState(false);
  const [flowsCollapsed, setFlowsCollapsed] = React.useState(false);
  const [flowSteps, setFlowSteps] = React.useState<Record<string, number | null>>({});
  const [viewMode, setViewMode] = React.useState<ViewMode>('split');
  const [diagramOpts, setDiagramOpts] = React.useState<DiagramOptions>({});
  const activeStepLabel = WIZARD_STEPS.find((s) => s.id === activeStep)?.label ?? '';

  // Changing step should start at the top, not wherever the previous step was scrolled.
  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [activeStep]);

  const showForm = viewMode === 'split' || viewMode === 'form';
  const showDiagram = viewMode === 'split' || viewMode === 'diagram';
  const railActive = viewMode === 'split' && diagramCollapsed;

  // The endpoints / route-table dots (and, later, flows) are a diagram-only-mode
  // layer — in split / form / json the diagram stays a clean overview. The
  // .drawio export derives from `diagram`, so it always mirrors what's on screen.
  const diagramOnly = viewMode === 'diagram';
  const effectiveOpts = useMemo<DiagramOptions>(
    () => {
      if (!diagramOnly) return { ...diagramOpts, showDots: false, showEndpoints: false, showFlows: false };
      // A selected flow traces between endpoints through the route tables, so it
      // implies the endpoints + route-table layer — force them on while active.
      const flowsActive = (diagramOpts.activeFlows?.length ?? 0) > 0;
      return flowsActive ? { ...diagramOpts, showEndpoints: true, showDots: true } : diagramOpts;
    },
    [diagramOnly, diagramOpts],
  );
  // The docked flow picker rides alongside the diagram in diagram-only mode at
  // step 3 (same gate as the Show-flows button). `gridCols` widens the diagram
  // area into two columns to seat it (a thin rail when collapsed).
  const flowsOpen = diagramOnly && activeStep >= 3 && !!effectiveOpts.showFlows;
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
  const drawioXml = useMemo(() => toDrawioXml(diagram), [diagram]);
  const configText = useMemo(() => serializeConfig(model, activeStep), [model, activeStep]);
  const slug = slugify(name);

  // The title follows the Step 1 Customer / Landing-zone-name fields while it
  // still has the default or previously derived name; a manual rename (here or
  // on the dashboard) detaches it.
  const customer = model.presentation.customer.trim();
  const lzLabel = model.presentation.landingZone.trim();
  const derivedName = [customer, lzLabel].filter(Boolean).join(' — ') || 'Untitled Landing Zone';
  const prevDerived = React.useRef(derivedName);
  React.useEffect(() => {
    if (derivedName === prevDerived.current) return;
    if (name === prevDerived.current || name === 'Untitled Landing Zone') onRename(derivedName);
    prevDerived.current = derivedName;
  }, [derivedName, name, onRename]);

  function resetWizard() {
    if (!window.confirm('Clear all inputs for this Landing Zone?')) return;
    reset();
  }

  // Back / Next, rendered both above and below the step so long steps don't force
  // a scroll to the bottom just to move on. `spacer` keeps Next right-aligned on
  // step 1, where there is no Back button to push against.
  const prevStep = WIZARD_STEPS.find((s) => s.id === activeStep - 1);
  const nextStep = WIZARD_STEPS.find((s) => s.id === activeStep + 1);
  const stepNav = (position: 'top' | 'bottom') => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      {prevStep ? (
        <button
          type="button"
          style={layout.secondary}
          aria-label={`Back to step ${prevStep.id}: ${prevStep.label}`}
          onClick={() => setActiveStep(prevStep.id)}
        >
          ← Back: {prevStep.label}
        </button>
      ) : <span />}
      {nextStep && (
        <button
          type="button"
          style={position === 'top' ? layout.secondary : layout.primary}
          aria-label={`Continue to step ${nextStep.id}: ${nextStep.label}`}
          onClick={() => setActiveStep(nextStep.id)}
        >
          Next: {nextStep.label} →
        </button>
      )}
    </div>
  );

  return (
    <div style={layout.app}>
      <TopBar
        center={<ViewModeToggle mode={viewMode} onChange={setViewMode} />}
        right={(
          <>
            <button type="button" style={layout.navBtn} onClick={() => downloadTextFile(`${slug}.drawio`, drawioXml, 'application/xml')}>Download .drawio</button>
            <button type="button" style={layout.navBtn} onClick={() => downloadTextFile(`${slug}.jsonnet`, configText, 'text/plain')}>Download config</button>
            <button type="button" style={layout.navBtn} onClick={resetWizard}>Reset</button>
          </>
        )}
      />

      <div style={layout.page}>
        {/* The page header (title + name) and the step pills only appear in the
            split Form + Diagram view; single-focus modes stay chrome-free so the
            content gets the whole area. Actions live in the TopBar, always reachable. */}
        {viewMode === 'split' && (
          <>
            <div style={layout.header}>
              <div>
                <input
                  aria-label="Landing Zone name"
                  style={layout.nameInput}
                  value={name}
                  onChange={(e) => onRename(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.borderColor = oracle.border; e.currentTarget.style.background = oracle.surface; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent'; }}
                />
                <div style={layout.sub}>Step {activeStep} of {WIZARD_STEPS.length} — {activeStepLabel}. The diagram and JSON build up as you go.</div>
              </div>
            </div>

            <WizardStepper active={activeStep} onSelect={setActiveStep} />
          </>
        )}

        {viewMode === 'json' ? (
          <JsonViewer inline title="Landing Zone Config" value={configText} inlineHeight="72vh" />
        ) : (
          <div style={{ ...layout.grid, gridTemplateColumns: gridCols }}>
            {showForm && (
              <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                {stepNav('top')}
                {activeStep === 1 ? (
                  <FoundationStep />
                ) : activeStep === 2 ? (
                  <HubNetworkStep />
                ) : activeStep === 3 ? (
                  <EnvNetworkStep />
                ) : activeStep === 4 ? (
                  <PlatformTemplatesStep />
                ) : activeStep === 5 ? (
                  <ReviewStep />
                ) : (
                  <FinishStep />
                )}
                {stepNav('bottom')}
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
                <div style={diagramOnly ? { ...layout.diagramCanvas, height: 'calc(100vh - 185px)' } : layout.diagramCanvas}>
                  <ReactFlowProvider>
                    <LzDiagram diagram={diagram} options={effectiveOpts} onOptionsChange={diagramOnly && activeStep >= 3 ? setDiagramOpts : undefined} flowSteps={flowSteps} />
                  </ReactFlowProvider>
                </div>
              </section>
            ))}

            {flowsOpen && (
              <div style={{ height: 'calc(100vh - 185px)' }}>
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
        )}

        {viewMode === 'split' && (
          <JsonViewer title="Landing Zone Config" value={configText} />
        )}
      </div>
    </div>
  );
}

function WizardEditor({ id, initialName, initialModel }: { id: string; initialName: string; initialModel: LzModel }) {
  const [name, setName] = React.useState(initialName);

  function onRename(value: string) {
    setName(value);
    renameLZ(id, value);
  }

  return (
    <WizardProvider initialModel={initialModel} onChange={(model) => saveLZ(id, model)}>
      <WizardBody name={name} onRename={onRename} />
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
