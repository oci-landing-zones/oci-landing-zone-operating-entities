# Landing Zone Next Gen (LZNG)

Wizard-driven generator for OCI Landing Zone config with a **live, exportable network diagram** and an **interactive packet-flow tracer**.

You fill in a step-by-step wizard (text fields, dropdowns, checkboxes, switches). Each input updates a single canonical Landing Zone model **and** a live network diagram that grows as you go. The config is downloadable (`.jsonnet`), and the diagram exports to **draw.io** (`.drawio`) so you can keep editing it anywhere.

> **Status:** Steps 1–4 are built end to end — **Foundation** (region, tenancy, landing-zone naming), **Hub Network** (hub VCN kind, CIDR engine, gateways, DRG + attachments, editable subnets), **Projects / Environment Networks** (per-env spoke VCNs, Service Gateways, projects), and **Platforms** (a shared platform VCN outside every environment, plus VCN-bearing OKE Simple / Custom platforms dropped into environments — OKE seeds its mandatory subnets + cluster settings, each platform gets a per-environment VCN with overrides). On top of that the diagram derives **route tables**, subnet **endpoints (VMs)**, and a route-table-walking **flow engine**. Step 5 (Review) is a placeholder on the same spine.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **[React Flow](https://reactflow.dev/)** (`@xyflow/react`) for the interactive, animated, clickable diagram canvas
- **Vitest** for unit tests, **ESLint** (typescript-eslint) for linting

## Run

```bash
npm install
npm run build:wasm   # build the ignored, optimized browser Jsonnet runtime
npm run dev          # Vite dev server on http://localhost:5173
npm run typecheck    # tsc --noEmit (app + tooling configs)
npm run lint         # eslint
npm run test         # vitest (pure-function unit tests)
npm run build        # typecheck + vite build → dist/
npm run preview      # preview the production build
```

Open **http://localhost:5173/** — the dashboard lists your Landing Zones; create one to open the wizard at `/lz/:id`. No auth, no backend required for development; every route is public and all generation happens in the browser. (First visit shows a one-time disclaimer gate.)

For production hosting, publish the `dist` directory and configure an SPA fallback so deep links resolve to `index.html`.

## Architecture — one source of truth, many consumers

The load-bearing idea: a **single canonical model** drives everything, and rendering is **decoupled** from export so neither compromises the other.

```
 wizard inputs (text / dropdown / checkbox / switch)
        │
        ▼
   canonical LzModel              ◄── single source of truth (model/types.ts)
        │
        ├─► serializeConfig()  →  .jsonnet config preview / download
        │
        ├─► buildRouteTables() →  RouteTable[]   ◄── derived OCI route tables
        │                              │
        │                              └─► flowTrace() walks them → packet paths
        │
        └─► buildGraph()  →  DiagramModel        ◄── renderer-agnostic intermediate
                                  │              (consumes route tables + active flows)
                                  ├─► LzDiagram (React Flow)  — live, animated, clickable
                                  └─► toDrawio() → .drawio XML — animated edges → draw.io flowAnimation
```

- **`LzModel`** is the canonical object. The wizard only ever writes into it (via a dotted-path setter).
- **`buildGraph(model, upToStep, options)`** is a pure function producing a `DiagramModel` (nodes + edges + metadata). It limits the diagram to the wizard step reached, and folds in the endpoints / route-table / flow layers when those options are on.
- The **same `DiagramModel`** feeds both the on-screen React Flow canvas and the `.drawio` exporter, so what you see always matches what you export.
- Adding a wizard step = add fields to `LzModel` + grow `buildGraph`. The pure transforms (`buildGraph`, `buildRouteTables`, `flowTrace`, `toDrawio`, `cidr`) are the unit-tested spine.

## Network diagram & flow engine

In **Diagram-only** view at **Step 3**, two layers light up:

- **Show endpoints** — draws a VM in each spoke / management subnet and a route-table dot on every subnet, gateway, and DRG attachment. Click a dot to open that route table.
- **Show flows** — a docked, collapsible picker of the four canonical traffic flows, per environment:
  - **Spoke → Internet** (egress, via NAT after firewall inspection)
  - **Internet → Spoke** (ingress, via the hub public Load Balancer → DMZ FW → INT FW → DRG → private backend)
  - **Spoke ↔ Spoke** (east-west, hair-pinned through the internal firewall)
  - **Spoke → OCI Services** (per-spoke Service Gateway local breakout)

`services/flowTrace.ts` **walks the generated route tables** (longest-prefix match → follow the matched rule's next-hop → resolve the next table) to compute the exact packet path — so the trace stays correct as you edit CIDRs and rules. A selected flow:

- draws a continuous, orthogonal **animated path** (routed through clean channels, with a moving **source→dest pill** and per-segment direction arrows),
- **auto-opens** every route table it traverses and shows **only the rows it uses**,
- lists the **step-by-step hops** in the sidebar with **Prev / Auto / Next** manual packet stepping (the packet glides along the path),
- can be scoped to **a single endpoint** (e.g. `prod-db` only) via per-endpoint chips.

The route paths are validated against OCI hub-and-spoke semantics (DRG v2 attachment route tables, firewall re-injection, public-LB-with-private-backends ingress).

## Layout

```
index.html                 mounts src/main.tsx
src/                       application source
  main.tsx                 React entry
  App.tsx                  router + disclaimer gate (Dashboard / WizardShell)
  index.css
  model/                   canonical LzModel types + defaults / normalize (source of truth)
  wizard/                  WizardContext (model + dotted-path setter), WizardStepper,
                           steps/ (Foundation, HubNetwork, EnvNetwork)
  diagram/                 buildGraph (pure: model → DiagramModel) + LzDiagram (React Flow + flow overlay)
  export/                  toDrawio (pure: DiagramModel → .drawio XML) + download helper
  pages/                   Dashboard (manage LZs) + WizardShell (the wizard + diagram + flows)
  components/              FlowSidebar, ViewModeToggle, TopBar, JsonViewer, Disclaimer, …
  services/                cidr (CIDR engine), routeTables (derived OCI route tables),
                           flowTrace (route-table-walking packet tracer), lzConfig (.jsonnet),
                           hubKinds, regions, lzStore (localStorage), pagesBase
```

## State & persistence

All persistence lives behind `services/lzStore.ts`; the UI never touches `localStorage` directly.

| Key                       | Holds |
|---------------------------|-------|
| `lzng.lz.index`           | The list of saved Landing Zones (id, name, timestamps). |
| `lzng.lz.<id>`            | One Landing Zone record — its canonical `LzModel`, saved on every field change. |
| `lzng.disclaimer.accepted`| One-time acceptance of the front-page disclaimer. |

Flow/diagram view state (active flows, packet step, open route tables) is in-memory only — it drives the live overlay but isn't persisted.

## Jsonnet browser runtime

`3rd/go-jsonnet` is the active go-jsonnet WASM runtime used by the browser and tests.
Its custom in-memory importer caches canonical paths, which the current generator
requires when a function-local import is evaluated more than once.
