# X-RPC Blueprint Factory And LZ Agent

## Overview

The [OCI LZ Blueprint Factory](../../oci-lz-blueprint-factory/README.md) and [OCI LZ AI Agent](../../oci-lz-ai-agent/README.md) help generate X-RPC configurations for customer-specific requirements, including regions, environments, platforms, CIDRs, hub models, and RPC topology.

## Scenarios

| Scenario | Acceptor | Requester | Additional RPC IAM |
|---|---|---|---|
| Same tenancy, multiple regions | Omits `peer_id` | Sets the acceptor RPC OCID or dependency key in `peer_id` | Same-tenancy RPC IAM policies are not needed. |
| Cross tenancy, multiple regions | Adds requester tenancy and foreign requester group OCIDs; omits `peer_id` | Adds acceptor tenancy OCID and sets `peer_id` | Acceptor Admit policy; requester Allow and Endorse policies |

The requester IAM policy references its local group as `'id_lz_common'/'grp-lz-network-admin'`. Only the acceptor identifies the foreign requester group by OCID.

In the published reference topology, Tenancy 1 remains the acceptor. Add a separate `remote_peering_connections` entry and acceptor RPC for each additional requester region or tenancy.

## Configuration Contract

Define each RPC under the top-level `remote_peering_connections` object. Each entry uses the following required and role-specific fields:

- `remote_cidrs`: required, reviewed routable VCN CIDRs on the peer side
- `peer_region_name`: OCI region containing the peer RPC; specify it for inter-region connections
- `peer_id`: acceptor RPC OCID or orchestrator dependency key, requester only
- `peer_tenancy_ocid`: peer tenancy OCID, cross tenancy only
- `requestor_group_ocid`: foreign requester network-administrator group OCID, cross-tenancy acceptor only

Do not include overlapping ranges or Kubernetes-internal service and overlay pod CIDRs unless the approved network design explicitly routes those ranges through the DRG.

## Same-Tenancy Generation

Create one source configuration per region.

In this reference pattern, Region 1 represents the primary region and always acts as the RPC acceptor. Region 2 represents an additional subscribed region, such as a DR region, and acts as the requester. Additional subscribed regions can follow the Region 2 requester pattern with one corresponding acceptor RPC entry for each connection.

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

Hub selection follows the customer's One-OE design and is configured independently for each Landing Zone. Hub A and Hub B use OCI Network Firewall, Hub C supports third-party network firewalls through trust and untrust Network Load Balancers, and Hub E provides direct DRG routing without a firewall. Hub E should be selected only for PoC, lab, or explicitly accepted no-firewall scenarios. The X-RPC generator applies the appropriate routing for the selected hub model.

For Hub C, the Blueprint Factory generates the hub network, required subnets, Network Load Balancers, DRG integration, X-RPC routing, and `network_backends.json`. The customer deploys and configures the third-party firewall appliances, such as Fortinet or Palo Alto, and supplies their private IP OCIDs to complete the Network Load Balancer backend configuration.

The generator adds RPC route tables, route distributions, attachments, import statements, and route rules. Firewall policies must separately permit the approved X-RPC traffic.

## Generated Output

Generation produces the core One-OE configuration files: `governance.json`, `iam.json`, `network.json`, the selected `security_cis1.json` or `security_cis2.json`, and the corresponding `observability_cis1.json` or `observability_cis2.json`.

For staged deployments, generation also produces `network_pre.json`, the selected `security_cis1_pre.json` or `security_cis2_pre.json`, and the corresponding `observability_cis1_pre.json` or `observability_cis2_pre.json`. Hub C deployments can additionally produce `network_backends.json`, and registered extensions can add their own `.json` output files.

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
