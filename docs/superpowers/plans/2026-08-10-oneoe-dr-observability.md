# One-OE DR Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax.

**Goal:** Publish Jsonnet-generated One-OE DR observability artifacts for Amsterdam, including a replication-destination bucket and excluding the regional Service Connector.

**Architecture:** An add-on-local Jsonnet overlay renders the existing One-OE observability surfaces with the Amsterdam DR profile. It replaces the standard Service Connector bucket with bkt-ams-lz-service-connector, removes Service Connector resources, and preserves the CIS 2 KMS key reference. Generated JSON is published under the BCDR add-on.

**Tech Stack:** Jsonnet, Python unittest, Bash generator, JSON, Markdown, jq.

**Constraint:** Do not hand-edit generated JSON or create a Git commit unless the user asks.

---

## File structure

| File | Responsibility |
|---|---|
| gen/addons/oci-lz-dr/one-oe/observability.libsonnet | Render and apply the DR replication-bucket overlay. |
| gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis*.jsonnet | Thin entrypoints for each CIS/staged observability surface. |
| addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis*.json | Generated published snapshots. |
| tests/test_oneoe_dr_observability.py | Source/snapshot, bucket, KMS, staging, and README regression test. |
| tests/gen/testdata/direct/pass/oneoe_dr_observability_profile.jsonnet | Direct-render fixture covering all four outputs. |
| addons/oci-lz-dr/one-oe/README.md | Deployment staging and the manual replication prerequisites. |

### Task 1: Define the failing observability contract

**Files:**
- Create: tests/test_oneoe_dr_observability.py
- Create: tests/gen/testdata/direct/pass/oneoe_dr_observability_profile.jsonnet

- [ ] **Step 1: Add the focused regression test**

Create tests/test_oneoe_dr_observability.py:

~~~
from __future__ import annotations

import json
from pathlib import Path
import unittest

from tests.gen.helpers import REPO_ROOT, render_jsonnet_object


ADDON_DIR = REPO_ROOT / "addons/oci-lz-dr/one-oe"
README = ADDON_DIR / "README.md"
ENTRYPOINTS = {
    "oneoe_bcdr_observability_cis1_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.jsonnet",
    "oneoe_bcdr_observability_cis1.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.jsonnet",
    "oneoe_bcdr_observability_cis2_pre.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.jsonnet",
    "oneoe_bcdr_observability_cis2.json": "gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.jsonnet",
}
BUCKET_KEY = "BKT-AMS-LZ-SERVICE-CONNECTOR-KEY"
BUCKET_NAME = "bkt-ams-lz-service-connector"
KMS_KEY = "KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY"


class OneOeDrObservabilityTests(unittest.TestCase):
    def render(self, snapshot_name: str) -> dict:
        return render_jsonnet_object(Path(ENTRYPOINTS[snapshot_name]))

    def test_published_snapshots_match_jsonnet_entrypoints(self) -> None:
        for snapshot_name, entrypoint_name in ENTRYPOINTS.items():
            with self.subTest(snapshot=snapshot_name):
                snapshot = ADDON_DIR / snapshot_name
                self.assertTrue((REPO_ROOT / entrypoint_name).is_file())
                self.assertTrue(snapshot.is_file())
                self.assertEqual(
                    render_jsonnet_object(Path(entrypoint_name)),
                    json.loads(snapshot.read_text(encoding="utf-8")),
                )

    def test_replication_bucket_is_created_without_a_service_connector(self) -> None:
        for snapshot_name in ENTRYPOINTS:
            with self.subTest(snapshot=snapshot_name):
                config = self.render(snapshot_name)["service_connectors_configuration"]
                bucket = config["buckets"][BUCKET_KEY]
                self.assertEqual(BUCKET_NAME, bucket["name"])
                self.assertEqual({}, config["service_connectors"])
                self.assertEqual("2" if "cis2" in snapshot_name else "1", bucket["cis_level"])

    def test_cis2_bucket_uses_the_replicated_vault_key_reference(self) -> None:
        for snapshot_name in (
            "oneoe_bcdr_observability_cis2_pre.json",
            "oneoe_bcdr_observability_cis2.json",
        ):
            bucket = self.render(snapshot_name)["service_connectors_configuration"]["buckets"][BUCKET_KEY]
            self.assertEqual(KMS_KEY, bucket["kms_key_id"])

    def test_only_ams_hub_and_prod_flow_logs_are_emitted_after_staging(self) -> None:
        pre = self.render("oneoe_bcdr_observability_cis1_pre.json")
        final = self.render("oneoe_bcdr_observability_cis1.json")
        self.assertNotIn("logging_configuration", pre)
        self.assertEqual(
            {
                "LOG-LZ-SUBNET-FLOW-KEY",
                "LOG-LZ-VCN-FLOW-KEY",
                "LOG-LZ-PROD-SUBNET-FLOW-KEY",
                "LOG-LZ-PROD-VCN-FLOW-KEY",
            },
            set(final["logging_configuration"]["flow_logs"]),
        )
        self.assertNotIn("PREPROD", json.dumps(final))

    def test_readme_documents_the_replication_boundary(self) -> None:
        content = README.read_text(encoding="utf-8")
        for required_text in (
            "Manual post-deployment configuration required",
            BUCKET_NAME,
            "bkt-lz-service-connector",
            "replication policy",
            "kms_dependency",
            "Service Connector",
        ):
            self.assertIn(required_text, content)
