# Config-Driven OCVS

Config-driven OCVS should be authored through the [Blueprint Factory addon](../../addons/oci-lz-blueprint-factory/README.md). Use the [Prod with OCVS example](../../addons/oci-lz-blueprint-factory/examples/05-prod-ocvs.json) as the starting point for a reviewed source configuration.

The OCVS workload extension is configured as a platform extension named `ocvs_simple`.

The first supported shape is one OCVS SDDC management cluster per platform. Define another OCVS platform when you need another SDDC.

The platform VCN CIDR is the OCVS cluster network CIDR. Supported prefixes are `/24`, `/23`, `/22`, and `/21`. The generator creates the provisioning subnet, route tables, and network security groups referenced by the generated `ocvs_configuration` payload.

HCX is currently not emitted by config mode. `is_hcx_enabled: true` is rejected until the NAT gateway and firewalled hub pattern is validated.

Validation level: generated JSON and Terraform validation can prove the shape and Terraform contracts, but they do not prove OCI capacity, shape availability, VMware bundle availability, or an actual OCVS apply.

Generate the Blueprint Factory example from the repository root:

```bash
bash gen/generate.sh --config addons/oci-lz-blueprint-factory/examples/05-prod-ocvs.json generated/ocvs
```

| Configuration field | Purpose |
| --- | --- |
| `environments.<env>.platforms.ocvs.network.vcn` | OCVS platform VCN and SDDC cluster network CIDR. |
| `extension.type` | Must be `ocvs_simple`. |
| `extension.params.ssh_authorized_keys` | Public SSH key passed to the OCVS SDDC configuration. |
| `extension.params.cluster` | OCVS SDDC and ESXi host settings passed to `ocvs_configuration`. |
| `extension.params.cluster.workload_network_cidr` | Optional workload network CIDR passed through to the OCVS module. |
