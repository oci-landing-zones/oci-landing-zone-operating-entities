# Landing Zone Studio

Wizard-driven generator for OCI Landing Zone config with a **live, exportable network diagram** and an **interactive packet-flow tracer**.

You fill in a step-by-step wizard (text fields, dropdowns, checkboxes, switches). Each input updates a single canonical Landing Zone model **and** a live network diagram that grows as you go. Review generates one complete ZIP containing `config.jsonnet` and every Jsonnet artifact; the diagram exports separately to **draw.io** (`.drawio`) so you can keep editing it anywhere.

> **Status:** Steps 1–5 are built end to end — **Foundation** (saved-design name and region), **Hub Network** (Hub A/B/C/E generator-aligned layouts, CIDR engine, gateways, DRG + attachments, editable subnet config keys), **Projects / Environment Networks**, **Platforms** (optional repeatable shared Custom/OCVS platforms plus environment OKE Simple, OCVS, and custom platforms), and **Review**. The model is saved continuously. Review invokes the canonical browser Jsonnet runtime, downloads the complete ZIP, and is the only place that exports the structural Draw.io diagram. Packet-flow tracing has dedicated adapters for every supported hub; Hub C retains the generator's external firewall backend placeholders in `network_backends.json` for manual completion.

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

For production hosting, publish the `dist` directory and configure an SPA fallback so deep links resolve to `index.html`. Serve the Content Security Policy from `index.html` as an HTTP response header when the hosting platform supports it. The narrow `wasm-unsafe-eval` source permits WebAssembly compilation for Jsonnet; it does not permit JavaScript `eval`.

## Security and data handling

Studio is a browser-only generator: it does not deploy to OCI, request OCI credentials, or transmit Landing Zone models or generated artifacts to a service. Designs and the most recent generated ZIP snapshot are stored only in the active browser profile through `localStorage`; use a browser profile controlled by the intended operator and do not enter secrets into Studio. Browser-storage failures are shown in the UI, and a downloaded ZIP remains usable even if its local snapshot cannot be retained. Review generated files, placeholders, routing, and security settings before deployment; Studio is not an Oracle-managed deployment service.

## Architecture — one source of truth, many consumers

The load-bearing idea: a **single canonical model** drives everything, and rendering is **decoupled** from export so neither compromises the other.

```
 wizard inputs (text / dropdown / checkbox / switch)
        │
        ▼
   canonical LzModel              ◄── single source of truth (model/types.ts)
        │
        ├─► serializeConfig()  →  Review ZIP input (`config.jsonnet`)
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
- The on-screen React Flow canvas and Review's `.drawio` exporter both consume `DiagramModel`; Review deliberately builds the complete step-5 structural view without flow/debug overlays.
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
| `lzng.lz.index`           | The list of saved Landing Zones (id, name, timestamps). The namespace remains stable so local designs are not orphaned by the product rename. |
| `lzng.lz.<id>`            | One Landing Zone record — its canonical `LzModel`, saved on every field change. |
| `lzng.lz.<id>.outputs`    | Gzipped generator snapshot: config plus the complete artifact set. |
| `lzng.disclaimer.accepted`| One-time acceptance of the front-page disclaimer. |

Flow/diagram view state (active flows, packet step, open route tables) is in-memory only — it drives the live overlay but isn't persisted.

## Jsonnet browser runtime

`3rd/go-jsonnet` is the active go-jsonnet WASM runtime used by the browser and tests.
Its custom in-memory importer caches canonical paths, which the current generator
requires when a function-local import is evaluated more than once.

The dashboard and disclaimer do not load the large engine. Opening a Landing Zone
wizard schedules the complete generation chunk, WASM download, and VM boot during
browser idle time; generation reuses that same in-flight or completed VM instead
of adding the startup delay to the first config download.
