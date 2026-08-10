# One-OE DR regional VSS implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not use subagents in this repository session.

**Goal:** Publish a Jsonnet-generated AMS VSS configuration for the One-OE DR addon while retaining Security Zones, Cloud Guard, and Vaults in the Frankfurt baseline.

**Architecture:** Regional VSS naming moves into the common security builder, so the One-OE baseline emits `FRA` resource names and the AMS DR profile emits `AMS` names. A narrow addon overlay selects only `scanning_configuration`, thereby avoiding conflicting Security Zone associations and home-region/global security resources.

**Tech Stack:** Jsonnet, Bash generator (`gen/generate.sh`), Python `unittest`, OCI Resource Manager JSON.

**Repository constraint:** Do not create commits unless the user explicitly asks.

---

### Task 1: Add failing coverage for the VSS-only DR artifact

**Files:**
- Create: `tests/test_oneoe_dr_security.py`
- Create: `tests/gen/testdata/direct/pass/oneoe_dr_security_profile.jsonnet`

- [ ] **Step 1: Write the failing snapshot and scope test**

Create `tests/test_oneoe_dr_security.py` using the existing DR test helpers:

```python
from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe"
ENTRYPOINT = Path("gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.jsonnet")
SNAPSHOT = ADDON_DIR / "oneoe_bcdr_security.json"


class OneOeDrSecurityTests(unittest.TestCase):
    def test_security_snapshot_matches_its_jsonnet_entrypoint(self) -> None:
        self.assertTrue((REPO_ROOT / ENTRYPOINT).is_file())
        self.assertTrue(SNAPSHOT.is_file())
        self.assertEqual(
            render_jsonnet_object(ENTRYPOINT),
            json.loads(SNAPSHOT.read_text(encoding="utf-8")),
        )

    def test_dr_security_contains_only_ams_vss(self) -> None:
        config = render_jsonnet_object(ENTRYPOINT)
        self.assertEqual({"scanning_configuration"}, set(config))
        scanning = config["scanning_configuration"]
        self.assertEqual({"VSS-RCPH-AMS-LZ-KEY"}, set(scanning["host_recipes"]))
        self.assertEqual({"VSS-TGTH-AMS-LZ-KEY"}, set(scanning["host_targets"]))
        self.assertEqual("vss-rcph-ams-lz", scanning["host_recipes"]["VSS-RCPH-AMS-LZ-KEY"]["name"])
        self.assertEqual("CMP-LANDINGZONE-KEY", scanning["host_targets"]["VSS-TGTH-AMS-LZ-KEY"]["target_compartment_id"])
```

- [ ] **Step 2: Add baseline naming and README assertions**

Add two tests to the same class:

```python
    def test_oneoe_baseline_vss_uses_fra_resource_names(self) -> None:
        config = render_jsonnet_object(
            Path("gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet")
        )
        scanning = config["scanning_configuration"]
        self.assertEqual({"VSS-RCPH-FRA-LZ-KEY"}, set(scanning["host_recipes"]))
        self.assertEqual({"VSS-TGTH-FRA-LZ-KEY"}, set(scanning["host_targets"]))

    def test_readme_documents_vss_and_the_security_zone_boundary(self) -> None:
        content = (ADDON_DIR / "README.md").read_text(encoding="utf-8")
        for text in (
            "oneoe_bcdr_security.json",
            "Vulnerability Scanning Service (VSS)",
            "Security Zones",
            "not redeployed",
            "eu-amsterdam-1",
        ):
            self.assertIn(text, content)
```

- [ ] **Step 3: Add a direct-render fixture**

Create `tests/gen/testdata/direct/pass/oneoe_dr_security_profile.jsonnet`:

```jsonnet
// Amsterdam DR security contains only regional VSS.
// contains: "recipe_key": "VSS-RCPH-AMS-LZ-KEY"
// contains: "target_key": "VSS-TGTH-AMS-LZ-KEY"
local security = import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.jsonnet';
local scanning = security.scanning_configuration;
{
  recipe_key: std.objectFields(scanning.host_recipes)[0],
  target_key: std.objectFields(scanning.host_targets)[0],
  top_level_keys: std.objectFields(security),
}
```

- [ ] **Step 4: Run the focused test to verify the red state**

Run:

```bash
JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_security -v
```

Expected: failure because the AMS Jsonnet entrypoint and snapshot do not exist.

### Task 2: Generate the narrow AMS VSS configuration

**Files:**
- Modify: `gen/builders/security.libsonnet:67-95`
- Create: `gen/addons/oci-lz-dr/one-oe/security.libsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.jsonnet`

