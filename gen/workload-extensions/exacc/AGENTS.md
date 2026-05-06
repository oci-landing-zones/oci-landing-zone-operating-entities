# ExaDB-C@C Generator Agent Guide

Scope: this file covers `gen/workload-extensions/exacc/**` and the published ExaDB-C@C snapshots/docs under `workload-extensions/exacc/**`.

## Source Of Truth

- `gen/workload-extensions/exacc/exacc_builder.libsonnet` owns reusable ExaDB-C@C IAM and observability rendering.
- `gen/workload-extensions/exacc/exacc.libsonnet` is the generic extension wrapper used by config mode and integrated landing-zone assembly.
- `gen/workload-extensions/exacc/published_profiles.libsonnet` owns repo-published ExaDB-C@C use-case config defaults.
- `gen/workload-extensions/exacc/single-stack/published.libsonnet` owns the single-stack no-network publication projection used by repo entrypoints.
- `gen/workload-extensions/exacc/single-stack/*.jsonnet` are thin selectors over the local single-stack publication adapter.
- `gen/workload-extensions/exacc/multi-stack/published.libsonnet` owns the multi-stack publication-only identity and observability projection used by repo entrypoints.
- Checked-in JSON files under `workload-extensions/exacc/{single-stack,multi-stack}/` are generated snapshots. Do not hand-edit them.

## Extension Contract

- Extension type is `exacc`.
- ExaDB-C@C is networkless: `metadata.requires_network: false`.
- ExaDB-C@C platforms must omit `platform.network`; the generic extension contract rejects a phantom network on networkless extensions.
- ExaDB-C@C contributes IAM and observability only. It must not emit `network_pre`, `network`, subnet metadata, or platform VCN categories.
- Config-mode IAM owns the nested platform root compartments. The ExaDB-C@C builder deep-merges child DB/infra compartments and tags into that nested tree.
- Standalone multi-stack publication projects the nested config-mode IAM overlay into flat extension-only compartments with `parent_id` references.

## Notification Emails

`notification_emails.default` is required and must contain at least one non-empty string value. Optional topic-specific overrides:

- `db_workloads`
- `infra_workloads`
- `projects`

Unknown keys are rejected. Recipient arrays must be non-empty arrays of non-empty strings. The generator does not validate email address syntax.

Example:

```jsonnet
{
  extension: {
    type: 'exacc',
    params: {
      notification_emails: {
        default: ['exacc-platform-team@example.com'],
        db_workloads: ['exacc-db-team@example.com'],
        infra_workloads: ['exacc-infra-team@example.com'],
      },
    },
  },
}
```

Environment platform example with project DB compartments:

```jsonnet
{
  extension: {
    type: 'exacc',
    params: {
      project_db_compartments: ['proj1'],
      notification_emails: {
        default: ['exacc-platform-team@example.com'],
        projects: ['exacc-project-team@example.com'],
      },
    },
  },
}
```

## Published Layout

- Single-stack entrypoints emit full One-OE + ExaDB-C@C outputs:
  - `exacc_identity_uc1.json`
  - `exacc_governance_uc1.json`
  - `exacc_security_cis1_uc1.json`
  - `exacc_security_cis2_uc1.json`
  - `exacc_observability_cis1_uc1.json`
  - `exacc_observability_cis2_uc1.json`
- Multi-stack entrypoints emit extension-only outputs:
  - `exacc_identity_uc1.json`
  - `exacc_observability_uc1.json`
- Do not add a root `gen/workload-extensions/exacc/published.libsonnet`. Publication adapters stay local to the stack family that needs them.
- Keep `workload-extensions/exacc/content/OLD` out of the published tree.
- Do not keep source-branch raw URLs such as `we_exacc_update` in ExaDB-C@C docs.

## Tests

Prefer fixture-based tests for generator behavior:

- Config pass/fail fixtures under `tests/gen/testdata/configs/`.
- Direct pass/fail fixtures under `tests/gen/testdata/direct/`.
- Publication-boundary tests in `tests/gen/test_exacc_publication_boundaries.py`.
- Published snapshot parity comes from `tests/gen/test_direct_entrypoints.py`.

Relevant verification:

```bash
python3 -m unittest tests.gen.test_fixture_cases tests.gen.test_exacc_publication_boundaries tests.gen.test_direct_entrypoints
bash gen/generate.sh
git diff --check
```
