# One-OE DR Factory and Network Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the One-OE DR decision to the guided Factory flow and publish the Frankfurt-to-Amsterdam DR network topology from Jsonnet sources.

**Architecture:** A dedicated published profile under `gen/addons/oci-lz-dr/one-oe/` provides the Amsterdam region, the approved hub and PROD CIDRs, and no preproduction environment. Thin entrypoints select the standard One-OE network surfaces; `bash gen/generate.sh` produces the corresponding published BCDR JSON snapshots. Repository guidance asks the DR question after the forced One-OE baseline and documents the fixed preset.

**Tech Stack:** Jsonnet, Bash generator, JSON, Python `unittest`, Markdown, `jq`.

---

### Task 1: Define the DR profile and Factory-guidance contract with failing tests

**Files:**
- Create: `tests/test_oneoe_dr_factory_network.py`
- Create: `tests/gen/testdata/direct/pass/oneoe_dr_network_profile.jsonnet`

- [ ] **Step 1: Write the failing published-snapshot and guidance test**

```python
from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe"
QUESTION = "Do you want to deploy a Disaster Recovery (DR) region?"
ENTRYPOINTS = {
    "oneoe_bcdr_network_hub_a_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.jsonnet",
    "oneoe_bcdr_network_hub_a.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a.jsonnet",
    "oneoe_bcdr_network_hub_b_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.jsonnet",
    "oneoe_bcdr_network_hub_b.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b.jsonnet",
    "oneoe_bcdr_network_hub_c_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.jsonnet",
    "oneoe_bcdr_network_hub_c_backends.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends.jsonnet",
    "oneoe_bcdr_network_hub_c.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c.jsonnet",
    "oneoe_bcdr_network_hub_e.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.jsonnet",
}


class OneOeDrFactoryNetworkTests(unittest.TestCase):
    def test_published_network_snapshots_match_dr_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                entrypoint = REPO_ROOT / entrypoint_name
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue(entrypoint.is_file(), f"Missing DR Jsonnet entrypoint: {entrypoint}")
                self.assertTrue(snapshot.is_file(), f"Missing generated DR snapshot: {snapshot}")
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_dr_network_contains_only_ams_hub_and_prod_vcns(self) -> None:
        network = render_jsonnet_object(Path(ENTRYPOINTS["oneoe_bcdr_network_hub_e.json"]))
        categories = network["network_configuration"]["network_configuration_categories"]

        self.assertEqual({"0-shared", "1-prod"}, set(categories))
        self.assertNotIn("2-preprod", categories)
        self.assertEqual(
            "10.0.192.0/21",
            categories["0-shared"]["vcns"]["VCN-AMS-LZ-HUB-KEY"]["cidr_blocks"][0],
        )
        self.assertEqual(
            "10.0.200.0/21",
            categories["1-prod"]["vcns"]["VCN-AMS-LZ-PROD-PROJECTS-KEY"]["cidr_blocks"][0],
        )

    def test_guided_factory_question_follows_the_oneoe_baseline(self) -> None:
        root_guidance = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        factory_readme = (REPO_ROOT / "addons/oci-lz-blueprint-factory/README.md").read_text(
            encoding="utf-8"
        )
        ai_readme = (REPO_ROOT / "addons/oci-lz-ai-agent/README.md").read_text(encoding="utf-8")
        skill = (
            REPO_ROOT / ".agents/skills/landing-zone-customer-guidance/SKILL.md"
        ).read_text(encoding="utf-8")

        self.assertLess(
            root_guidance.index("1. **Landing zone baseline**"),
            root_guidance.index(QUESTION),
        )
        self.assertLess(root_guidance.index(QUESTION), root_guidance.index("**Region and realm**"))
        for content in (root_guidance, factory_readme, ai_readme, skill):
            self.assertIn(QUESTION, content)
            self.assertIn("eu-amsterdam-1", content)
            self.assertIn("10.0.192.0/21", content)
            self.assertIn("10.0.200.0/21", content)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Write the failing direct Jsonnet fixture**

```jsonnet
// Published One-OE DR network entrypoints create only Amsterdam hub and PROD networks.
// contains: "hub_vcn_name": "vcn-ams-lz-hub"
// contains: "hub_vcn_cidr": "10.0.192.0/21"
// contains: "prod_vcn_name": "vcn-ams-lz-prod-projects"
// contains: "prod_vcn_cidr": "10.0.200.0/21"
// contains: "has_preprod_category": false
local summarize(network) =
  local categories = network.network_configuration.network_configuration_categories;
  {
    hub_vcn_name: categories['0-shared'].vcns['VCN-AMS-LZ-HUB-KEY'].display_name,
    hub_vcn_cidr: categories['0-shared'].vcns['VCN-AMS-LZ-HUB-KEY'].cidr_blocks[0],
    prod_vcn_name: categories['1-prod'].vcns['VCN-AMS-LZ-PROD-PROJECTS-KEY'].display_name,
    prod_vcn_cidr: categories['1-prod'].vcns['VCN-AMS-LZ-PROD-PROJECTS-KEY'].cidr_blocks[0],
    has_preprod_category: std.objectHas(categories, '2-preprod'),
  };
{
  hub_a_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.jsonnet'),
  hub_a: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a.jsonnet'),
  hub_b_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.jsonnet'),
  hub_b: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b.jsonnet'),
  hub_c_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.jsonnet'),
  hub_c_backends: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends.jsonnet'),
  hub_c: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c.jsonnet'),
  hub_e: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.jsonnet'),
}
```

- [ ] **Step 3: Run both tests and confirm the expected failure**

Run:

```bash
python3 -m unittest tests.test_oneoe_dr_factory_network -v
python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases -v
```

Expected: FAIL because the DR Jsonnet entrypoints and the Factory guidance question do not exist yet.

### Task 2: Add the One-OE Amsterdam DR Jsonnet publication family

**Files:**
- Create: `gen/addons/oci-lz-dr/one-oe/profiles.libsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c.jsonnet`
- Create: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.jsonnet`

