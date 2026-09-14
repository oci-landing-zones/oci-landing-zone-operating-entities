# **[OCI Remote Peering Connections](#)**
## **An OCI Open LZ [Addon](#) for Remote Peering Across Regions and Tenancies using IaC**
&nbsp;
## **DRG Route Table Design and Sample JSON Files**

### 1. DRG Routing Design

The diagram below illustrates a sample routing setup for a multi-tenancy/multi-region RPC configuration. The left side represents Tenancy 1, the acceptor, using **Hub Model A**, while the right side represents Tenancy 2, the requester, using **Hub Model B**.

<img src="../images/drg-routing.png" width="100%">

> [!NOTE]
> The diagram serves as a reference for designing DRG routing based on specific architecture requirements. Tenancy 1 and Tenancy 2 may use different supported DRG and firewall routing designs. The published sample uses firewalls on both sides with Hub A and Hub B.

&nbsp;
### 2. Sample JSON Configuration for RPC

#### Cross-Tenancy Configuration

- **Tenancy 1 - Acceptor**
  - [`cross_tenancy1_acceptor_governance.json`](./cross_tenancy1_acceptor_governance.json) provides the standard One-OE governance baseline.
  - [`cross_tenancy1_acceptor_iam.json`](./cross_tenancy1_acceptor_iam.json) defines the compartments, groups, baseline policies, and cross-tenancy Admit policy required by the acceptor.
  - [`cross_tenancy1_acceptor_network.json`](./cross_tenancy1_acceptor_network.json) defines the Hub A and spoke network, acceptor RPC, DRG attachments, route tables, route distributions, and route rules.
  - For Hub A details, see the [OCI Open LZ Hub A documentation](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_a).

- **Tenancy 2 - Requester**
  - [`cross_tenancy2_requester_governance.json`](./cross_tenancy2_requester_governance.json) provides the standard One-OE governance baseline.
  - [`cross_tenancy2_requester_iam.json`](./cross_tenancy2_requester_iam.json) defines the compartments, groups, baseline policies, and cross-tenancy Allow and Endorse policies required by the requester.
  - [`cross_tenancy2_requester_network.json`](./cross_tenancy2_requester_network.json) defines the Hub B and spoke network, requester RPC, DRG attachments, route tables, route distributions, and route rules.
  - For Hub B details, see the [OCI Open LZ Hub B documentation](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_b).

Tenancy 1 remains the acceptor in this reference topology. Each additional requester region or tenancy requires its own acceptor RPC entry in Tenancy 1.

#### Same-Tenancy, Multi-Region Configuration

In this reference pattern, Region 1 represents the primary region and always acts as the RPC acceptor. Region 2 represents an additional subscribed region, such as a DR region, and acts as the requester. Additional subscribed regions can follow the Region 2 requester pattern.

- [`same_tenancy_region1_acceptor_network.json`](./same_tenancy_region1_acceptor_network.json) provides the Region 1 Hub A network with the acceptor RPC. As Region 1 is the acceptor, its RPC configuration does not require a peer reference.
- [`same_tenancy_region2_requester_network.json`](./same_tenancy_region2_requester_network.json) provides the Region 2 Hub B network with the requester RPC. As Region 2 is the requester, include the Region 1 acceptor RPC OCID in the `peer_id` field to establish the peering.

Same-tenancy RPC requires no additional cross-tenancy IAM or governance configuration. Only the two network templates are published for this scenario.

<a id="same-tenancy-multi-region-deployment"></a>

### 3. Same-Tenancy, Multi-Region Deployment

Deploy the primary or home region as the RPC acceptor before deploying the
secondary or DR region as the requester. When using the One-OE DR add-on, both
regions must use the same supported Hub A, Hub B, or Hub C model. The DR pair
templates match the specific RPC attachment ID rather than every attachment of
that type.

Same-tenancy RPC changes only the network configuration. It does not require the
additional IAM and governance files used by cross-tenancy RPC.

#### Reference files

The generic X-RPC reference files are:

- [`same_tenancy_region1_acceptor_network.json`](./same_tenancy_region1_acceptor_network.json)
  for the primary-region acceptor;
- [`same_tenancy_region2_requester_network.json`](./same_tenancy_region2_requester_network.json)
  for the secondary-region requester.

When X-RPC is used with the One-OE DR add-on, select the complete replacement that
matches the hub deployed on each side:

| Hub model | Frankfurt home acceptor | Amsterdam DR requester |
|---|---|---|
| Hub A | [`oneoe_network_hub_a_acceptor.json`](../../oci-lz-dr/one-oe/runtime/oneoe_network_hub_a_acceptor.json) | [`oneoe_bcdr_network_hub_a_requester.json`](../../oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_a_requester.json) |
| Hub B | [`oneoe_network_hub_b_acceptor.json`](../../oci-lz-dr/one-oe/runtime/oneoe_network_hub_b_acceptor.json) | [`oneoe_bcdr_network_hub_b_requester.json`](../../oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_b_requester.json) |
| Hub C | [`oneoe_network_hub_c_acceptor.json`](../../oci-lz-dr/one-oe/runtime/oneoe_network_hub_c_acceptor.json) | [`oneoe_bcdr_network_hub_c_requester.json`](../../oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_requester.json) |
| Hub C with third-party firewall backends | [`oneoe_network_hub_c_backends_acceptor.json`](../../oci-lz-dr/one-oe/runtime/oneoe_network_hub_c_backends_acceptor.json) | [`oneoe_bcdr_network_hub_c_backends_requester.json`](../../oci-lz-dr/one-oe/runtime/oneoe_bcdr_network_hub_c_backends_requester.json) |

Each file is a complete network configuration. Replace the corresponding final
network file; do not deploy both files together in the same stack or Terraform
state.

#### Deployment order

1. Deploy the base home-region stack and complete any staged network deployment.
2. Replace its final network file with the matching Frankfurt acceptor file and
   run Terraform `plan` and `apply`.
3. Confirm that the home-region network output contains
   `RPC-FRA-LZ-HUB-DR-KEY`, and collect its RPC OCID.
4. When using the DR add-on dependency workflow, replicate the updated home output
   dependency files to the DR-region bucket. This second replication is required
   because the acceptor RPC did not exist in the files copied before the DR stack
   was created.
5. Deploy the base DR-region stack and complete its staged hub network deployment.
6. Refresh the DR stack dependency, replace its final network file with the
   matching Amsterdam requester file, and run Terraform `plan` and `apply`.
7. Validate bidirectional connectivity after both RPCs and all reviewed routes are
   present.

#### Acceptor and requester references

The Frankfurt acceptor creates the RPC without a peer reference:

```json
"remote_peering_connections": {
    "RPC-FRA-LZ-HUB-DR-KEY": {
        "display_name": "rpc-fra-lz-hub-dr",
        "peer_region_name": "eu-amsterdam-1"
    }
}
```

Its network output provides the RPC OCID used to establish the peering:

```text
RPC-FRA-LZ-HUB-DR-KEY
id          "ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.example"
region_name "eu-frankfurt-1"
```

The published Amsterdam requester uses the acceptor dependency key:

```json
"remote_peering_connections": {
    "RPC-AMS-LZ-HUB-HOME-KEY": {
        "display_name": "rpc-ams-lz-hub-home",
        "peer_key": "RPC-FRA-LZ-HUB-DR-KEY",
        "peer_region_name": "eu-frankfurt-1"
    }
}
```

Use `peer_key` when the orchestrator resolves the acceptor from replicated output
dependencies. For a standalone or manual deployment, replace `peer_key` with
`peer_id` containing the acceptor RPC OCID. Do not set both fields on the same RPC.

<img src="../images/s-tenancy.png" width="900" alt="Same-tenancy RPC between the primary and DR regions">

#### Validation

After applying both network replacements:

- verify that both RPCs report the `PEERED` status;
- verify that both DRG RPC attachments are connected;
- confirm that the expected DRG route-table associations, import distributions,
  and exact VCN routes exist in both regions;
- confirm that the Network Firewall policies allow the reviewed traffic when a
  firewall hub is used;
- test approved traffic in both directions.

For the general Terraform/ORM flow, see the
[OCI X-RPC execution guide](../execution.md).

> [!NOTE]
> The reference JSON configuration files are based on the current One-OE structure. Review and replace all placeholder tenancy OCIDs, group OCIDs, RPC references, firewall private IP OCIDs, CIDRs, regions, and other customer-specific values before deployment. Standard One-OE security and observability configurations remain part of the Landing Zone deployment and are not duplicated here.

For customer-specific dynamic generation, see the [X-RPC Blueprint Factory and LZ Agent guide](./x-rpc-blueprint-factory.md).

#### License
Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
