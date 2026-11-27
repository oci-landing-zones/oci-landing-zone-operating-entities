# OCI Security Zones Add-on Generator Guide

## Scope and source ownership

This family publishes standalone Security Zones configurations for existing compartments. Root `AGENTS.md` owns customer guidance and deployment defaults; `gen/AGENTS.md` owns generation conventions.

- `profiles.libsonnet` owns the published CIS1/CIS2 alternatives for Recipe 02 per environment, plus external compartment references.
- `published.libsonnet` validates a profile and emits only `security_zones_configuration`, with one recipe and one zone. It is a publication adapter, not a new Blueprint Factory top-level input.
- `combined.libsonnet` composes validated environment profiles into a single configuration. It rejects empty selections, duplicate environment keys or target references, and inconsistent CIS levels, realms or reporting regions. Preserve existing per-environment resource keys when composing them.
- The `.jsonnet` entrypoints are thin adapters. `bash gen/generate.sh` mirrors them into `addons/oci-security-zones/`. Never edit those JSON snapshots directly.
- Keep CIS levels explicit. Resolve baseline policies through the downstream Security Zones module; additional-policy lists come from `gen/constants.libsonnet` for the selected realm. Do not duplicate its policy OCID lists here.
- Use the shared naming helpers for recipe and target names. Recipe numbers describe scope, not CIS level.

## Deployment boundary

The add-on owns a separate stack/state. It does not create compartments, workloads, Vaults or a separate Cloud Guard configuration block. Cloud Guard must already be enabled: the backing Security Zones module can enable it if disabled, which would add tenancy-level ownership to the stack.

Compartment keys require the existing landing zone's `compartments_output.json` dependency. Literal compartment OCIDs are also supported. Reject the known `CMP-LANDINGZONE-KEY`, `CMP-LZ-NETWORK-KEY`, `CMP-LZ-PLATFORM-KEY` and `CMP-LZ-SECURITY-KEY` as zone targets. The recipe placement compartment may still be `CMP-LZ-SECURITY-KEY`. Literal OCIDs and custom aliases require an OCI-side hierarchy review; do not imply offline validation proves their environment scope.

The current One-OE blueprint owns Recipe 01; the add-on publishes only environment profiles creating child zones with Recipe 02 including the baseline. No standalone Recipe 01 or shared-network examples are published. The former environment recipe retains all 26 additional policies; its numbering changes only in this publication family, not in the generic builder or workload extensions. Only the two single-environment CIS presets for `prod` are published. Document how to extend the production example to additional environments instead of publishing every environment combination. Keep multi-environment composition covered by custom test profiles. Earlier blueprints and extensions can already own these child zones. Do not manage the same zone or recipe in two states, add automatic state migration, or remove base-stack resources to make a deployment fit.

Select exactly one configuration per stack; it may contain recipe/zone pairs for multiple environments. Do not pass multiple root configuration documents and assume deep merge. Environment recipe keys use the `02` segment and retain their identity across CIS levels. Renumbering earlier `03` recipe keys requires a separately reviewed lifecycle change. Review every level change. This family does not establish multi-region enforcement, automatically replicate zones, or change the existing regional DR output contract. Do not assume deleting a child zone restores parent inheritance; verify its actual association and Cloud Guard configuration as described in the maintenance guide.

## Validation

Run the `security_zones_addon` pass/fail fixtures through `tests.gen.test_fixture_cases`, regenerate snapshots, compare against the entrypoints and check that other published artifacts remain unchanged. OCI plan/apply require a separately reviewed target tenancy; source tests and schema checks do not establish runtime enforcement.