- [ ] **Step 1: Add the shared DR profile**

```jsonnet
local base = {
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  realm: 'oc1',
  environments: {
    prod: {
      shared_project_network: {
        network: { vcn: '10.0.200.0/21' },
      },
      projects: { proj1: {} },
    },
  },
};

{
  hub_a: base { hub: { kind: 'hub_a', network: { vcn: '10.0.192.0/21' } } },
  hub_b: base { hub: { kind: 'hub_b', network: { vcn: '10.0.192.0/21' } } },
  hub_c: base { hub: { kind: 'hub_c', network: { vcn: '10.0.192.0/21' } } },
  hub_e: base { hub: { kind: 'hub_e', network: { vcn: '10.0.192.0/21' } } },
}
```

- [ ] **Step 2: Add the thin network entrypoints**

```jsonnet
// oneoe_bcdr_network_hub_a_pre.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_a).network_pre
```

```jsonnet
// oneoe_bcdr_network_hub_a.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_a).network
```

```jsonnet
// oneoe_bcdr_network_hub_b_pre.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_b).network_pre
```

```jsonnet
// oneoe_bcdr_network_hub_b.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_b).network
```

```jsonnet
// oneoe_bcdr_network_hub_c_pre.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_c).network_pre
```

```jsonnet
// oneoe_bcdr_network_hub_c_backends.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_c).network_backends
```

```jsonnet
// oneoe_bcdr_network_hub_c.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_c).network
```

```jsonnet
// oneoe_bcdr_network_hub_e.jsonnet
local profiles = import './profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.hub_e).network
```

- [ ] **Step 3: Run the focused direct fixture after adding the sources**

Run: `python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases -v`

Expected: PASS, including `oneoe_dr_network_profile.jsonnet`.

### Task 3: Generate and verify the published BCDR network snapshots

**Files:**
- Modify: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.json`
- Modify: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.json`
- Modify: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.json`
- Create: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends.json`
- Modify: `addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.json`

- [ ] **Step 1: Generate the committed snapshots from the new sources**

Run: `bash gen/generate.sh`

Expected: the eight BCDR network files are written under `addons/oci-lz-dr/one-oe/`. If generation changes unrelated snapshots, stop and inspect the diff before proceeding.

- [ ] **Step 2: Confirm snapshots are generated from source and have the approved shape**

Run:

```bash
python3 -m unittest tests.test_oneoe_dr_factory_network.OneOeDrFactoryNetworkTests.test_published_network_snapshots_match_dr_jsonnet_entrypoints -v
for file in addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_*.json; do jq empty "$file"; done
jq -e '.network_configuration.network_configuration_categories | keys == ["0-shared", "1-prod"]' addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.json
```

Expected: PASS, all snapshots parse as JSON, and Hub E has only the shared hub and PROD categories.

### Task 4: Add the Factory DR question and public documentation

**Files:**
- Modify: `AGENTS.md:114-127`
- Modify: `.agents/skills/landing-zone-customer-guidance/SKILL.md:47-53`
- Modify: `addons/oci-lz-blueprint-factory/README.md:26-40`
- Modify: `addons/oci-lz-ai-agent/README.md:67-74`
- Modify: `addons/oci-lz-dr/one-oe/README.md:45-82`

