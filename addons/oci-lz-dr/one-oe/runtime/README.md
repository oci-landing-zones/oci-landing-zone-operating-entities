# One-OE BCDR Runtime Files

This directory contains the published Frankfurt/Amsterdam reference pair for the One-OE BCDR extension. Generate each customer home and DR config independently with Blueprint Factory and do not mix those generated files with these snapshots. Follow the deployment sequence in the [One-OE BCDR guide](../README.md).

> [!IMPORTANT]
> **Manual post-deployment configuration required:** allow only the required workload protocols and ports between the advertised AMS PROD range `10.0.200.0/21` and the advertised Frankfurt VCN ranges `10.0.0.0/21`, `10.0.64.0/21`, and `10.0.128.0/21` in the OCI Network Firewall or third-party firewall policy. Generated RPC resources create routing only; they do not add a broad firewall allow rule.

The committed home network files contain the Frankfurt acceptor and the matching DR network files contain the Amsterdam requester through the shared X-RPC model. Deploy the matching Hub A, Hub B, or Hub C pair; do not mix hub models.

> [!WARNING]
> **Required before deployment:** the Hub A, Hub B, Hub C, and Hub C-with-backends final files contain example `network_entity_id` values for firewall or NLB private IPs. Replace every value containing `OCI NFW PRIVATE IP OCID`, `DMZ OCI NFW PRIVATE IP OCID`, `Internal OCI NFW PRIVATE IP OCID`, `TRUST NLB PRIVATE IP OCID`, or `UNTRUST NLB PRIVATE IP OCID` with the real `ocid1.privateip...` from the corresponding region. Do not apply a file while any example value remains.

| JSON file | Purpose | Deployment use |
|---|---|---|
| `oneoe_bcdr_home_network_hub_a_pre.json` | Initial FRA Hub A network with the RPC acceptor. | Use first for staged home Hub A networking. |
| `oneoe_bcdr_home_network_hub_a.json` | Complete FRA Hub A network with the RPC acceptor. | Replaces the matching home pre file. |
| `oneoe_bcdr_home_network_hub_b_pre.json` | Initial FRA Hub B network with the RPC acceptor. | Use first for staged home Hub B networking. |
| `oneoe_bcdr_home_network_hub_b.json` | Complete FRA Hub B network with the RPC acceptor. | Replaces the matching home pre file. |
| `oneoe_bcdr_home_network_hub_c_pre.json` | Initial FRA Hub C network with the RPC acceptor. | Use first for staged home Hub C networking. |
| `oneoe_bcdr_home_network_hub_c.json` | Complete FRA Hub C network with the RPC acceptor. | Replaces the matching home pre file for the standard design. |
| `oneoe_bcdr_home_network_hub_c_backends.json` | Complete FRA Hub C network with the acceptor and third-party firewall backends. | Replaces the matching home pre file when firewall backends are used. |
| `oneoe_bcdr_network_hub_a_pre.json` | Initial AMS Hub A network with the RPC requester. | Use first for staged DR Hub A networking. |
| `oneoe_bcdr_network_hub_a.json` | Complete AMS Hub A network with the RPC requester. | Replaces `oneoe_bcdr_network_hub_a_pre.json` after the referenced hub resources are available. |
| `oneoe_bcdr_network_hub_b_pre.json` | Initial AMS Hub B network with the RPC requester. | Use first for staged DR Hub B networking. |
| `oneoe_bcdr_network_hub_b.json` | Complete AMS Hub B network with the RPC requester. | Replaces `oneoe_bcdr_network_hub_b_pre.json` after the referenced hub resources are available. |
| `oneoe_bcdr_network_hub_c_pre.json` | Initial AMS Hub C network with the RPC requester. | Use first for staged DR Hub C networking. |
| `oneoe_bcdr_network_hub_c.json` | Complete AMS Hub C network with the RPC requester. | Replaces `oneoe_bcdr_network_hub_c_pre.json` for the standard Hub C design. |
| `oneoe_bcdr_network_hub_c_backends.json` | Complete AMS Hub C network with the requester and third-party firewall backends. | Replaces `oneoe_bcdr_network_hub_c_pre.json` when the design uses firewall backend resources. |
| `oneoe_bcdr_observability_cis1_pre.json` | Initial CIS Level 1 AMS observability configuration. | Use during initial deployment before final hub networking. |
| `oneoe_bcdr_observability_cis1.json` | Final CIS Level 1 AMS observability configuration, including flow logs. | Replaces `oneoe_bcdr_observability_cis1_pre.json` after final network configuration. |
| `oneoe_bcdr_observability_cis2_pre.json` | Initial CIS Level 2 AMS observability configuration. | Use during initial deployment before final hub networking. |
| `oneoe_bcdr_observability_cis2.json` | Final CIS Level 2 AMS observability configuration, including flow logs. | Replaces `oneoe_bcdr_observability_cis2_pre.json` after final network configuration. |
| `oneoe_bcdr_security.json` | Regional AMS Vulnerability Scanning Service (VSS) recipes and targets. | Include in the initial BCDR stack; it has no staged replacement. |