~~~

- [ ] **Step 2: Add the direct fixture**

Create tests/gen/testdata/direct/pass/oneoe_dr_observability_profile.jsonnet:

~~~
// Amsterdam DR observability creates a replication destination bucket and no Service Connector.
// contains: "bucket_name": "bkt-ams-lz-service-connector"
// contains: "service_connector_count": 0
// contains: "cis2_uses_kms": true
// contains: "final_has_flow_logs": true
local summarize(observability) = {
  bucket_name: observability.service_connectors_configuration.buckets['BKT-AMS-LZ-SERVICE-CONNECTOR-KEY'].name,
  service_connector_count: std.length(std.objectFields(observability.service_connectors_configuration.service_connectors)),
  cis2_uses_kms: std.objectHas(
    observability.service_connectors_configuration.buckets['BKT-AMS-LZ-SERVICE-CONNECTOR-KEY'],
    'kms_key_id'
  ),
  final_has_flow_logs: std.objectHas(observability, 'logging_configuration'),
};
{
  cis1_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.jsonnet'),
  cis1: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.jsonnet'),
  cis2_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.jsonnet'),
  cis2: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.jsonnet'),
}
~~~

- [ ] **Step 3: Confirm the red state**

Run:

~~~
JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_observability -v
JSONNET_BIN=jsonnet python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases -v
~~~

Expected: both commands fail because the BCDR entrypoints and README instructions do not exist.

### Task 2: Implement the local BCDR overlay

**Files:**
- Create: gen/addons/oci-lz-dr/one-oe/observability.libsonnet
- Create: gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.jsonnet
- Create: gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.jsonnet
- Create: gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.jsonnet
- Create: gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.jsonnet

- [ ] **Step 1: Create the shared overlay**

Create gen/addons/oci-lz-dr/one-oe/observability.libsonnet:

~~~
local lz = import '../../../landing_zone.libsonnet';

local bucket_key = 'BKT-AMS-LZ-SERVICE-CONNECTOR-KEY';
local bucket_name = 'bkt-ams-lz-service-connector';
local kms_key = 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY';

local replication_bucket(cis_level) = {
  name: bucket_name,
  compartment_id: 'CMP-LZ-SECURITY-KEY',
  cis_level: cis_level,
} + (if cis_level == '2' then { kms_key_id: kms_key } else {});

local with_replication_bucket(observability, cis_level) =
  observability {
    service_connectors_configuration+: {
      buckets: {
        [bucket_key]: replication_bucket(cis_level),
      },
      service_connectors: {},
    },
  };

function(profile)
  local generated = lz(profile);
  {
    cis1_pre: with_replication_bucket(generated.observability_cis1_pre, '1'),
    cis1: with_replication_bucket(generated.observability_cis1, '1'),
    cis2_pre: with_replication_bucket(generated.observability_cis2_pre, '2'),
    cis2: with_replication_bucket(generated.observability_cis2, '2'),
  }
~~~

The buckets map is deliberately replaced. This prevents the global One-OE bucket from being emitted beside the AMS replication destination, while retaining events, alarms, topics, log groups, and final flow logs.

- [ ] **Step 2: Create the four thin entrypoints**

Create `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.jsonnet`:

~~~
local profiles = import './profiles.libsonnet';
local observability = import './observability.libsonnet';

observability(profiles.hub_a).cis1_pre
~~~

Create `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.jsonnet`:

~~~
local profiles = import './profiles.libsonnet';
local observability = import './observability.libsonnet';

observability(profiles.hub_a).cis1
~~~

Create `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.jsonnet`:

~~~
local profiles = import './profiles.libsonnet';
local observability = import './observability.libsonnet';

observability(profiles.hub_a).cis2_pre
~~~

Create `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.jsonnet`:

~~~
local profiles = import './profiles.libsonnet';
local observability = import './observability.libsonnet';

observability(profiles.hub_a).cis2
~~~

- [ ] **Step 3: Verify source rendering**

Run:

~~~
JSONNET_BIN=jsonnet python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases -v
for file in gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_*.jsonnet; do
  jsonnet "$file" | jq -e '
    .service_connectors_configuration.buckets["BKT-AMS-LZ-SERVICE-CONNECTOR-KEY"].name == "bkt-ams-lz-service-connector" and
    .service_connectors_configuration.service_connectors == {}
  ' >/dev/null