- [ ] **Step 1: Add the guided DR decision after the One-OE baseline**

In `AGENTS.md`, insert this numbered discovery stage between the current baseline and region stages, then increment the following discovery-stage numbers and the later “eight decisions” reference:

```markdown
2. **Disaster recovery (One-OE)**
   - Immediately after establishing the One-OE baseline, ask: **Do you want to deploy a Disaster Recovery (DR) region?**
   - If the customer answers no, continue with the region and realm decision.
   - If the customer answers yes, explain that the current published Factory preset supports only a One-OE home region in `eu-frankfurt-1` and a DR region in `eu-amsterdam-1`. It deploys only the DR hub and `prod` VCN, using `10.0.192.0/21` and `10.0.200.0/21`, respectively.
   - Do not apply this fixed preset to another region pair or to Multi-OE. Route those requirements to a reviewed custom design.
```

In the customer-guidance skill, replace the current discovery-order reminder with text that preserves One-OE as the default and adds the same exact English question, preset, and limitation before the region step.

- [ ] **Step 2: Document the same decision in the Factory and AI Agent READMEs**

Add this subsection after the Factory access-path description:

```markdown
### One-OE Disaster Recovery preset

When the AI-assisted Factory path establishes the One-OE baseline, it asks: **Do you want to deploy a Disaster Recovery (DR) region?**

If the answer is yes, the currently supported preset uses `eu-frankfurt-1` as the home region and `eu-amsterdam-1` as the DR region. It deploys a DR hub VCN using `10.0.192.0/21` and a PROD VCN using `10.0.200.0/21`. This preset does not include preproduction and does not support Multi-OE DR. Use a reviewed custom Factory design for another regional topology or CIDR allocation.
```

Add a concise matching paragraph after the AI Agent’s numbered Factory workflow, including the exact question and a link to the Factory DR preset documentation.

- [ ] **Step 3: Update the One-OE BCDR deployment guide for staged network files**

For Hub A, Hub B, and Hub C, change the Step 1 table to use `oneoe_bcdr_network_hub_<hub>_pre.json`. Add a follow-up subsection explaining that the same ORM stack or Terraform state replaces it with the matching final network file after the hub resources are created. The Hub C text must also list `oneoe_bcdr_network_hub_c_backends.json` as the alternative used when third-party network-firewall backends are configured. Keep Hub E on `oneoe_bcdr_network_hub_e.json`.

Remove the provisional `oneoe_bcdr_security_cis*_pre.json` table references and the provisional security-replacement note because regional security is deferred until it has Jsonnet sources.

- [ ] **Step 4: Run the guidance test and Markdown checks**

Run:

```bash
python3 -m unittest tests.test_oneoe_dr_factory_network.OneOeDrFactoryNetworkTests.test_guided_factory_question_follows_the_oneoe_baseline -v
git diff --check -- AGENTS.md .agents/skills/landing-zone-customer-guidance/SKILL.md addons/oci-lz-blueprint-factory/README.md addons/oci-lz-ai-agent/README.md addons/oci-lz-dr/one-oe/README.md
```

Expected: PASS and no whitespace errors.

### Task 5: Remove superseded provisional security artifacts and complete regression validation

**Files:**
- Delete: `addons/oci-lz-dr/one-oe/oneoe_bcdr_security_cis1_pre.json`
- Delete: `addons/oci-lz-dr/one-oe/oneoe_bcdr_security_cis1.json`
- Delete: `addons/oci-lz-dr/one-oe/oneoe_bcdr_security_cis2_pre.json`
- Delete: `addons/oci-lz-dr/one-oe/oneoe_bcdr_security_cis2.json`
- Delete: `tests/test_oneoe_dr_security_artifacts.py`

- [ ] **Step 1: Remove the provisional files created before the Jsonnet-source decision**

Delete only the five listed uncommitted security artifacts and test. Do not remove the user-approved design and planning documents or unrelated README changes.

- [ ] **Step 2: Run the focused and full regression suites**

Run:

```bash
python3 -m unittest tests.test_oneoe_dr_factory_network -v
python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases -v
python3 -m unittest discover -s tests -p 'test_*.py'
```

Expected: PASS. Record any pre-existing or environment-specific failure instead of masking it.

- [ ] **Step 3: Run final static checks and leave the work uncommitted**

Run:

```bash
for file in addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_*.json; do jq empty "$file"; done
git diff --check
git status --short
```

Expected: all published network snapshots parse, no whitespace errors exist, and the only changes are the planned files plus any pre-existing user changes. Do not commit unless explicitly requested.
