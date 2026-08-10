# One-OE DR security design: regional VSS

## Goal

Publish one generated One-OE BCDR security configuration for `eu-amsterdam-1`. It configures Vulnerability Scanning Service (VSS) for DR resources while preserving the Security Zones, Cloud Guard, and Vault ownership of the Frankfurt baseline.

## Scope and ownership

| Area | Owner | BCDR action |
|---|---|---|
| Security Zones | One-OE baseline | Reuse. Do not create a second zone for the tenancy-wide compartment hierarchy. |
| Cloud Guard | One-OE baseline/home region | Reuse. Do not configure it in the AMS stack. |
| Vault and key | One-OE baseline plus manual replica | Reuse the manually replicated AMS key through `kms_dependency`; do not create a Vault or key. |
| VSS recipes and targets | Regional BCDR stack | Create in AMS. |

Security Zones are intentionally excluded because One-OE associates the shared landing-zone compartments with zones in the baseline. Compartments are tenancy-wide and OCI does not permit a compartment to belong to more than one security zone. This design therefore avoids a conflicting AMS association.

## Generated artifact

Add one Jsonnet entrypoint and its generated snapshot:

- Source: `gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_security.jsonnet`
- Published JSON: `addons/oci-lz-dr/one-oe/oneoe_bcdr_security.json`

The source imports the existing AMS DR profile and produces only `scanning_configuration`. It selects the existing One-OE VSS configuration and removes every other top-level security section.

## Regional naming

VSS is regional. Update `gen/builders/security.libsonnet` so VSS host recipe and target keys and names use regional naming helpers:

- One-OE baseline: `VSS-RCPH-FRA-LZ-KEY` and `VSS-TGTH-FRA-LZ-KEY`
- BCDR addon: `VSS-RCPH-AMS-LZ-KEY` and `VSS-TGTH-AMS-LZ-KEY`

Compartment references remain global (`CMP-LZ-*`) because the baseline owns IAM compartments.

## Deployment flow

The Step 1 table adds `oneoe_bcdr_security.json` to every CIS and hub selection. It is used only in the initial DR stack; there is no `*_pre`/final VSS replacement because the VSS configuration does not depend on staged network references.

The README states that the BCDR stack must target `eu-amsterdam-1`, that its VSS resources are named with `AMS`, and that Security Zones are inherited from the baseline rather than recreated in the DR stack.

## Validation

Add a focused test and direct Jsonnet fixture that verify:

1. the published snapshot equals the Jsonnet entrypoint;
2. the DR output contains only `scanning_configuration`;
3. DR VSS names and keys use `AMS` and target the reused landing-zone compartment;
4. baseline One-OE VSS names and keys use `FRA`;
5. the README documents the VSS-only scope and Security Zone boundary.

Regenerate with `JSONNET_BIN=jsonnet bash gen/generate.sh`, then run the focused test, direct fixtures, the full test suite, and `git diff --check`.

## Non-goals

- Creating Security Zones, Cloud Guard, Vaults, or Keys in the DR stack.
- Adding DR-only IAM compartments.
- Changing the existing Security Zone policy set or compartment targets.
