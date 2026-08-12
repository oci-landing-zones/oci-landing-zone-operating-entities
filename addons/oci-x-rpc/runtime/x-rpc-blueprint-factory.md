# X-RPC Blueprint Factory And LZ Agent

## Overview

Use the [OCI LZ Blueprint Factory](../../oci-lz-blueprint-factory/README.md) or [OCI LZ AI Agent](../../oci-lz-ai-agent/README.md) when the runtime golden templates do not match the customer's regions, environments, platforms, CIDRs, hub models, or RPC topology.

Both paths create a reviewed source configuration and generate the complete current One-OE output set. Generated customer outputs are written to separate customer-selected directories and are not committed under `addons/oci-x-rpc/runtime/`.

## Supported RPC Scenarios

| Scenario | Acceptor | Requester | Additional RPC IAM |
|---|---|---|---|
| Same tenancy, multiple regions | Omits `peer_id` | Sets the acceptor RPC OCID or dependency key in `peer_id` | None |
| Cross tenancy, multiple regions | Adds requester tenancy and foreign requester group OCIDs; omits `peer_id` | Adds acceptor tenancy OCID and sets `peer_id` | Acceptor Admit policy; requester Allow and Endorse policies |

The requester IAM policy references its local group as `'id_lz_common'/'grp-lz-network-admin'`. Only the acceptor identifies the foreign requester group by OCID.

In the published reference topology, Tenancy 1 remains the acceptor. Add a separate `remote_peering_connections` entry and acceptor RPC for each additional requester region or tenancy.

## Configuration Contract

Define each RPC under the top-level `remote_peering_connections` object. Every entry requires:

- `remote_cidrs`: reviewed routable VCN CIDRs on the peer side
- `peer_region_name`: OCI region containing the peer RPC
- `peer_id`: acceptor RPC OCID or orchestrator dependency key, requester only
- `peer_tenancy_ocid`: peer tenancy OCID, cross tenancy only
- `requestor_group_ocid`: foreign requester network-administrator group OCID, cross-tenancy acceptor only

Do not include overlapping ranges or Kubernetes-internal service and overlay pod CIDRs unless the approved network design explicitly routes those ranges through the DRG.

## Same-Tenancy Generation

Create one source configuration per region.

### Region 1 - Acceptor

The acceptor creates the RPC and omits `peer_id` and all cross-tenancy IAM fields:

```jsonnet
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: {
    kind: 'hub_a',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: { vcn: '10.0.64.0/21' },
      },
    },
  },
  remote_peering_connections: {
    region2: {
      remote_cidrs: ['10.1.0.0/21', '10.1.64.0/21'],
      peer_region_name: 'eu-amsterdam-1',
    },
  },
}
```

Save the reviewed source configuration in a customer-selected location. Generate and deploy Region 1, then collect its RPC OCID:

```bash
bash gen/generate.sh \
  --config <region1-source-config> \
  <region1-output-directory>
```

### Region 2 - Requester

The requester sets `peer_id` to the Region 1 acceptor RPC OCID:

```jsonnet
{
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  realm: 'oc1',
  hub: {
    kind: 'hub_b',
    network: { vcn: '10.1.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: { vcn: '10.1.64.0/21' },
      },
    },
  },
  remote_peering_connections: {
    region1: {
      remote_cidrs: ['10.0.0.0/21', '10.0.64.0/21'],
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.replace-me',
      peer_region_name: 'eu-frankfurt-1',
    },
  },
}
```

Save the reviewed requester source configuration separately, then generate and deploy Region 2:

```bash
bash gen/generate.sh \
  --config <region2-source-config> \
  <region2-output-directory>
```

The complete generated IAM and governance files contain the normal One-OE baseline. Same-tenancy RPC itself changes only the network output.

## Cross-Tenancy Generation

The Blueprint Factory includes a paired example with dynamic `prod`, `preprod`, and `uat` environments:

- [Tenancy 1 Hub A acceptor](../../oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json)
- [Tenancy 2 Hub B requester](../../oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json)

The Tenancy 1 acceptor sets the Tenancy 2 OCID and foreign requester group OCID, and omits `peer_id`. The Tenancy 2 requester sets the Tenancy 1 OCID and acceptor RPC reference, and omits `requestor_group_ocid`.

Replace every placeholder OCID and review all CIDRs before generation.

Generate both Landing Zones into separate directories:

```bash
bash gen/generate.sh \
  --config addons/oci-lz-blueprint-factory/examples/05-xrpc-cross-tenancy-acceptor.json \
  generated/xrpc-cross-tenancy-acceptor

bash gen/generate.sh \
  --config addons/oci-lz-blueprint-factory/examples/06-xrpc-cross-tenancy-requester.json \
  generated/xrpc-cross-tenancy-requester
```

Deploy the requester IAM baseline first when its network-administrator group must be created. Deploy the acceptor IAM and network next, collect the acceptor RPC OCID, update the requester `peer_id` or dependency mapping, regenerate the requester if necessary, and then deploy the requester network.

## Dynamic Environments And Routing

Environment names and counts are customer-defined. The generator derives local routing from every network-producing environment and platform in the source configuration, including registered extensions such as OKE. It does not hardcode `prod`, `preprod`, `uat`, or a fixed number of environments.

Hub A, Hub B, and Hub C use the common firewall-hub RPC routing path. Hub E uses a direct DRG path and should be selected only for PoC, lab, or explicitly accepted no-firewall scenarios. The standard X-RPC examples use Hub A for the acceptor and Hub B for the requester.

The generator adds RPC route tables, route distributions, attachments, import statements, and route rules. It does not modify the customer's OCI Network Firewall security policy; that policy must separately permit the approved traffic.

## Generated Output

Generation produces the complete One-OE files, including `governance.json`, `iam.json`, `network.json`, security and observability files, and `network_pre.json` for firewall hubs that require two-stage deployment.

Review all generated files before deployment. Keep the source configurations and generated output directories separate.

## LZ Agent Flow

The LZ Agent follows the same generator contract. It should discover and confirm:

- Same-tenancy or cross-tenancy scope
- Regions and acceptor/requester roles
- Hub models and firewall requirements
- Dynamic environments and network-producing platforms
- Non-overlapping local and remote CIDRs
- Cross-tenancy OCIDs and requester group OCID, when required
- Acceptor RPC OCID or dependency key for every requester

The agent must produce one reviewed source configuration and one generated output directory per Landing Zone. Review the source configs and generated outputs before deployment.

For detailed sequencing and post-deployment checks, see the [OCI X-RPC execution guide](../execution.md).