- [ ] **Step 1: Regionalize VSS naming in the common security builder**

In `gen/builders/security.libsonnet`, change only the host recipe and host target naming calls from global to regional helpers. Keep all compartment references global:

```jsonnet
host_recipes: {
  [n.key('VSS-RCPH', [])]: {
    name: n.display('vss-rcph', []),
    // Existing VSS settings unchanged.
  },
},
host_targets: {
  [n.key('VSS-TGTH', [])]: {
    name: n.display('vss-tgth', []),
    host_recipe_id: n.key('VSS-RCPH', []),
    target_compartment_id: 'CMP-LANDINGZONE-KEY',
  },
},
```

- [ ] **Step 2: Implement the VSS-only addon overlay**

Create `gen/addons/oci-lz-dr/one-oe/security.libsonnet`:

```jsonnet
local lz = import '../../../landing_zone.libsonnet';

function(profile)
  {
    scanning_configuration: lz(profile).security_cis1.scanning_configuration,
  }
```

This deliberately omits `cloud_guard_configuration`, `security_zones_configuration`, and `vaults_configuration`.

- [ ] **Step 3: Add the published entrypoint**

Create `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.jsonnet`:

```jsonnet
local profiles = import './profiles.libsonnet';
local security = import './security.libsonnet';

security(profiles.hub_a)
```

- [ ] **Step 4: Run the focused test to verify the green state**

Run:

```bash
JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_security -v
```

Expected: the scope and naming tests pass except the snapshot test, which must wait for generation.

### Task 3: Regenerate artifacts and update the deployment guide

**Files:**
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json` (generated)
- Modify: `blueprints/one-oe/runtime/one-stack/oneoe_security_cis1_pre.json`
- Modify: `blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.json`
- Modify: `blueprints/one-oe/runtime/one-stack/oneoe_security_cis2_pre.json`
- Modify: `blueprints/one-oe/runtime/one-stack/oneoe_security_cis2.json`
- Modify: generated security snapshots under `workload-extensions/` affected by the shared VSS naming change
- Modify: `addons/oci-lz-dr/one-oe/README.md:60-92`

- [ ] **Step 1: Regenerate every source-derived JSON artifact**

Run the repository generator instead of editing any JSON directly:

```bash
JSONNET_BIN=jsonnet bash gen/generate.sh
```

Expected: creates `oneoe_bcdr_security.json`, emits FRA VSS keys in the baseline snapshots, and refreshes any extension snapshot that composes the common security builder.

- [ ] **Step 2: Add VSS to the initial BCDR deployment matrix**

For every cell in the Step 1 table in `addons/oci-lz-dr/one-oe/README.md`, append this third configuration source and displayed filename:

```text
https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/dr/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json
oneoe_bcdr_security.json
```

Use it in every Hub and CIS selection because VSS does not vary by hub, CIS level, or staging phase.

- [ ] **Step 3: Replace the obsolete Security Zones/VSS note**

Replace the sentence that says both services are unpublished with this explicit deployment boundary:

```markdown
`oneoe_bcdr_security.json` deploys Vulnerability Scanning Service (VSS) recipes and targets in AMS. It is included in the initial BCDR stack and does not need a staged replacement.

Security Zones are not redeployed in Amsterdam. The One-OE baseline already associates the shared tenancy-wide compartment hierarchy with its Security Zones; OCI does not allow a compartment to belong to multiple Security Zones. Cloud Guard and Vaults likewise remain managed by the Frankfurt baseline.
```

- [ ] **Step 4: Run the focused security tests and direct fixtures**

Run:

```bash
JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_security -v
JSONNET_BIN=jsonnet python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases -v
```

Expected: both commands pass, including source/snapshot parity.

### Task 4: Final validation and review

**Files:**
- Review: all files changed by the generator and Tasks 1-3

- [ ] **Step 1: Run the complete validation suite**

Run:

```bash
JSONNET_BIN=jsonnet python3 -m unittest discover -s tests -p 'test_*.py' -v
git diff --check
```

Expected: all tests pass and `git diff --check` returns no output.

- [ ] **Step 2: Inspect the intended change surface**

Run:

```bash
git status --short
git diff -- gen/builders/security.libsonnet gen/addons/oci-lz-dr/one-oe addons/oci-lz-dr/one-oe/README.md tests/test_oneoe_dr_security.py
```

Expected: source changes are limited to regional VSS naming and the VSS-only AMS overlay; generated JSON changes are produced by `gen/generate.sh`; no Security Zone, Cloud Guard, Vault, or IAM source is added to the BCDR addon.
