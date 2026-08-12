# X-RPC Blueprint Factory And LZ Agent

## Overview

Use the [OCI LZ Blueprint Factory](../../oci-lz-blueprint-factory/README.md) or [OCI LZ AI Agent](../../oci-lz-ai-agent/README.md) when the runtime golden templates do not match the customer's regions, environments, platforms, CIDRs, hub models, or RPC topology.

Both paths create a reviewed source configuration and generate the complete current One-OE output set. Generated customer outputs are written to a separate directory and are not committed under `addons/oci-x-rpc/runtime/`.

## Supported RPC Scenarios

| Scenario | Acceptor | Requester | Additional IAM |
|---|---|---|---|
| Same tenancy, multiple regions | Omits `peer_id` | Sets the acceptor RPC OCID or dependency key in `peer_id` | None |
| Cross tenancy, multiple regions | Adds requester tenancy and foreign requester group OCIDs | Adds acceptor tenancy OCID and sets `peer_id` | Acceptor Admit policy; requester Allow and Endorse policies |

The requester IAM policy references the local group as `'id_lz_common'/'grp-lz-network-admin'`. Only the acceptor identifies the foreign requester group by OCID.

## Source Configuration

Define each connection under the top-level `remote_peering_connections` object:

```jsonnet
remote_peering_connections: {
  tenancy2: {
    remote_cidrs: [
      '10.1.0.0/21',
      '10.1.64.0/21',
      '10.1.128.0/21',
    ],
    peer_region_name: 'eu-amsterdam-1',
  },
},
```

The acceptor omits `peer_id`. The requester supplies the acceptor RPC OCID or an orchestrator dependency key:

```jsonnet
remote_peering_connections: {
  tenancy1: {
    remote_cidrs: [
      '10.0.0.0/21',
      '10.0.64.0/21',
      '10.0.128.0/21',
    ],
    peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.replace-me',
    peer_region_name: 'eu-frankfurt-1',
  },
},
```

For cross tenancy, the acceptor also sets `peer_tenancy_ocid` to the requester tenancy and `requestor_group_ocid` to the foreign requester network-administrator group. The requester sets only `peer_tenancy_ocid` to the acceptor tenancy.

`remote_cidrs` must contain the reviewed routable VCN CIDRs on the peer side. Do not include overlapping ranges or Kubernetes-internal service and overlay pod CIDRs unless the approved network design explicitly routes those ranges through the DRG.

## Dynamic Environments And Routing

Environment names and counts are customer-defined. The generator derives local routing from every network-producing environment and platform in the source configuration, including registered extensions such as OKE. It does not hardcode `prod`, `preprod`, `uat`, or a fixed number of environments.

Hub A, Hub B, and Hub C use the common firewall-hub RPC routing path. Hub E uses a direct DRG path and should be selected only for PoC, lab, or explicitly accepted no-firewall scenarios. The standard X-RPC examples use Hub A for the acceptor and Hub B for the requester.

The generator adds RPC route tables, route distributions, attachments, import statements, and route rules. It does not modify the customer's OCI Network Firewall security policy; that policy must separately permit the approved traffic.

## Example Pair

The Blueprint Factory includes a paired cross-tenancy example with dynamic `prod`, `preprod`, and `uat` environments:

- [Tenancy 1 Hub A acceptor](../../oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json)
- [Tenancy 2 Hub B requester](../../oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json)

Replace every placeholder OCID and review all CIDRs before generation.

## Generate The JSON Files

From the repository root, generate each Landing Zone into its own output directory:

```bash
bash gen/generate.sh \
  --config addons/oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json \
  generated/xrpc-acceptor

bash gen/generate.sh \
  --config addons/oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json \
  generated/xrpc-requester
```

Generation produces the complete One-OE files, including `governance.json`, `iam.json`, `network.json`, security and observability files, and `network_pre.json` for firewall hubs that require two-stage deployment.

Deploy the acceptor first, collect its RPC OCID, update the requester `peer_id` or dependency mapping, regenerate the requester if necessary, and then deploy the requester.

## LZ Agent Flow

The LZ Agent follows the same generator contract. It should discover and confirm both sides' tenancy and region, acceptor/requester roles, hub models, dynamic environments and platforms, non-overlapping CIDRs, cross-tenancy OCIDs, requester group OCID, and the acceptor RPC reference. Review the source configs and generated outputs before deployment.

For detailed sequencing and post-deployment checks, see the [X-RPC execution guide](../execution.md).
