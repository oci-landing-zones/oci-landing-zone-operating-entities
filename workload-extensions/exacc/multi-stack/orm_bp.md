# ORM Best Practices for Landing Zone Deployments

## Overview
This document provides general best practices for using Oracle Resource Manager (ORM) with OCI Landing Zones. It is intentionally generic so it can be reused across different workload extensions, not only EXACC.

## Scope
Applies to:
- Base Landing Zone deployments (for example ONE-OE or Multi-OE).
- Post-deployment Workload Extensions (WE) executed as separate operations.

## Core Best Practices
1. Run deployments as small, auditable operations.
2. Pin all configuration references to immutable versions (tag/commit).
3. Always review `Plan` before running `Apply`.
4. Enable output artifacts whenever dependencies are needed downstream.
5. Keep dependency contracts stable and versioned.
6. Record deployment evidence for every run.

## Standard ORM Execution Flow
1. Open stack creation from the approved `Deploy to OCI` source.
2. Accept terms and wait until configuration is fully loaded.
3. Set stack metadata:
- stack name,
- Terraform version,
- facade working directory.
4. Configure input files from a controlled source (OCI bucket or private GitHub).
5. Disable automatic apply during stack creation.
6. Create stack and run `Plan`.
7. Review expected changes, then run `Apply` only if plan is validated.

Another key benefit of this flow is that ORM keeps Terraform state managed in OCI, which improves state consistency, reduces local state risk, and enforces safer team operations.

## Configuration Source Best Practices
### Private OCI Bucket
- Good for controlled OCI-native operations.
- Ensure read access for input files and write access if using output artifacts.

### Private GitHub Repository
- Recommended for teams that need version control and review workflows.
- Use GitHub token with minimum required permissions.

### Public URLs
- Acceptable for non-sensitive/demo scenarios.
- Avoid for enterprise change control or regulated environments.

## Dependencies and Output Best Practices
### Dependencies
- In the orchestrator model, dependencies are external resource mappings produced by a previous operation and consumed by a new operation.
- Use dependency files when configurations refer to logical keys (for example compartment or subnet keys) instead of raw OCIDs.
- Define dependency source explicitly in ORM (`ocibucket` or `github`) and make sure read permissions are in place.
- Validate dependency files before each run and treat file schema/key names as contracts.
- If a dependency contract changes, update all consuming stacks in the same release.

### Output
- Enable output persistence so the orchestrator can generate dependency artifacts for downstream stacks.
- Store output files in a controlled location (OCI bucket path or GitHub path) with version traceability.
- Reuse generated outputs as dependency inputs in subsequent operations.
- Typical generated files include: `compartments_output.json`, `network_output.json`, `tags_output.json`, `topics_output.json`, `vaults_output.json`, `keys_output.json`, `instances_output.json`, and `oke_clusters_output.json`.

> Note: Official orchestrator reference for external dependencies and generated outputs: https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator#external-dependencies

## Best Practices for ORM with a Workload Extension (WE)
A recommended standard is a two-operation model.

### Operation 1: Deploy Base ONE-OE
1. Deploy base ONE-OE stack.
2. Enable output generation.
3. Capture and store generated dependency artifacts.
4. Validate the base stack is healthy and outputs are complete.

### Operation 2: Deploy Workload Extension (WE)
1. Create a separate ORM stack for the WE.
2. Load WE-specific configuration files.
3. Attach dependency files generated in Operation 1.
4. Run `Plan`, validate impact, then run `Apply`.

This two-operation approach reduces coupling, clarifies ownership, and simplifies troubleshooting.

## Pre-Apply Checklist
- [ ] Input files pinned to stable versions.
- [ ] Dependency files exist and are non-null.
- [ ] Dependency key names match expected schema.
- [ ] Output destination configured (if needed).
- [ ] `Plan` reviewed with no unexpected destructive changes.
- [ ] Execution evidence template ready.

## Common Failure Modes
### Missing or Null Dependency Values
- Symptom: null index / missing key errors.
- Prevention: validate producer outputs before consumer plan.

### Unpinned Configuration Drift
- Symptom: different results across runs with no declared change.
- Prevention: use immutable references only.

### Premature Apply
- Symptom: unintended changes on existing resources.
- Prevention: enforce plan-first approval gate.

### Mixed Responsibility in a Single Stack
- Symptom: hard-to-debug plans and rollback complexity.
- Prevention: separate base LZ and WE operations.

## Minimum Deployment Evidence
Record in PR/ticket/change log:
- stack name and region,
- Terraform version,
- input file sources,
- dependency sources and versions,
- `Plan` and `Apply` job IDs,
- output artifact location,
- operator and execution date.

## Final Recommendation
Use a standardized **two-operation model** (`ONE-OE` first, `WE` second) with explicit dependencies and output artifacts. This is the safest default for scalable and repeatable ORM operations.
