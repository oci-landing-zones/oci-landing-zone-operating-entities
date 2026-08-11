# One-OE DR RPC Requester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish complete One-OE BCDR requester network configurations for every final hub variant, with an Amsterdam-to-Frankfurt RPC and safe firewall routing.

**Architecture:** A publication-local Jsonnet adapter will take the final rendered network for a profile and return a complete `network_configuration` containing its existing resources plus the requester RPC resources. Hub E will route the Frankfurt range directly to the DRG. Hub A, B, C, and C-backends will keep prod-only RPC routing symmetric through their existing firewall path; workload-specific firewall allow rules remain an explicitly documented manual action.

**Tech Stack:** Jsonnet, the existing One-OE network generator, generated JSON snapshots, Python `unittest`, Markdown.

---

### Task 1: Define the requester artifact contract with failing tests

**Files:**
- Modify: `tests/test_oneoe_dr_factory_network.py`

- [ ] **Step 1: Add the five missing requester entrypoints to the snapshot mapping**

```python
REQUESTER_ENTRYPOINTS = {
    "oneoe_bcdr_network_hub_a_requester.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_requester.jsonnet",
    "oneoe_bcdr_network_hub_b_requester.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_requester.jsonnet",
    "oneoe_bcdr_network_hub_c_requester.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_requester.jsonnet",
    "oneoe_bcdr_network_hub_c_backends_requester.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends_requester.jsonnet",
    "oneoe_bcdr_network_hub_e_requester.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e_requester.jsonnet",
}
```

- [ ] **Step 2: Add a failing snapshot test for all requester entrypoints**

```python
def test_published_requester_snapshots_match_jsonnet_entrypoints(self) -> None:
    for snapshot_name, entrypoint_name in REQUESTER_ENTRYPOINTS.items():
        with self.subTest(snapshot=snapshot_name):
            self.assertEqual(
                render_jsonnet_object(Path(entrypoint_name)),
                json.loads((ADDON_DIR / snapshot_name).read_text(encoding="utf-8")),
            )
```

- [ ] **Step 3: Add failing behavioural tests for the shared RPC contract**

```python
def test_requester_artifacts_add_the_ams_to_fra_rpc(self) -> None:
    for entrypoint_name in REQUESTER_ENTRYPOINTS.values():
        network = render_jsonnet_object(Path(entrypoint_name))
        drg = network["network_configuration"]["network_configuration_categories"]["0-shared"][
            "non_vcn_specific_gateways"
        ]["dynamic_routing_gateways"]["DRG-AMS-LZ-HUB-KEY"]
        self.assertEqual(
            "RPC-FRA-LZ-HUB-REGION-B-KEY",
            drg["remote_peering_connections"]["RPC-AMS-LZ-HUB-REGION-A-KEY"]["peer_key"],
        )
        self.assertEqual(
            "eu-frankfurt-1",
            drg["remote_peering_connections"]["RPC-AMS-LZ-HUB-REGION-A-KEY"]["peer_region_name"],
        )
        self.assertIn("DRGATT-AMS-LZ-HUB-RPC-REGION-A-KEY", drg["drg_attachments"])
        self.assertIn("DRGRT-AMS-LZ-RPC-REGION-A-KEY", drg["drg_route_tables"])
```

- [ ] **Step 4: Add failing tests for routing boundaries**

```python
def test_hub_e_requester_routes_frankfurt_directly_to_the_drg(self) -> None:
    network = render_jsonnet_object(Path(REQUESTER_ENTRYPOINTS["oneoe_bcdr_network_hub_e_requester.json"]))
    route_rules = network["network_configuration"]["network_configuration_categories"]["1-prod"]["vcns"][
        "VCN-AMS-LZ-PROD-PROJECTS-KEY"
    ]["route_tables"]["RT-AMS-LZ-PROD-PROJ-GENERIC-KEY"]["route_rules"]
    self.assertEqual("DRG-AMS-LZ-HUB-KEY", route_rules["rr-ams-rpc-region-a-1"]["network_entity_key"])


def test_firewall_requesters_route_only_prod_back_to_the_hub(self) -> None:
    for snapshot_name in (
        "oneoe_bcdr_network_hub_a_requester.json",
        "oneoe_bcdr_network_hub_b_requester.json",
        "oneoe_bcdr_network_hub_c_requester.json",
        "oneoe_bcdr_network_hub_c_backends_requester.json",
    ):
        network = render_jsonnet_object(Path(REQUESTER_ENTRYPOINTS[snapshot_name]))
        drg = network["network_configuration"]["network_configuration_categories"]["0-shared"][
            "non_vcn_specific_gateways"
        ]["dynamic_routing_gateways"]["DRG-AMS-LZ-HUB-KEY"]
        rpc_table = drg["drg_route_tables"]["DRGRT-AMS-LZ-RPC-REGION-A-KEY"]
        self.assertEqual(
            "DRGATT-AMS-LZ-HUB-VCN-KEY",
            rpc_table["route_rules"]["DRGRT-AMS-LZ-RPC-REGION-A-PROD-STATIC-ROUTE"]["next_hop_drg_attachment_key"],
        )
```

