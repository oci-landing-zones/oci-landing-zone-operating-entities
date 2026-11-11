import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BusinessUnitScope, CostBudget, CostGovernance, LzModel } from '../../model/types';
import { activeProjectNames, budgetTagValues, budgetDefinitions, budgetFieldError, budgetRecipientError, costTagDefinitions, defaultCostGovernance, ownerEmail, ownerEmailError, businessUnitAssignments, unassignedCostCenterErrors, assignCostCenterBusinessUnit, syncBusinessUnitAssignments, businessUnitScopeOptions, inheritedCostTagNames, studioExcludedBudgetKeys, inactiveBusinessUnitBudgetKeys, tagValueLists, parseTagValues, costCenterFilter, syncCostCenterBudgets, addCostCenters, removeCostCenter, customBudgetError } from '../../services/costGovernance';
import { fieldErrorProps } from '../../services/fieldErrors';
import FieldError from '../../components/FieldError';
import CostCenterCoverageNotice from '../../components/CostCenterCoverageNotice';
import CostTagHelp from '../../components/CostTagHelp';
import type { UncoveredCostResource } from '../../services/costCenterCoverage';
import { createModelId } from '../../model/defaults';
import DeleteButton from '../../components/DeleteButton';
import { oracle } from '../../theme';
import { s as form } from './networkEditorStyles';

const order = ['platform', 'environment', 'project', 'cost-center', 'business-unit', 'owner'];
const tags = [...costTagDefinitions].sort((a, b) => order.indexOf(a.name.replace('tag-lz-', '')) - order.indexOf(b.name.replace('tag-lz-', '')));
const compactTagNames = [...inheritedCostTagNames, 'tag-lz-business-unit'];
const compactInput: CSSProperties = { ...form.input, minHeight: 36, padding: '6px 9px', fontSize: 13 };
const cell: CSSProperties = { padding: '10px 8px', borderBottom: `1px solid ${oracle.border}`, textAlign: 'left', verticalAlign: 'top', overflowWrap: 'anywhere' };
const costCenterHeader: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 56px 44px', gap: 8, alignItems: 'center' };
const choice: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: oracle.ink };
const fields = [
  ['name', 'Budget name'], ['amount', 'Monthly amount'], ['thresholdValue', 'Alert threshold (%)'], ['recipients', 'Notification emails'],
] as const;

function GovernancePanel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section style={form.panel} aria-labelledby={id}>
    <div style={{ height: 3, background: oracle.red, borderRadius: '8px 8px 0 0' }} />
    <div style={{ padding: 20 }}><h2 id={id} style={form.title}>{title}</h2>{children}</div>
  </section>;
}

function BusinessUnitPicker({ unit, kind = 'business unit', field, options, selected, disabled, onChange }: {
  unit: string; kind?: 'business unit' | 'cost center'; field: keyof BusinessUnitScope; options: { value: string; label: string }[];
  selected: string[] | null; disabled: boolean; onChange: (selected: string[] | null) => void;
}) {
  const label = field.charAt(0).toUpperCase() + field.slice(1);
  const shown = selected === null ? 'All' : options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(', ') || 'Not apply';
  return <fieldset disabled={disabled} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
    <span style={form.label}>{label}</span>
    <details>
      <summary aria-label={`${label} for ${kind} ${unit}`} style={{ ...compactInput, cursor: 'pointer', overflowWrap: 'anywhere' }}>{shown}</summary>
      <div style={{ padding: 8, border: `1px solid ${oracle.border}`, borderRadius: 4, marginTop: 4 }}>
        <button type="button" style={{ border: 0, background: 'transparent', color: oracle.redDark, cursor: 'pointer', padding: '6px 0', fontSize: 12 }} onClick={() => onChange(null)}>Select all</button>
        <button type="button" aria-label={`Not apply in ${label} for ${unit}`} title={`Do not restrict ${label.toLowerCase()}`} style={{ border: 0, background: 'transparent', color: oracle.redDark, cursor: 'pointer', padding: '6px 0', marginLeft: 12, fontSize: 12 }} onClick={() => onChange([])}>Not apply</button>
        {options.map((option) => <label key={option.value} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0', fontSize: 13 }}>
          <input type="checkbox" aria-label={`${option.label} in ${label} for ${unit}`} checked={selected === null || selected.includes(option.value)}
            onChange={(event) => {
              const current = selected ?? options.map((entry) => entry.value);
              onChange(event.target.checked ? [...new Set([...current, option.value])] : current.filter((value) => value !== option.value));
            }} />{option.label}
        </label>)}
      </div>
    </details>
  </fieldset>;
}

