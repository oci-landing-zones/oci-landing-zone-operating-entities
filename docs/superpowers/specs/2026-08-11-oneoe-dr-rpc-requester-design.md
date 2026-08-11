# One-OE DR RPC Requester Design

## Goal

Publish complete One-OE BCDR requester-network artifacts for each final hub network so an Amsterdam DR deployment can establish an RPC to the Frankfurt baseline without replacing or discarding its existing network configuration.

## Scope

Create Jsonnet entrypoints and generated JSON artifacts for every non-pre BCDR network variant:

- Hub A: `oneoe_bcdr_network_hub_a_requester.json`
- Hub B: `oneoe_bcdr_network_hub_b_requester.json`
- Hub C: `oneoe_bcdr_network_hub_c_requester.json`
- Hub C with third-party firewall backends: `oneoe_bcdr_network_hub_c_backends_requester.json`
- Hub E: `oneoe_bcdr_network_hub_e_requester.json`

The initial `*_pre.json` files remain unchanged. A requester artifact replaces its corresponding final network artifact in the same stack or Terraform state after the final hub network has been completed.

## Deployment contract

Every requester artifact is a complete `network_configuration`, not a partial RPC overlay. The Resource Manager facade selects one value for each repeated top-level configuration family and does not deep-merge repeated `network_configuration` values. Supplying a base network file and a partial requester file together would therefore ignore one of them, depending on input order.

All requester artifacts use the published reference pair:

- Amsterdam requester RPC key: `RPC-AMS-LZ-HUB-REGION-A-KEY`
- Frankfurt peer RPC key: `RPC-FRA-LZ-HUB-REGION-B-KEY`
- Frankfurt region: `eu-frankfurt-1`
- Frankfurt routed range: `10.0.0.0/16`

## Network behaviour

Each generated requester artifact starts from its matching final network and preserves every existing VCN, subnet, gateway, DRG attachment, DRG route table, distribution statement, and route rule.

It adds:

1. The requester RPC and its `REMOTE_PEERING_CONNECTION` DRG attachment.
2. A dedicated RPC DRG route table and import distribution. Hub E accepts the existing Hub and prod VCN attachments. Hub A, Hub B, and both Hub C variants use a static route for the prod CIDR through the Hub VCN attachment, so return traffic is inspected before it reaches prod.
3. An additional RPC acceptance statement in every existing DRG import distribution that is used by a local VCN attachment. Existing local VCN acceptance statements must remain intact.
4. VCN route rules for the Frankfurt range, using the connectivity path of the corresponding hub model.

Hub E sends the Frankfurt range directly to `DRG-AMS-LZ-HUB-KEY`. Hub A, Hub B, and both Hub C variants cover only the prod VCN through the RPC. Their existing prod default route continues to send traffic to the Hub, and the requester artifact adds the specific Frankfurt route from the firewall egress path back to the DRG. This preserves symmetric firewall traversal without exposing the Hub VCN through the RPC.

The requester artifacts do not add allow-all firewall rules. For Hub A and Hub B, the operator must add OCI Network Firewall rules for the exact workload protocols between prod and `10.0.0.0/16`. For Hub C and Hub C with backends, the operator must configure the equivalent third-party firewall rules. The One-OE BCDR documentation must label this as manual post-deployment configuration.

## Source layout

Keep generated JSON out of the implementation logic. Add a focused Jsonnet helper under `gen/addons/oci-lz-dr/one-oe/` that takes a final rendered network plus its hub model and returns the complete requester variant. Each requester entrypoint imports the existing profile and applies that helper to the appropriate final network result.

## Validation

Add focused tests that:

- render every requester entrypoint and compare it byte-for-structure with its published JSON snapshot;
- verify that the requester artifacts retain the base DRG attachments, route tables, distributions, and local route rules;
- verify the requester RPC, peer key, peer region, RPC attachment, and dedicated route table/distribution;
- verify that Hub E routes the Frankfurt range directly to the DRG;
- verify that Hub A, B, C, and C-backends route only prod through the firewall path for the Frankfurt range, without a direct RPC route to the Hub VCN;
- verify that the One-OE BCDR documentation records the manual, workload-specific firewall-policy prerequisite;
- verify no requester file is passed together with its base network file in the One-OE BCDR ORM guidance.

## Out of scope

The acceptor configuration in Frankfurt, the actual RPC peer handshake, customer-specific CIDRs, firewall private-IP values, and workload-specific firewall rules remain separate deployment inputs. This change does not alter the initial pre-network deployment, observability, VSS, or IAM artifacts.