- [ ] **Step 5: Run the focused test and confirm it fails because the requester files do not exist yet**

Run: `JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_factory_network -v`

Expected: failure identifying the missing requester Jsonnet entrypoints or snapshots.

### Task 2: Implement the publication-local Jsonnet requester adapter

**Files:**
- Create: `gen/addons/oci-lz-dr/one-oe/rpc_requester.libsonnet`

- [ ] **Step 1: Implement the adapter constants and function signature**

```jsonnet
local naming = import '../../../naming.libsonnet';

local remote_cidr = '10.0.0.0/16';
local peer_key = 'RPC-FRA-LZ-HUB-REGION-B-KEY';
local peer_region = 'eu-frankfurt-1';

function(profile, final_network, firewall_egress_route_table=null)
  local n = naming(profile.region_short_name);
  local drg_key = n.key('DRG', ['HUB']);
  local hub_attachment_key = n.key('DRGATT', ['HUB', 'VCN']);
  local prod_attachment_key = n.key('DRGATT', ['PROD', 'PROJ']);
  local rpc_key = n.key('RPC', ['HUB', 'REGION', 'A']);
  local rpc_attachment_key = n.key('DRGATT', ['HUB', 'RPC', 'REGION', 'A']);
  local rpc_distribution_key = n.key('DRGRD', ['RPC', 'REGION', 'A']);
  local rpc_route_table_key = n.key('DRGRT', ['RPC', 'REGION', 'A']);
  final_network + { /* additive requester overlay */ };
```

- [ ] **Step 2: Add the RPC resources without replacing base DRG data**

```jsonnet
drg_attachments+: {
  [rpc_attachment_key]: {
    display_name: n.display('drgatt', ['hub', 'rpc', 'region', 'a']),
    drg_route_table_key: rpc_route_table_key,
    network_details: {
      type: 'REMOTE_PEERING_CONNECTION',
      attached_resource_key: rpc_key,
    },
  },
},
remote_peering_connections+: {
  [rpc_key]: {
    display_name: n.display('rpc', ['hub', 'region', 'a']),
    peer_key: peer_key,
    peer_region_name: peer_region,
  },
},
```

- [ ] **Step 3: Implement the Hub E branch**

Add an RPC import distribution that accepts the existing Hub and prod VCN attachments, a dedicated RPC DRG route table, and the `rr-ams-rpc-region-a-1` route to `10.0.0.0/16` through `DRG-AMS-LZ-HUB-KEY` in the Hub LB, Hub MGMT, and prod generic route tables. Append—not replace—the RPC acceptance rule in `DRGRD-AMS-LZ-HUB-KEY` and `DRGRD-AMS-LZ-SPOKE-KEY`.

- [ ] **Step 4: Implement the firewall-hub branch**

For Hub A, Hub B, Hub C, and Hub C-backends:

```jsonnet
drg_route_tables+: {
  [rpc_route_table_key]: {
    display_name: n.display('drgrt', ['rpc', 'region', 'a']),
    is_ecmp_enabled: false,
    route_rules: {
      ['DRGRT-%s-LZ-RPC-REGION-A-PROD-STATIC-ROUTE' % std.asciiUpper(n.region)]: {
        destination: '10.0.200.0/21',
        destination_type: 'CIDR_BLOCK',
        next_hop_drg_attachment_key: hub_attachment_key,
      },
    },
  },
},
```

Append the RPC acceptance statement only to `DRGRD-AMS-LZ-HUB-KEY`. Add the Frankfurt route through the DRG to the firewall egress route table: `RT-AMS-LZ-HUB-FW-INT-KEY` for Hub A, `RT-AMS-LZ-HUB-FW-KEY` for Hub B, and `RT-AMS-LZ-HUB-TRUST-KEY` for Hub C and Hub C-backends. Do not add a direct RPC route to the Hub VCN or a broad Network Firewall rule.

- [ ] **Step 5: Keep the helper bounded to this published add-on**

Do not modify `gen/landing_zone.libsonnet`, generic hub builders, or `gen/defaults.libsonnet`; requester projection is specific to the BCDR published artifacts.

### Task 3: Create thin requester entrypoints and generated snapshots