export default function CostGovernanceSection({ model, regional = model.foundation.stackScope === 'regional', onChange, selectedTag = null, onTagSelect, uncoveredCostResources }: {
  model: LzModel; regional?: boolean; onChange: (value: CostGovernance) => void;
  selectedTag?: string | null; onTagSelect?: (tagName: string) => void;
  uncoveredCostResources?: readonly UncoveredCostResource[];
}) {
  const [newCostCenter, setNewCostCenter] = useState('');
  const [newCostCenterFilter, setNewCostCenterFilter] = useState<BusinessUnitScope>({ platform: null, environment: null, project: null });
  const [addingCostCenter, setAddingCostCenter] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<number | null>(null);
  const [editingNewCostCenter, setEditingNewCostCenter] = useState(false);
  const businessUnitBeforeEdit = useRef<string | null>(null);
  const costCenterBeforeEdit = useRef<string | null>(null);
  const [newBudgetKey, setNewBudgetKey] = useState<string | null>(null);
  const projects = activeProjectNames(model);
  const inheritedDefinitions = budgetDefinitions(projects);
  const defaults = defaultCostGovernance(projects);
  const cfg = model.foundation.costGovernance ?? defaults;
  const ownerError = ownerEmailError(ownerEmail(cfg));
  const definitions = { ...inheritedDefinitions, ...Object.fromEntries(Object.entries(cfg.additionalBudgets ?? {}).map(([key, budget]) => [key, {
    ...inheritedDefinitions['BUDGET-PROJ1-KEY'], name: budget.name,
    description: `Monthly budget for ${budget.tagName}=${budget.tagValue}.`,
  }])) };
  const budgetOrder = (key: string) => key === 'BUDGET-LANDINGZONE-KEY' ? 0
    : key === 'BUDGET-COST-CENTER-CC12345-KEY' || Object.values(cfg.costCenterBudgetKeys ?? {}).includes(key) ? 1
    : cfg.additionalBudgets?.[key] ? 3 : 2;
  const keys = Object.keys(definitions).filter((key) => ![...studioExcludedBudgetKeys, ...inactiveBusinessUnitBudgetKeys(cfg, projects)].includes(key))
    .sort((a, b) => budgetOrder(a) - budgetOrder(b));
  const lov = tagValueLists(model);
  const businessUnits = parseTagValues(cfg.tagValueLists?.['tag-lz-business-unit'] ?? lov['tag-lz-business-unit'].join(', '));
  const businessOptions = businessUnitScopeOptions(model);
  const assignments = businessUnitAssignments(cfg);
  const costCenterRaw = cfg.tagValueLists?.['tag-lz-cost-center'] ?? lov['tag-lz-cost-center'].join(', ');
  const costCenters = parseTagValues(costCenterRaw);
  const costCenterRows = costCenterRaw || costCenterBeforeEdit.current !== null ? costCenterRaw.split(/,\s*|\r?\n/) : [];
  const legacyCostCenterRename = costCenters.length === 1 && costCenters[0] !== 'CC12345'
    && !(cfg.removedBudgets ?? []).includes('BUDGET-COST-CENTER-CC12345-KEY')
    && !Object.values(cfg.additionalBudgets ?? {}).some((budget) => budget.tagName === 'tag-lz-cost-center' && budget.tagValue === costCenters[0]);
  useEffect(() => {
    if (legacyCostCenterRename) onChange(syncCostCenterBudgets(cfg, 'CC12345'));
  }, [legacyCostCenterRename, cfg, onChange]);
  const removed = (cfg.removedBudgets ?? []).filter((key) => keys.includes(key));
  const restorable = removed.filter((key) => key !== 'BUDGET-COST-CENTER-CC12345-KEY' || costCenters.includes('CC12345'));
  const activeKeys = keys.filter((key) => !removed.includes(key));
  const sharedError = activeKeys.length ? budgetRecipientError(cfg.recipients, true) : null;
  function patch(value: Partial<CostGovernance>) { onChange({ ...cfg, ...value }); }
  function updateTagValues(name: string, raw: string) {
    patch({ tagValueLists: { ...cfg.tagValueLists, [name]: raw } });
  }
  function addCostCenter() {
    const added = parseTagValues(newCostCenter).filter((value) => !costCenters.includes(value));
    if (!added.length) return;
    const next = addCostCenters(cfg, newCostCenter);
    onChange({ ...next, costCenterFilters: { ...next.costCenterFilters, ...Object.fromEntries(added.map((value) => [value, newCostCenterFilter])) } });
    setNewCostCenter('');
    setNewCostCenterFilter({ platform: null, environment: null, project: null });
    setAddingCostCenter(false);
  }
  function updateBudget(key: string, field: keyof CostBudget, value: string | number) {
    if (cfg.additionalBudgets?.[key]) patch({ additionalBudgets: { ...cfg.additionalBudgets, [key]: { ...cfg.additionalBudgets[key], [field]: value } } });
    else patch({ budgets: { ...cfg.budgets, [key]: { ...(cfg.budgets[key] ?? defaults.budgets[key]), [field]: value } } });
  }
  function addBudget() {
    const key = `${createModelId('BUDGET-CUSTOM').toUpperCase()}-KEY`;
    setNewBudgetKey(key);
    patch({ additionalBudgets: { ...cfg.additionalBudgets, [key]: {
      name: `budget-custom-${Object.keys(cfg.additionalBudgets ?? {}).length + 1}`, amount: 500, thresholdValue: 80,
      recipients: cfg.recipients, tagName: 'tag-lz-cost-center', tagValue: '',
    } } });
  }
  function removeBudget(key: string) {
    if (cfg.additionalBudgets?.[key]) {
      patch({ additionalBudgets: Object.fromEntries(Object.entries(cfg.additionalBudgets).filter(([item]) => item !== key)), removedBudgets: removed.filter((item) => item !== key), costCenterBudgetKeys: Object.fromEntries(Object.entries(cfg.costCenterBudgetKeys ?? {}).filter(([, linked]) => linked !== key)) });
    } else patch({ removedBudgets: [...removed, key] });
  }
  function updateTarget(key: string, field: 'tagName' | 'tagValue', value: string) {
    const budget = cfg.additionalBudgets?.[key];
    if (budget) patch({ additionalBudgets: { ...cfg.additionalBudgets, [key]: { ...budget, [field]: value,
      ...(field === 'tagName' && !budgetTagValues(model, value).includes(budget.tagValue) ? { tagValue: '' } : {}) } } });
  }

  return <>
    <GovernancePanel id="cost-governance-tags-title" title="FinOps/Governance tags">
      <fieldset aria-labelledby="cost-governance-tags-title" style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <label style={choice}>
          <input type="checkbox" disabled={regional} checked={cfg.requireTagValues} onChange={(event) => patch({ requireTagValues: event.target.checked })} aria-describedby="cost-required-tags-help" />
          Enable default tags
        </label>
        <p id="cost-required-tags-help" style={{ ...form.help, margin: '8px 0 12px' }}>Require cost tag values on new resources. Platform, environment and project values are inherited.</p>
        <p style={{ ...form.help, margin: '8px 0 12px' }}>Separate editable lists with commas. Platform, environment and project values are inherited. Owner uses one email for all resources. Existing tag values and defaults remain valid.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13, color: oracle.ink }} aria-label="Cost governance tags">
          <thead><tr><th scope="col" style={{ ...cell, width: '30%' }}>Tag</th><th scope="col" style={{ ...cell, width: '53%' }}>LOV (List of values)</th><th scope="col" style={{ ...cell, padding: '10px 4px', textAlign: 'center', fontSize: 12, whiteSpace: 'nowrap', overflowWrap: 'normal' }}>Configuration</th></tr></thead>
          <tbody>{tags.map((tag) => <tr key={tag.name}>
            <td style={cell}><CostTagHelp name={tag.name} /></td>
            <td style={cell}>{tag.name === 'tag-lz-cost-center' ? <div style={{ display: 'grid', gap: 14 }}>
              {costCenterRows.map((value, index) => {
                const scope = costCenterFilter(cfg, value.trim());
                return <div key={index} style={{ display: 'grid', gap: 10, paddingBottom: 14, borderBottom: `1px solid ${oracle.border}` }}>
                  <div style={costCenterHeader}>
                  <input aria-label={`Cost center ${index + 1}`} disabled={regional} style={{ ...form.input, minWidth: 0 }} value={value}
                    onFocus={() => { costCenterBeforeEdit.current = costCenterRaw; }}
                    onChange={(event) => updateTagValues(tag.name, costCenterRows.map((entry, position) => position === index ? event.target.value : entry).join(', '))}
                    onBlur={() => {
                      if (costCenterBeforeEdit.current !== null) onChange(syncCostCenterBudgets(cfg, costCenterBeforeEdit.current));
                      costCenterBeforeEdit.current = null;
                    }} />
                  <button type="button" disabled={regional} aria-label={`Edit cost center ${value.trim()}`} aria-expanded={editingCostCenter === index} aria-controls={`cost-center-advanced-${index}`}
                    style={{ ...form.addBtn, minHeight: 44, background: oracle.surface, color: oracle.redDark, padding: '9px 0', width: '100%' }}
                    onClick={() => setEditingCostCenter(editingCostCenter === index ? null : index)}>Edit</button>
                  <DeleteButton disabled={regional} label={`Remove cost center ${value.trim()}`} style={{ width: 44, height: 44, flexShrink: 0 }} onClick={() => { setEditingCostCenter(null); onChange(removeCostCenter(cfg, value.trim())); }} />
                  </div>
                  <div id={`cost-center-advanced-${index}`} hidden={editingCostCenter !== index}>
                    <strong style={{ display: 'block', marginBottom: 10 }}>Advanced cost configuration</strong>
                    <div className="business-unit-scope-fields">
                    {(['platform', 'environment', 'project'] as const).map((field) => <BusinessUnitPicker key={field} kind="cost center" unit={value.trim()} field={field} options={businessOptions[field]} selected={scope[field]} disabled={regional}
                      onChange={(selected) => patch({ costCenterFilters: { ...cfg.costCenterFilters, [value.trim()]: { ...scope, [field]: selected } } })} />)}
                    </div>
                  </div>
                </div>;
              })}
              {addingCostCenter ? <>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={costCenterHeader}>
                  <input autoFocus disabled={regional} aria-label="New cost center" placeholder="New cost center" style={{ ...form.input, minWidth: 0 }} value={newCostCenter} onChange={(event) => setNewCostCenter(event.target.value)} />
                  <button type="button" disabled={regional} aria-label="Edit new cost center" aria-expanded={editingNewCostCenter} aria-controls="cost-center-advanced-new"
                    style={{ ...form.addBtn, minHeight: 44, background: oracle.surface, color: oracle.redDark, padding: '9px 0', width: '100%' }} onClick={() => setEditingNewCostCenter(!editingNewCostCenter)}>Edit</button>
                  <DeleteButton disabled={regional} label="Discard new cost center" style={{ width: 44, height: 44 }} onClick={() => {
                    setAddingCostCenter(false); setNewCostCenter(''); setEditingNewCostCenter(false);
                    setNewCostCenterFilter({ platform: null, environment: null, project: null });
                  }} />
                  </div>
                  <div id="cost-center-advanced-new" hidden={!editingNewCostCenter}>
                    <strong style={{ display: 'block', marginBottom: 10 }}>Advanced cost configuration</strong>
                    <div className="business-unit-scope-fields">
                  {(['platform', 'environment', 'project'] as const).map((field) => <BusinessUnitPicker key={field} kind="cost center" unit="new cost center" field={field} options={businessOptions[field]} selected={newCostCenterFilter[field]} disabled={regional}
                    onChange={(selected) => setNewCostCenterFilter({ ...newCostCenterFilter, [field]: selected })} />)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" disabled={regional || !parseTagValues(newCostCenter).some((value) => !costCenters.includes(value))} style={{ ...form.addBtn, minHeight: 44 }} onClick={addCostCenter}>Add</button>
                  <button type="button" style={{ ...form.addBtn, background: oracle.surface, color: oracle.text, minHeight: 44 }} onClick={() => { setAddingCostCenter(false); setNewCostCenter(''); setNewCostCenterFilter({ platform: null, environment: null, project: null }); }}>Cancel</button>
                </div>
              </> : <button type="button" disabled={regional} style={{ ...form.addBtn, minHeight: 44 }} onClick={() => { setEditingNewCostCenter(false); setAddingCostCenter(true); }}>Add cost center</button>}

              <p style={form.help}>Generated resources must match all active filters. Select Not apply to skip a filter.</p>
              {!regional && <CostCenterCoverageNotice resources={uncoveredCostResources} model={model} />}
              <figure aria-label="Cost Centers to Business Unit: N:1 relationship" style={{ margin: 0, padding: 12, border: `1px solid ${oracle.border}`, borderRadius: 6, background: oracle.surfaceAlt }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 20px minmax(0, 1fr)', gap: 8, alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ padding: '10px 4px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface }}>
                    <strong style={{ display: 'block', color: oracle.redDark, fontSize: 18 }}>N</strong>
                    <span style={{ fontSize: 12 }}>Cost Centers</span>
                  </div>
                  <span aria-hidden="true" style={{ fontSize: 20, color: oracle.textMuted }}>→</span>
                  <div style={{ padding: '10px 4px', border: `1px solid ${oracle.borderStrong}`, borderRadius: 4, background: oracle.surface }}>
                    <strong style={{ display: 'block', color: oracle.redDark, fontSize: 18 }}>1</strong>
                    <span style={{ fontSize: 12 }}>Business Unit</span>
                  </div>
                </div>
                <figcaption style={{ ...form.help, fontSize: 12, marginTop: 8 }}>Several cost centers can share a business unit. Each cost center belongs to only one.</figcaption>
              </figure>
            </div> : tag.name === 'tag-lz-owner' ? <div>
              <input type="email" aria-label="Owner email" required disabled={regional} style={form.input} value={ownerEmail(cfg)}
                placeholder="email.address@example.com" onChange={(event) => patch({ ownerEmail: event.target.value })}
                {...fieldErrorProps('cost-owner-email-error', ownerError)} />
              <FieldError id="cost-owner-email-error" error={ownerError} />
              <p style={{ ...form.help, marginTop: 8 }}>One owner email for all resources. Per-resource owners are outside Studio’s current scope.</p>
            </div> : <><textarea disabled={regional} readOnly={inheritedCostTagNames.includes(tag.name)} aria-label={`LOV for ${tag.name}`} rows={compactTagNames.includes(tag.name) ? 2 : 3}
              title={tag.name === 'tag-lz-environment' ? 'Inherited from Foundation' : tag.name === 'tag-lz-project' ? 'Inherited from Projects; notapplicable is fixed' : tag.name === 'tag-lz-platform' ? 'Base classifications and platforms selected in your configuration' : undefined}
              style={{ ...form.input, minHeight: compactTagNames.includes(tag.name) ? 56 : 80, resize: inheritedCostTagNames.includes(tag.name) ? 'none' : 'vertical',
                ...(inheritedCostTagNames.includes(tag.name) ? { color: oracle.textMuted, backgroundColor: oracle.surfaceAlt, borderColor: oracle.border } : {}) }}
              value={inheritedCostTagNames.includes(tag.name) ? lov[tag.name].join(', ') : cfg.tagValueLists?.[tag.name] ?? lov[tag.name].join(', ')}
              onFocus={tag.name === 'tag-lz-business-unit' ? () => { businessUnitBeforeEdit.current = cfg.tagValueLists?.[tag.name] ?? lov[tag.name].join(', '); } : undefined}
              onBlur={tag.name === 'tag-lz-business-unit' ? () => {
                if (businessUnitBeforeEdit.current !== null) onChange(syncBusinessUnitAssignments(cfg, businessUnitBeforeEdit.current));
                businessUnitBeforeEdit.current = null;
              } : undefined}
              onChange={inheritedCostTagNames.includes(tag.name) ? undefined : (event) => updateTagValues(tag.name, event.target.value)} />
              {tag.name === 'tag-lz-business-unit' && <div style={{ display: 'grid', gap: 16, marginTop: 14 }}>
                {businessUnits.map((unit) => {
                  const selected = costCenters.filter((center) => assignments[center] === unit);
                  return <fieldset key={unit} disabled={regional} aria-label={`Cost centers for business unit ${unit}`} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>{unit}</strong>
                    <details>
                      <summary style={{ ...compactInput, cursor: 'pointer', overflowWrap: 'anywhere' }} aria-label={`Cost centers for ${unit}`}>{selected.join(', ') || 'Select cost centers'}</summary>
                      <div style={{ padding: 8, border: `1px solid ${oracle.border}`, borderRadius: 4, marginTop: 4 }}>
                        {costCenters.length === 0 && <p style={form.help}>Add a cost center first.</p>}
                        {costCenters.map((center) => {
                          const owner = assignments[center];
                          const unavailable = !!owner && owner !== unit;
                          return <label key={center} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 0', fontSize: 13, color: unavailable ? oracle.textMuted : oracle.ink }}>
                            <input type="checkbox" aria-label={`${center} for business unit ${unit}`} disabled={unavailable} checked={owner === unit}
                              onChange={(event) => onChange(assignCostCenterBusinessUnit(cfg, center, event.target.checked ? unit : null))} />
                            {center}{unavailable ? ` · Assigned to ${owner}` : ''}
                          </label>;
                        })}
                      </div>
                    </details>
                    {!selected.length && <p className="field-error">Assign at least one cost center to this business unit.</p>}
                  </fieldset>;
                })}
                {!regional && <FieldError id="cost-center-business-unit-error" error={unassignedCostCenterErrors(cfg)} />}
                <p style={form.help}>Business unit values are assigned to generated resources through their cost centers. Each business unit requires at least one cost center; each cost center belongs to one business unit.</p>
              </div>}
            </>}</td>
            <td style={{ ...cell, verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
              <button type="button" className="cost-tag-locator" aria-label={`Show scope of ${tag.name}`} title={`Show where ${tag.name} applies in the diagram`}
                aria-pressed={selectedTag === tag.name} onClick={() => onTagSelect?.(tag.name)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </button>

            </div></td>
          </tr>)}</tbody>
        </table>
      </fieldset>
    </GovernancePanel>
    <GovernancePanel id="cost-budgets-title" title="Budgets">
      {regional && <p style={form.intro}>Tags and budgets are managed in the Home Region. DR does not create budgets.</p>}
      <fieldset aria-labelledby="cost-budgets-title" disabled={regional} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <p style={{ ...form.help, margin: '0 0 12px' }}>Monthly budgets inherited from One-OE, plus one for each additional project assigned to an environment. Editing a name does not change its target compartment or tags.</p>
        <label style={choice}>
          <input type="checkbox" checked={cfg.useSingleRecipient} onChange={(event) => patch({ useSingleRecipient: event.target.checked })} />
          Use one email for all budget alerts
        </label>
        {cfg.useSingleRecipient && <div style={{ marginTop: 14 }}>
          <label style={form.label} htmlFor="cost-budget-shared-email">Notification emails</label>
          <input id="cost-budget-shared-email" type="email" required={activeKeys.length > 0} style={{ ...form.input, borderColor: oracle.redDark }} value={cfg.recipients} placeholder="Enter at least one notification email address."
            onChange={(event) => patch({ recipients: event.target.value })} {...fieldErrorProps('cost-budget-shared-email-error', sharedError)} />
          <FieldError id="cost-budget-shared-email-error" error={sharedError} />
          {!sharedError && <div className="field-error">Enter at least one notification email address.</div>}
        </div>}
        <p style={{ ...form.help, margin: '8px 0 12px' }}>Alerts compare actual spending with each budget.</p>
        <p style={{ ...form.help, margin: '8px 0 12px' }}>Remove a budget to exclude it from generated configuration. Inherited budgets can be restored below.</p>
        {activeKeys.length === 0 && <p style={form.help}>No budgets selected for this design.</p>}
        {activeKeys.map((key) => {
          const budget = cfg.additionalBudgets?.[key] ?? cfg.budgets[key] ?? defaults.budgets[key];
          const custom = cfg.additionalBudgets?.[key];
          const targetValues = custom ? budgetTagValues(model, custom.tagName) : [];
          const targetError = custom ? customBudgetError(custom, targetValues) : null;
          const definition = definitions[key];
          return <details key={key} open={newBudgetKey === key} style={{ borderTop: `1px solid ${oracle.border}`, marginTop: 10 }}>
            <summary className="cost-budget-summary" style={{ cursor: 'pointer', padding: '14px 0', minHeight: 44, fontSize: 13, overflowWrap: 'anywhere', color: oracle.ink }}>
              <span style={{ float: 'right', marginLeft: 10 }} onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                <DeleteButton label={`Remove budget ${budget.name}`} style={{ width: 44, height: 44 }} onClick={() => removeBudget(key)} />
              </span>
              <strong>{budget.name || definition.name}</strong><span style={{ color: oracle.textMuted }}> · {Number.isFinite(budget.amount) ? budget.amount.toLocaleString('en-US') : 'Enter amount'} / month</span>
            </summary>
            <p style={{ ...form.help, margin: '0 0 14px' }}>{definition.description.replace(/^Monthly budget for /, 'Target: ')}</p>
            {custom && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div><label style={form.label} htmlFor={`budget-tag-${key}`}>Tag</label>
                <select id={`budget-tag-${key}`} style={form.input} value={custom.tagName} onChange={(event) => updateTarget(key, 'tagName', event.target.value)}>
                  {tags.map((tag) => <option key={tag.name} value={tag.name}>{tag.name}</option>)}
                </select></div>
              <div><label style={form.label} htmlFor={`budget-tag-value-${key}`}>Tag value</label>
                <select id={`budget-tag-value-${key}`} style={form.input} value={targetValues.includes(custom.tagValue) ? custom.tagValue : ''} onChange={(event) => updateTarget(key, 'tagValue', event.target.value)}
                  {...fieldErrorProps(`budget-tag-value-${key}-error`, targetError)}>
                  <option value="">Choose a defined tag value</option>
                  {targetValues.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <FieldError id={`budget-tag-value-${key}-error`} error={targetError} /></div>
            </div>}
            <div className="cost-budget-fields" style={{ display: 'grid', gap: 14, alignItems: 'end', marginBottom: 18 }}>
              {fields.filter(([field]) => field !== 'recipients' || !cfg.useSingleRecipient).map(([field, label]) => {
                const id = `cost-budget-${key}-${field}`;
                const numeric = field === 'amount' || field === 'thresholdValue';
                const error = budgetFieldError(field, budget[field]);
                return <div key={field} className={`cost-budget-field--${field}`}>
                  <label style={form.label} htmlFor={id}>{label}</label>
                  <input id={id} aria-label={`${label} for ${definition.name}`} type={numeric ? 'number' : 'text'} style={field === 'recipients' ? { ...form.input, borderColor: oracle.redDark } : form.input}
                    value={numeric && !Number.isFinite(budget[field]) ? '' : budget[field]}
                    {...(field === 'amount' ? { min: 1, max: 999999999999, step: 1 } : field === 'thresholdValue' ? { min: 0.01, max: 10000, step: 0.01 } : {})}
                    {...(field === 'recipients' ? { inputMode: 'email' as const, required: true, placeholder: 'Enter at least one notification email address.' } : {})}
                    onChange={(event) => updateBudget(key, field, numeric ? event.target.valueAsNumber : event.target.value)}
                    {...fieldErrorProps(`${id}-error`, error)} />
                  <FieldError id={`${id}-error`} error={error} />
                  {field === 'recipients' && !error && <div className="field-error">Enter at least one notification email address.</div>}
                </div>;
              })}
            </div>
          </details>;
        })}
        <button type="button" style={{ ...form.addBtn, minHeight: 44, marginTop: 16 }} onClick={addBudget}>Add tag-based budget</button>
        {restorable.length > 0 && <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', padding: '12px 0', fontSize: 13, color: oracle.ink }}>Removed budgets ({restorable.length})</summary>
          {restorable.map((key) => <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '8px 0', fontSize: 13 }}>
            <span>{cfg.additionalBudgets?.[key]?.name ?? cfg.budgets[key]?.name ?? defaults.budgets[key]?.name ?? key}</span>
            <button type="button" style={{ ...form.addBtn, minHeight: 44 }} aria-label={`Restore budget ${cfg.additionalBudgets?.[key]?.name ?? cfg.budgets[key]?.name ?? key}`} onClick={() => patch({ removedBudgets: removed.filter((item) => item !== key) })}>Restore</button>
          </div>)}
        </details>}
      </fieldset>
    </GovernancePanel>
  </>;
}