done
~~~

Expected: direct fixtures pass and every output contains the AMS replication bucket with no Service Connector.

### Task 3: Generate and verify the published snapshots

**Files:**
- Create: addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.json
- Modify: addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.json
- Create: addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.json
- Modify: addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.json

- [ ] **Step 1: Regenerate from Jsonnet**

Run:

~~~
JSONNET_BIN=jsonnet bash gen/generate.sh
~~~

If the script cannot write Git hooks in the sandbox, render only the four entrypoints with jsonnet piped through gen/format_json.py, writing each result to its matching artifact under addons/oci-lz-dr/one-oe/.

- [ ] **Step 2: Confirm the generated-source assertions**

Run:

~~~
JSONNET_BIN=jsonnet python3 -m unittest \
  tests.test_oneoe_dr_observability.OneOeDrObservabilityTests.test_published_snapshots_match_jsonnet_entrypoints \
  tests.test_oneoe_dr_observability.OneOeDrObservabilityTests.test_replication_bucket_is_created_without_a_service_connector \
  tests.test_oneoe_dr_observability.OneOeDrObservabilityTests.test_cis2_bucket_uses_the_replicated_vault_key_reference \
  tests.test_oneoe_dr_observability.OneOeDrObservabilityTests.test_only_ams_hub_and_prod_flow_logs_are_emitted_after_staging \
  -v
~~~

Expected: the four source/snapshot assertions pass. The README assertion is intentionally not included until Task 4.

### Task 4: Document staging and replication

**Files:**
- Modify: addons/oci-lz-dr/one-oe/README.md

- [ ] **Step 1: Switch the Step 1 table to pre observability files**

For both CIS rows, replace the initial observability file in every URL and visible file list with oneoe_bcdr_observability_cis1_pre.json or oneoe_bcdr_observability_cis2_pre.json. Hub A/B/C retain their network pre artifact; Hub E retains oneoe_bcdr_network_hub_e.json.

- [ ] **Step 2: Add the completion and replication instructions**

Immediately after Step 1.1, add:

~~~
**Step 1.2. Complete staged observability**

After the regional hub and PROD VCNs exist, update the same ORM stack or Terraform state by replacing oneoe_bcdr_observability_cis1_pre.json with oneoe_bcdr_observability_cis1.json, or oneoe_bcdr_observability_cis2_pre.json with oneoe_bcdr_observability_cis2.json. The final artifact enables flow logs for the AMS hub and PROD VCNs.

> [!IMPORTANT]
> **Manual post-deployment configuration required:** the BCDR observability file creates bkt-ams-lz-service-connector as the Amsterdam destination bucket. Configure an Object Storage replication policy from the Frankfurt source bucket bkt-lz-service-connector to this bucket after both stacks are deployed. Do not configure an AMS Service Connector: the destination bucket becomes read-only while replication is active.

> [!NOTE]
> **CIS Level 2:** Before deploying the BCDR stack, replicate the Vault and KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY to Amsterdam. Supply the AMS replica key through the orchestrator kms_dependency input under keys.KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY so the destination bucket uses customer-managed encryption.
~~~

Remove the current generic CIS Level 2 note because this replacement defines the exact stack dependency.

- [ ] **Step 3: Confirm the documentation assertion**

Run:

~~~
JSONNET_BIN=jsonnet python3 -m unittest tests.test_oneoe_dr_observability.OneOeDrObservabilityTests.test_readme_documents_the_replication_boundary -v
~~~

Expected: PASS.

### Task 5: Complete validation

**Files:** Verify all Task 1–4 files.

- [ ] **Step 1: Run the complete suite**

~~~
JSONNET_BIN=jsonnet python3 -m unittest discover -s tests -p 'test_*.py'
~~~

Expected: exit code 0.

- [ ] **Step 2: Validate generated JSON and the diff**

~~~
set -euo pipefail
for file in addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1_pre.json \
            addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis1.json \
            addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2_pre.json \
            addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.json; do
  jq -e '
    .service_connectors_configuration.buckets["BKT-AMS-LZ-SERVICE-CONNECTOR-KEY"].name == "bkt-ams-lz-service-connector" and
    .service_connectors_configuration.service_connectors == {}
  ' "$file" >/dev/null
done
jq -e '
  .service_connectors_configuration.buckets["BKT-AMS-LZ-SERVICE-CONNECTOR-KEY"].kms_key_id == "KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY"
' addons/oci-lz-dr/one-oe/oneoe_bcdr_observability_cis2.json >/dev/null
git diff --check
git status --short
~~~

Expected: every command exits with code 0; no change outside BCDR observability sources, snapshots, README, tests, and approved planning documents.
