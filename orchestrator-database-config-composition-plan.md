# Safe Database Configuration Composition Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` to implement this plan task by task, with a review checkpoint after each task.

**Goal:** Allow OCI Landing Zone Orchestrator `rms-facade` to safely compose multiple Exadata and Autonomous Database JSON/YAML configuration documents in one operation without introducing an unrestricted deep merge.

**Architecture:** Add an explicit, family-aware configuration composer after `rms-facade` has loaded and decoded every input document. Compose only `cloud_exadata_database_configuration` and `autonomous_databases_configuration`, reject duplicate logical resource keys and conflicting defaults, and retain the existing behavior for every other top-level configuration family.

**Tech stack:** Terraform `>= 1.5.0`, OCI Landing Zone Orchestrator, `rms-facade`, `terraform-oci-modules-exadata`.

## Verified baseline

This plan was prepared against:

- Orchestrator `release-2.1.4`: `a875689d7add06eed2cfac33f7187d1c7228c348`
- Exadata modules `release-1.2.0`: `6faa1bfab7fe6dddd44697a4d88ecd351c13d61f`

Verify these refs again before starting implementation.

## Context

The current `rms-facade/get_configurations.tf` builds a flat map by top-level key and keeps the first occurrence of a repeated key. Therefore, multiple documents such as:

```text
exadata-infrastructure.json
exadata-vmclusters.json
exadata-db-homes.json
exadata-databases.json
exadata-pdbs.json
```

cannot currently be supplied to one operation because every file has the same root:

```json
{
  "cloud_exadata_database_configuration": {}
}
```

The root Orchestrator and Exadata module already accept one combined configuration object. The Exadata module also resolves same-state references through this chain:

```text
Exadata Infrastructure
  -> Cloud VM Cluster
    -> DB Home
      -> CDB
        -> PDB
```

Consequently, the primary change belongs in `rms-facade`. The backing modules should only require regression tests unless those tests expose a missing same-state reference.

## Global constraints

- Do not implement a generic recursive deep merge.
- Compose only `cloud_exadata_database_configuration` and `autonomous_databases_configuration`.
- Duplicate logical resource keys must fail deterministically rather than use first-wins or last-wins behavior.
- Conflicting or repeated singleton defaults must fail deterministically.
- Preserve existing behavior for IAM, networking, security, observability, governance, OKE, OCVS, and every other family.
- Preserve Terraform `>= 1.5.0` compatibility for OCI Resource Manager.
- Input document order must not affect the composed result.
- Do not add resources merely to validate composition; the composer must not create Terraform state.
- Do not change module source refs unless a verified module defect requires it.

## Important Terraform CLI limitation

This change cannot alter Terraform's native handling of repeated variables in multiple `-var-file` arguments:

```bash
terraform plan -var-file=infra.json -var-file=vmclusters.json
```

Terraform replaces a repeated root variable; it does not deep-merge it. Local multifile composition must therefore run through `rms-facade`:

```hcl
configuration_source        = "file"
local_config_file_paths     = [/* ordered paths are accepted, but composition must be order-independent */]
local_dependency_file_paths = [/* dependency outputs */]
```

Direct root-module callers must continue to provide one combined object for each repeated Terraform root variable.

---

## Task 1: Add failing composition fixtures

**Repository:** `terraform-oci-modules-orchestrator`

**Files:**

- Create: `tests/rms-facade-config-composition/fixtures/exadata-infrastructure.json`
- Create: `tests/rms-facade-config-composition/fixtures/exadata-vmclusters.json`
- Create: `tests/rms-facade-config-composition/fixtures/exadata-db-homes.json`
- Create: `tests/rms-facade-config-composition/fixtures/exadata-databases.json`
- Create: `tests/rms-facade-config-composition/fixtures/exadata-pdbs.json`
- Create: `tests/rms-facade-config-composition/fixtures/exadata-combined.json`
- Create: `tests/rms-facade-config-composition/fixtures/exadata-duplicate-vmcluster.json`
- Create: `tests/rms-facade-config-composition/fixtures/adb-prod.json`
- Create: `tests/rms-facade-config-composition/fixtures/adb-reporting.json`
- Create: `tests/rms-facade-config-composition/fixtures/adb-duplicate.json`

**Interfaces:**

- Exadata fixtures use `cloud_exadata_database_configuration`.
- ADB fixtures use `autonomous_databases_configuration`.
- Logical keys must be synthetic and require no OCI calls to inspect the resulting configuration object.

- [ ] Demonstrate that the current implementation keeps only the first repeated Exadata root.
- [ ] Demonstrate that the current implementation keeps only the first repeated ADB root.
- [ ] Demonstrate that changing source order changes the current result.
- [ ] Record these failures as the regression baseline.

## Task 2: Isolate configuration composition

**Repository:** `terraform-oci-modules-orchestrator`

**Files:**

- Create: `rms-facade/modules/configuration-composer/variables.tf`
- Create: `rms-facade/modules/configuration-composer/locals.tf`
- Create: `rms-facade/modules/configuration-composer/outputs.tf`
- Modify: `rms-facade/get_configurations.tf`