**Files:**
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_requester.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_requester.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_requester.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends_requester.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e_requester.jsonnet`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_requester.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_requester.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_requester.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends_requester.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e_requester.json`

- [ ] **Step 1: Create the Hub A entrypoint**

```jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
local requester = import './rpc_requester.libsonnet';

requester(profiles.hub_a, lz(profiles.hub_a).network, 'RT-AMS-LZ-HUB-FW-INT-KEY')
```

- [ ] **Step 2: Create the Hub B and Hub C entrypoints with their firewall egress route tables**

```jsonnet
// Hub B
requester(profiles.hub_b, lz(profiles.hub_b).network, 'RT-AMS-LZ-HUB-FW-KEY')

// Hub C
requester(profiles.hub_c, lz(profiles.hub_c).network, 'RT-AMS-LZ-HUB-TRUST-KEY')
```

- [ ] **Step 3: Create the Hub C backends and Hub E entrypoints**

```jsonnet
// Hub C with third-party firewall backends
requester(profiles.hub_c, lz(profiles.hub_c).network_backends, 'RT-AMS-LZ-HUB-TRUST-KEY')

// Hub E without a firewall
requester(profiles.hub_e, lz(profiles.hub_e).network)
```

- [ ] **Step 4: Generate the five snapshots through the repository generator**

Run: `bash gen/generate.sh`

Expected: the five requester JSON snapshots appear under `addons/oci-lz-dr/one-oe/`; inspect the diff and retain only the requester artifacts expected from the new entrypoints.

- [ ] **Step 5: Run the focused tests and confirm they pass**

Run: `JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_factory_network -v`

Expected: PASS, including snapshot equality and requester routing tests.

### Task 4: Document requester replacement and firewall prerequisites

**Files:**
- Modify: `addons/oci-lz-dr/one-oe/README.md`
- Modify: `tests/test_oneoe_dr_security.py`

- [ ] **Step 1: Add the requester replacement rule to Step 1.1**

Insert this paragraph after the final-network replacement guidance:

```markdown
To establish an RPC to Frankfurt, replace the matching final network file with its `_requester.json` variant in the same ORM stack or Terraform state. Do not supply both files: each defines `network_configuration`, and the orchestrator does not deep-merge that top-level configuration family.
```

- [ ] **Step 2: Add the published requester filename mapping**

Insert this mapping directly after the requester replacement paragraph:

```markdown
| Final network file | Frankfurt requester replacement |
|---|---|
| `oneoe_bcdr_network_hub_a.json` | `oneoe_bcdr_network_hub_a_requester.json` |
| `oneoe_bcdr_network_hub_b.json` | `oneoe_bcdr_network_hub_b_requester.json` |
| `oneoe_bcdr_network_hub_c.json` | `oneoe_bcdr_network_hub_c_requester.json` |
| `oneoe_bcdr_network_hub_c_backends.json` | `oneoe_bcdr_network_hub_c_backends_requester.json` |
| `oneoe_bcdr_network_hub_e.json` | `oneoe_bcdr_network_hub_e_requester.json` |
```

- [ ] **Step 3: Add the firewall-policy manual post-deployment notice**

Insert this callout after the mapping:

```markdown
> [!IMPORTANT]
> **Manual post-deployment configuration required:** Hub A and Hub B requester deployments require OCI Network Firewall rules, and Hub C requester deployments require equivalent third-party firewall rules. Allow only the workload protocols required between the AMS prod VCN and the Frankfurt range `10.0.0.0/16`; do not add an allow-all rule.
```

- [ ] **Step 4: Extend the README security test**

```python
for text in (
    "Manual post-deployment configuration required",
    "workload protocols",
    "10.0.0.0/16",
    "oneoe_bcdr_network_hub_c_backends_requester.json",
):
    self.assertIn(text, content)
```

- [ ] **Step 5: Run the documentation tests**

Run: `JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_security tests.test_oneoe_dr_observability -v`

Expected: PASS.

### Task 5: Run complete regression validation

**Files:**
- Verify only: all files in the preceding tasks

- [ ] **Step 1: Run all repository tests**

Run: `JSONNET_BIN=jsonnet python3 -m unittest discover -s tests -p 'test_*.py' -v`

Expected: all tests PASS.

- [ ] **Step 2: Check whitespace and generated output review scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; changes limited to the requester helper, five entrypoints, five snapshots, focused tests, One-OE BCDR README, and this planning/documentation record. Preserve the user's existing untracked requester and acceptor files unless they are explicitly adopted in a later request.

- [ ] **Step 3: Do not commit automatically**

The repository policy requires an explicit user request before creating commits. Report the validated file list and wait for that request.
