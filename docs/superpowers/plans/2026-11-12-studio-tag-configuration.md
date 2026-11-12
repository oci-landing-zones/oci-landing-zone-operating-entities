# Studio Tag Configuration Implementation Plan

**Goal:** Add the approved Show tag configuration action in Governance, opening a wide diagram with an editable tag sidebar and existing eye controls.

**Architecture:** Reuse CostGovernanceSection through a tags-only variant of ObservabilityCostStep. WizardShell owns the temporary diagram workspace selection; opening tags suspends network flow layers without changing saved flow selections. All edits continue through the existing canonical model and autosave. FinOps must be enabled; regional DR remains read-only and inherits Home governance.

**Tech Stack:** React, TypeScript, existing React Flow diagram, CSS, Vitest. No new dependencies.

1. Add regression coverage for a tags-only editor: six existing eye controls, no budgets or enable toggle, existing owner validation and regional locking preserved. Run the tests before implementation.
2. Add `tagsOnly?: boolean` to CostGovernanceSection and ObservabilityCostStep. Render the existing tag editor while omitting budgets and introductory activation controls in this variant. Add TagConfigurationSidebar with heading, explanatory text and Back to Governance action.
3. Add an explicit diagram workspace state (`overview`, `flows`, `tags`) to WizardShell, with mutually exclusive sidebars. Open tags only from Governance when enabled; retain the selected tag and model on return. Reuse diagram edit deferral for sidebar inputs. Clear the workspace on step/view changes and suspend tag highlights when tagging is disabled.
4. Extend existing responsive workspace CSS with a scrollable tag sidebar, comfortable editor width, 44px actions and stacked layout below 1100px. Preserve the existing flow sidebar.
5. Run sidebar/editor/workspace regressions and related WizardShell/FlowSidebar/tagScope tests, typecheck, lint, production build and diff whitespace checks. Verify default published One-OE JSON files are unchanged. Attempt browser verification using CUA; report any unavailable visual verification explicitly.

Approved design: diagram with editable lateral tag configuration, existing eyes highlight scope, Back to Governance preserves edits, budgets stay in Governance.

## Completion evidence

- Completed all five implementation steps; no dependencies added.
- 65 related tests pass across WizardShell, Governance, Foundation, FlowSidebar, tagScope and diagramEditing. Typecheck, lint, production build and diff whitespace checks pass. The existing Vite bundle-size advisory remains.
- Chrome desktop verification: tag configuration sidebar opens, all six eye controls and existing values are present, Platform eye produces the scope legend and resource highlights, and Back to Governance retains the same selected eye and focuses Show tag configuration. Native browser access was slow initially; no mobile viewport verification was performed.
- Follow-up UX: Governance displays its form beside a static FinOps reference image; Show tag configuration appears beside Enable FinOps tags only when enabled. Both actions have matching dimensions and are centered. The eye column is confined to the tag sidebar, and network flow controls are hidden in Foundation and Governance.
- The reference PNG preserves its original image data while omitting embedded draw.io editing metadata in the web copy. When FinOps is disabled, the image fits and centers within the height of the tags/budgets form.
- Email validation styling clears after valid owner or budget recipients are entered.
- Published files under blueprints/one-oe/runtime/one-stack are unchanged.
