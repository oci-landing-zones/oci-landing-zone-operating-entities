# One-OE BCDR Runtime Files

This directory contains the published Frankfurt/Amsterdam reference pair for the One-OE BCDR extension. Generate each customer home and DR config independently with Blueprint Factory and do not mix those generated files with these snapshots. Follow the deployment sequence in the [One-OE BCDR guide](../README.md).

> [!IMPORTANT]
> **Manual post-deployment configuration required:** allow only the required workload protocols and ports between the advertised AMS PROD range `10.0.200.0/21` and the advertised Frankfurt VCN ranges `10.0.0.0/21`, `10.0.64.0/21`, and `10.0.128.0/21` in the OCI Network Firewall or third-party firewall policy. Generated RPC resources create routing only; they do not add a broad firewall allow rule.

The committed home network files contain the Frankfurt acceptor and the matching DR network files contain the Amsterdam requester through the shared X-RPC model. Deploy the matching Hub A, Hub B, or Hub C pair; do not mix hub models.

> [!WARNING]
> **Required before deployment:** use Orchestrator v2.2.0 to resolve managed firewall and NLB route targets from resource keys. For Hub C-with-backends files, replace the example backend IP addresses and private-IP OCIDs with the reviewed firewall endpoints before applying.

| JSON file | Purpose | Deployment use |
|---|---|---|
| `oneoe_bcdr_home_network_hub_a.json` | Complete FRA Hub A network with the RPC acceptor. | Apply to the home stack before deploying DR. |
| `oneoe_bcdr_home_network_hub_b.json` | Complete FRA Hub B network with the RPC acceptor. | Apply to the home stack before deploying DR. |
| `oneoe_bcdr_home_network_hub_c.json` | Complete FRA Hub C network with the RPC acceptor. | Apply to the home stack for the standard design. |
| `oneoe_bcdr_home_network_hub_c_backends.json` | Complete FRA Hub C network with the acceptor and third-party firewall backends. | Use in the home stack when firewall backends are required. |
| `oneoe_bcdr_network_hub_a.json` | Complete AMS Hub A network with the RPC requester. | Apply after the home acceptor output is available. |
| `oneoe_bcdr_network_hub_b.json` | Complete AMS Hub B network with the RPC requester. | Apply after the home acceptor output is available. |
| `oneoe_bcdr_network_hub_c.json` | Complete AMS Hub C network with the RPC requester. | Apply after the home acceptor output is available for the standard design. |
| `oneoe_bcdr_network_hub_c_backends.json` | Complete AMS Hub C network with the requester and third-party firewall backends. | Use when the DR design requires firewall backend resources. |
| `oneoe_bcdr_observability_cis1_pre.json` | Initial CIS Level 1 AMS observability configuration. | Use during initial deployment before final hub networking. |
| `oneoe_bcdr_observability_cis1.json` | Final CIS Level 1 AMS observability configuration, including flow logs. | Replaces `oneoe_bcdr_observability_cis1_pre.json` after final network configuration. |
| `oneoe_bcdr_observability_cis2_pre.json` | Initial CIS Level 2 AMS observability configuration. | Use during initial deployment before final hub networking. |
| `oneoe_bcdr_observability_cis2.json` | Final CIS Level 2 AMS observability configuration, including flow logs. | Replaces `oneoe_bcdr_observability_cis2_pre.json` after final network configuration. |
| `oneoe_bcdr_security.json` | Regional AMS Vulnerability Scanning Service (VSS) recipes and targets. | Include in the initial BCDR stack; it has no staged replacement. |
