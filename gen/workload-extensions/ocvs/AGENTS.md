# OCVS Generator Agent Guide

This file covers `gen/workload-extensions/ocvs/**` and published OCVS snapshots/docs under `workload-extensions/ocvs/**`. Root `AGENTS.md` owns customer safety, base landing-zone discovery, and deployment defaults; this file owns OCVS extension semantics.

## Source Of Truth

- `gen/workload-extensions/ocvs/ocvs_builder.libsonnet` owns reusable OCVS metadata and contribution assembly.
- `gen/workload-extensions/ocvs/ocvs_network.libsonnet` owns OCVS provisioning subnet, route table, NSG, and gateway rendering.
- `gen/workload-extensions/ocvs/ocvs_configuration.libsonnet` owns the direct downstream `ocvs_configuration` payload.
- `gen/workload-extensions/ocvs/published_profiles.libsonnet` owns repo-published OCVS defaults when published snapshots are generated.
- `gen/workload-extensions/ocvs/output_builder.libsonnet` owns the profile-to-committed-JSON OCVS output surface.
- Checked-in JSON files under `workload-extensions/ocvs/**` are generated snapshots once Jsonnet source exists for that path. Do not hand-edit generated snapshots.

## Contract

- Extension type is `ocvs`.
- OCVS is a networked platform extension: `platform.network.vcn` is required.
- The first supported shape is one SDDC management cluster per platform. Use multiple OCVS platform entries for multiple SDDCs.
- The OCVS platform VCN is the SDDC cluster network CIDR consumed by the downstream OCVS module as `networking.vcn_cidr_block`.
- Supported OCVS platform VCN prefixes are `/24`, `/23`, `/22`, and `/21`.
- The generated provisioning subnet uses the first segment of the OCVS platform VCN after four additional prefix bits: `/28`, `/27`, `/26`, or `/25` respectively.
- The downstream OCVS module creates VLANs from the same cluster network CIDR. The generator emits the provisioning subnet, route tables, and network security groups referenced by the OCVS payload.
- Direct OCVS deployment is contract-validated with `terraform-oci-modules-orchestrator` v2.1.3. Revalidate when changing the generated OCVS payload, dependency keys, or orchestrator ref.