**Interfaces:**

The internal module consumes decoded documents with source information:

```hcl
variable "configuration_documents" {
  type = list(object({
    source   = string
    document = any
  }))
}
```

It produces the complete configuration map consumed by `rms-facade`:

```hcl
output "merged_configuration" {
  value = local.merged_configuration
}
```

- [ ] Pass every decoded document and its original source name to the composer.
- [ ] Preserve the current first-match behavior for top-level families outside the explicit composition allowlist.
- [ ] Replace `local.merged_input_configs` with the composer's output.
- [ ] Ensure the module has no resources and creates no state entries.
- [ ] Run `terraform fmt -check -recursive`.
- [ ] Run `terraform validate` and verify the structural refactor passes before implementing the new merge behavior.

## Task 3: Compose Cloud Exadata Database documents safely

**Repository:** `terraform-oci-modules-orchestrator`

**Files:**

- Modify: `rms-facade/modules/configuration-composer/variables.tf`
- Modify: `rms-facade/modules/configuration-composer/locals.tf`
- Modify: `rms-facade/modules/configuration-composer/outputs.tf`
- Test: `tests/rms-facade-config-composition/`

**Composable fields:**

```text
cloud_exadata_infrastructures_configuration
cloud_vm_clusters_configuration
cloud_db_homes_configuration
databases_configuration
pluggable_databases_configuration
default_compartment_id
default_defined_tags
default_freeform_tags
```

**Rules:**

- Merge resource maps by logical key.
- Reject duplicate infrastructure keys.
- Reject duplicate VM cluster keys.
- Reject duplicate DB Home keys.
- Reject duplicate CDB keys.
- Reject duplicate PDB keys.
- Allow each root `default_*` field to be declared in at most one document.
- Allow `default_maintenance_window` to be declared in at most one infrastructure document.
- Preserve an existing single combined document without transformation differences.
- Reject a combined document plus a split document that repeats any logical resource key or singleton field.
- Produce the same object regardless of input document order.

The composed result must have this shape:

```hcl
cloud_exadata_database_configuration = {
  cloud_exadata_infrastructures_configuration = {
    cloud_exadata_infrastructures = { /* merged logical keys */ }
  }
  cloud_vm_clusters_configuration   = { /* merged logical keys */ }
  cloud_db_homes_configuration      = { /* merged logical keys */ }
  databases_configuration           = { /* merged logical keys */ }
  pluggable_databases_configuration = { /* merged logical keys */ }
}
```

- [ ] Write the failing positive composition test.
- [ ] Write failing duplicate-key tests for every resource collection.
- [ ] Write failing singleton-default collision tests.
- [ ] Implement the minimum family-specific composition.
- [ ] Confirm the positive tests pass.
- [ ] Confirm every duplicate test fails with a diagnostic that identifies the family and logical key or singleton field.

## Task 4: Compose Autonomous Database documents safely

**Repository:** `terraform-oci-modules-orchestrator`

**Files:**

- Modify: `rms-facade/modules/configuration-composer/variables.tf`
- Modify: `rms-facade/modules/configuration-composer/locals.tf`
- Modify: `rms-facade/modules/configuration-composer/outputs.tf`
- Test: `tests/rms-facade-config-composition/`

`autonomous_databases_configuration` has this contract:

```hcl
{
  default_compartment_id = optional(string)
  default_defined_tags   = optional(map(string))
  default_freeform_tags  = optional(map(string))
  databases              = map(object(...))
}
```

**Rules:**

- Merge `databases` by logical key.
- Reject duplicate database keys.
- Allow each `default_*` field to be declared in at most one document.
- Preserve a single existing ADB document unchanged.
- Produce the same object regardless of document order.
- Keep ADB and Cloud Exadata Database as separate top-level families.

- [ ] Write a failing test using two ADB documents with different logical keys.
- [ ] Write a failing duplicate-database-key test.
- [ ] Write failing singleton-default collision tests.
- [ ] Implement the minimum ADB-specific composition.
- [ ] Confirm positive composition passes.
- [ ] Confirm collisions produce deterministic hard failures.

## Task 5: Verify same-state behavior in the Exadata modules

**Repository:** `terraform-oci-modules-exadata`

**Base ref:** `release-1.2.0`

**Files:**

- Extend the existing Exadata Database examples or contract tests rather than creating a parallel implementation.
- Inspect: `exadata-database/exa_infrastructure.tf`
- Inspect: `exadata-database/vm_cluster.tf`
- Inspect: `exadata-database/common_database.tf`
- Inspect: `common-database/db_home.tf`
- Inspect: `common-database/database.tf`
- Inspect: `common-database/pluggable_database.tf`
- Inspect: `exadata-database/outputs.tf`

Verify in one module call that:

- [ ] A Cloud VM Cluster resolves a locally created Exadata Infrastructure key.
- [ ] A DB Home resolves a locally created Cloud VM Cluster key.
- [ ] A CDB resolves a locally created DB Home key.
- [ ] A PDB resolves a locally created CDB key.
- [ ] The Terraform graph contains the required implicit or explicit dependencies.
- [ ] The output includes `cloud_exadata_infrastructures`.
- [ ] The output includes `cloud_vm_clusters`.
- [ ] The output includes `database_homes`.
- [ ] The output includes `databases`.
- [ ] The output includes `pluggable_databases`.

Do not modify module implementation if these tests already pass. If a test fails, implement only the missing local-reference resolution or dependency edge and add a focused regression test.

## Task 6: Verify same-state behavior in the ADB module

**Repository:** `terraform-oci-modules-exadata`

**Base ref:** `release-1.2.0`

**Files:**

- Inspect: `autonomous-database/variables.tf`
- Inspect the Autonomous Database resource implementation and outputs.
- Extend the existing ADB examples or contract tests.

- [ ] Verify that one `autonomous_databases_configuration.databases` map can create multiple entries.
- [ ] Verify that output keys remain stable for every configured database.
- [ ] Verify Shared/Serverless and Dedicated entries retain their existing dependency behavior.
- [ ] Do not add document-composition logic to the module; it receives a composed Terraform object, not source files.

## Task 7: Execute the Orchestrator contract matrix

**Repository:** `terraform-oci-modules-orchestrator`

Test at least these cases:

| Case | Expected result |
| --- | --- |
| One combined Exadata document | Passes unchanged |
| Infrastructure, VM cluster, DB Home, CDB, and PDB in separate files | Composed into one family |
| Same files in reverse order | Identical composed result |
| Two VM cluster files with different keys | Both keys retained |
| Two VM cluster files with the same key | Hard failure |
| Repeated Exadata singleton default | Hard failure |
| Exadata and ADB documents in one operation | Both independent families retained |
| Two ADB files with different keys | Both databases retained |
| Two ADB files with the same key | Hard failure |
| Repeated ADB singleton default | Hard failure |
| Repeated IAM or network root | Existing behavior retained; no deep merge |
| Mixed JSON and YAML inputs | Same composed result |
| `file`, Object Storage, GitHub, and URL sources | Same composer after decoding |

Run:

```bash
terraform fmt -check -recursive
terraform init
terraform validate
```

Run plans through `rms-facade` with `configuration_source = "file"` for the positive and negative fixture sets. Confirm that positive fixtures reach module input validation and that negative fixtures fail before any OCI resource operation.

Also validate the root Orchestrator module independently.

## Task 8: Update documentation and release contract

**Repository:** `terraform-oci-modules-orchestrator`

**Files:**

- Modify: `README.md`
- Modify: `RELEASE-NOTES.md`
- Modify: `rms-facade/schema.yml`
- Regenerate or modify according to repository convention: `rms-facade/SPEC.md`
- Update `UPGRADE.md` if the repository treats the repeated-root behavior change as upgrade-sensitive.

Document explicitly:

- Only Exadata and ADB support controlled multifile composition.
- This is not a generic deep merge.
- Duplicate logical keys are rejected.
- Conflicting singleton defaults are rejected.
- Multifile composition is an `rms-facade` feature.
- Direct root-module `-var-file` calls still use Terraform replacement semantics.
- One stack may use separate Exadata files without manually creating a combined document.
- Separate stacks and dependency outputs remain supported when independent lifecycle/state boundaries are desired.

Do not rewrite or retag `release-2.1.4`. Publish the behavior through the next appropriate release/ref and record its resolved commit SHA.

## Final acceptance criteria

The implementation is complete when:

1. Five separate Exadata documents produce the same module input as one combined document.
2. Two ADB documents with distinct logical keys compose successfully.
3. Duplicate logical keys fail deterministically.
4. Repeated singleton defaults fail deterministically.
5. Composition is independent of document order.
6. Other configuration families retain their existing semantics.
7. Root Orchestrator and `rms-facade` pass `terraform validate`.
8. At least one Exadata multifile plan and one ADB multifile plan have been executed.
9. Module tests confirm same-state logical-key resolution for the complete Exadata chain.
10. Documentation clearly distinguishes controlled composition, direct Terraform replacement, and separate-state deployment.

## Operating Entities integration after release

After the Orchestrator publishes this contract:

1. Update the Orchestrator pin in `oci-landing-zone-operating-entities` from `release-2.1.4` to the new validated ref and resolved SHA.
2. Revalidate the generated ExaCS infrastructure, VM cluster, and database files together through the new `rms-facade`.
3. Document both supported consumption modes:

```text
Single state:
  all ExaCS database-workload files -> one rms-facade operation

Staged states:
  infrastructure -> VM clusters -> database objects
  independent states and chained cloud_exadata_database_output files
```

4. Keep the staged model available for lifecycle isolation and smaller blast radius.
5. Do not instruct users to pass repeated Exadata roots directly as multiple root-module `-var-file` arguments.
