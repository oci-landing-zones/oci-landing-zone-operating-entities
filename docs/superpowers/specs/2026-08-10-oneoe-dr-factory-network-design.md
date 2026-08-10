# One-OE DR Factory and Network Publication Design

## Goal

Add a One-OE-only Disaster Recovery decision to the guided Blueprint Factory flow and publish the Amsterdam DR network artifacts from Jsonnet sources rather than hand-maintained JSON.

## Guided Factory Decision

One-OE remains the current baseline selected by the guided Factory flow. Immediately after that decision, the AI-guided flow asks in English:

> **Do you want to deploy a Disaster Recovery (DR) region?**

If the answer is **No**, the existing One-OE discovery flow continues unchanged.

If the answer is **Yes**, the Factory selects the only supported DR preset in this release:

| Property | Value |
|---|---|
| Home region | `eu-frankfurt-1` |
| DR region | `eu-amsterdam-1` |
| DR region short name | `ams` |
| DR hub VCN | `10.0.192.0/21` |
| DR PROD VCN | `10.0.200.0/21` |
| DR environments | `prod` only |

Multi-OE DR is not supported by the Factory in this release. A future flow that exposes Multi-OE must state that limitation instead of offering this preset.

The guided behavior is implemented in these sources:

- `AGENTS.md`: add the DR decision immediately after the mandatory One-OE baseline decision and before the region discovery step.
- `.agents/skills/landing-zone-customer-guidance/SKILL.md`: add the same ordering and One-OE-only DR limitation to the activation checklist.

The public behavior is documented in `addons/oci-lz-blueprint-factory/README.md` and `addons/oci-lz-ai-agent/README.md`. The agent manifests do not need a change because they only select the existing skills; they do not contain the discovery logic.

The preset does not become a global generator default because its CIDRs are specific to the published Frankfurt-to-Amsterdam topology.

## Jsonnet Source and Published Network Artifacts

Create a published source family at `gen/addons/oci-lz-dr/one-oe/`:

- `profiles.libsonnet` owns the DR profile data. It sets the Amsterdam region and short name, the two approved CIDRs, a `prod` shared-project network, and no `preprod` environment.
- Thin `oneoe_bcdr_network_*.jsonnet` entrypoints import the profile and `gen/landing_zone.libsonnet`, then select the standard `network`, `network_pre`, or `network_backends` output as appropriate.

The default generator mirrors those entrypoints into `addons/oci-lz-dr/one-oe/`. The published outputs replace the current empty `oneoe_bcdr_network_hub_*.json` placeholders and retain the normal One-OE staged topology:

| Hub | Published DR network artifacts |
|---|---|
| Hub A | `oneoe_bcdr_network_hub_a_pre.json`, `oneoe_bcdr_network_hub_a.json` |
| Hub B | `oneoe_bcdr_network_hub_b_pre.json`, `oneoe_bcdr_network_hub_b.json` |
| Hub C | `oneoe_bcdr_network_hub_c_pre.json`, `oneoe_bcdr_network_hub_c_backends.json`, `oneoe_bcdr_network_hub_c.json` |
| Hub E | `oneoe_bcdr_network_hub_e.json` |

Generated names, route rules, security rules, load-balancer examples, and network-firewall address lists must use `ams` and the two DR CIDRs. The network output must include only the hub and the `prod` network; it must not create the Frankfurt profile's `preprod` VCN.

## Deployment Documentation

Update the One-OE BCDR README to use the appropriate network pre artifact during initial deployment for staged hubs, then replace it with the final network artifact in the same ORM stack or Terraform state. Hub C also documents its backend update phase. Hub E keeps its single final-network deployment.

The README keeps the existing statement that the published BCDR topology is Frankfurt to Amsterdam and directs designs outside this scope to the Blueprint Factory for review.

## Testing and Validation

Add focused generator tests that import the DR Jsonnet entrypoints and assert:

- `ams` is used in generated resource names;
- the hub and PROD VCN CIDRs are `10.0.192.0/21` and `10.0.200.0/21`;
- no `preprod` network category is emitted;
- each staged hub exposes the expected pre/final/backends outputs.

Generate the committed DR snapshots with `bash gen/generate.sh`, review the resulting diff, and run the full Python unit-test suite. Validate all generated JSON with `jq` and run `git diff --check`.

## Deferred Work

Regional VSS and Security Zones remain a separate follow-on change. They must be added through Jsonnet sources and generated outputs, not released as hand-maintained JSON files.
