# X-RPC Runtime Golden Templates

This directory contains generated One-OE golden templates for a production-oriented RPC reference topology. The templates are generated from the current `gen/` source and are suitable for review, testing, and customer-specific adaptation.

## Reference Topology

| Side | Region | Hub | CIDR family | Environments |
|---|---|---|---|---|
| Tenancy 1 acceptor | `eu-frankfurt-1` | Hub A | `10.0.x.x` | `prod`, `preprod` |
| Tenancy 2 requester | `eu-amsterdam-1` | Hub B | `10.1.x.x` | `prod`, `preprod` |

## Files

### Cross Tenancy

| Side | Governance | IAM | Network |
|---|---|---|---|
| Tenancy 1 acceptor | [`cross_tenancy1_acceptor_governance.json`](./cross_tenancy1_acceptor_governance.json) | [`cross_tenancy1_acceptor_iam.json`](./cross_tenancy1_acceptor_iam.json) | [`cross_tenancy1_acceptor_network.json`](./cross_tenancy1_acceptor_network.json) |
| Tenancy 2 requester | [`cross_tenancy2_requester_governance.json`](./cross_tenancy2_requester_governance.json) | [`cross_tenancy2_requester_iam.json`](./cross_tenancy2_requester_iam.json) | [`cross_tenancy2_requester_network.json`](./cross_tenancy2_requester_network.json) |

The governance files are the standard One-OE baseline included in the published governance/IAM/network reference set. X-RPC does not introduce additional governance resources. Use the standard One-OE security and observability configurations with these templates; those domains are not duplicated here.

### Same Tenancy, Multiple Regions

| Side | Network |
|---|---|
| Tenancy 1 acceptor | [`same_tenancy1_acceptor_network.json`](./same_tenancy1_acceptor_network.json) |
| Tenancy 2 requester | [`same_tenancy2_requester_network.json`](./same_tenancy2_requester_network.json) |

Same-tenancy RPC does not require cross-tenancy IAM policies or an additional governance configuration, so only network templates are published.

## Before Deployment

These files are reference templates, not customer-specific values. Review and replace all placeholder tenancy OCIDs, group OCIDs, RPC references, firewall private IP OCIDs, CIDRs, regions, names, tags, notification endpoints, and other environment-specific values before deployment.

Hub A and Hub B use the standard two-stage OCI Network Firewall deployment. The committed network templates represent the final RPC-enabled network configuration. For a new Landing Zone, follow the matching Hub A or Hub B pre-stage workflow, or use config-driven generation to produce the matching `network_pre.json` file before applying the final network configuration.

For deployment order and validation, see the [X-RPC execution guide](../execution.md).

## Blueprint Factory And LZ Agent

The generated JSON output for a customer-specific Blueprint Factory or LZ Agent request is intentionally not committed in this directory. Follow [`x-rpc-blueprint-factory.md`](./x-rpc-blueprint-factory.md) to create a reviewed source config and generate a separate output directory.

## Regenerate

Regenerate all committed snapshots from the repository root:

```bash
bash gen/generate.sh
```

Do not edit generated runtime JSON directly. Update the corresponding profiles, builders, or Jsonnet entrypoints under [`gen/addons/oci-x-rpc/`](../../../gen/addons/oci-x-rpc/) and regenerate.
