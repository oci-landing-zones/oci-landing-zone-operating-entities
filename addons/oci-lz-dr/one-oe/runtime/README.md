# One-OE BCDR Runtime Files

This directory contains the JSON configuration files used by the One-OE BCDR extension. Follow the deployment sequence in the [One-OE BCDR guide](../README.md); do not combine a staged, final, requester, or acceptor variant with the file it replaces.

> [!IMPORTANT]
> **Manual post-deployment configuration required:** allow only the required workload protocols and ports between the AMS PROD range and `10.0.0.0/16` in the OCI Network Firewall or third-party firewall policy. The requester files create routing only; they do not add a broad firewall allow rule.

| JSON file | Purpose | Deployment use or replacement |
|---|---|---|
| `oneoe_bcdr_network_hub_a_pre.json` | Initial AMS Hub A network configuration. | Use first for staged Hub A networking. |
| `oneoe_bcdr_network_hub_a.json` | Complete AMS Hub A network configuration. | Replaces `oneoe_bcdr_network_hub_a_pre.json` after the referenced hub resources are available. |
| `oneoe_bcdr_network_hub_a_requester.json` | Complete AMS Hub A network with the FRA RPC requester and routes. | Replaces `oneoe_bcdr_network_hub_a.json` after the Frankfurt acceptor is applied. |
| `oneoe_bcdr_network_hub_b_pre.json` | Initial AMS Hub B network configuration. | Use first for staged Hub B networking. |
| `oneoe_bcdr_network_hub_b.json` | Complete AMS Hub B network configuration. | Replaces `oneoe_bcdr_network_hub_b_pre.json` after the referenced hub resources are available. |
| `oneoe_bcdr_network_hub_b_requester.json` | Complete AMS Hub B network with the FRA RPC requester and routes. | Replaces `oneoe_bcdr_network_hub_b.json` after the Frankfurt acceptor is applied. |
| `oneoe_bcdr_network_hub_c_pre.json` | Initial AMS Hub C network configuration. | Use first for staged Hub C networking. |
| `oneoe_bcdr_network_hub_c.json` | Complete AMS Hub C network configuration. | Replaces `oneoe_bcdr_network_hub_c_pre.json` for the standard Hub C design. |
| `oneoe_bcdr_network_hub_c_requester.json` | Complete standard AMS Hub C network with the FRA RPC requester and routes. | Replaces `oneoe_bcdr_network_hub_c.json` after the Frankfurt acceptor is applied. |
| `oneoe_bcdr_network_hub_c_backends.json` | Complete AMS Hub C network with third-party firewall backends. | Replaces `oneoe_bcdr_network_hub_c_pre.json` when the design uses firewall backend resources. |
| `oneoe_bcdr_network_hub_c_backends_requester.json` | Complete Hub C-with-backends network with the FRA RPC requester and routes. | Replaces `oneoe_bcdr_network_hub_c_backends.json` after the Frankfurt acceptor is applied. |
| `oneoe_bcdr_network_hub_e.json` | Complete AMS Hub E network configuration. | Use during the initial BCDR deployment; Hub E does not require staging. |
| `oneoe_bcdr_network_hub_e_requester.json` | Complete AMS Hub E network with the FRA RPC requester and routes. | Replaces `oneoe_bcdr_network_hub_e.json` after the Frankfurt acceptor is applied. |
| `oneoe_bcdr_observability_cis1_pre.json` | Initial CIS Level 1 AMS observability configuration. | Use during initial deployment before final hub networking. |
| `oneoe_bcdr_observability_cis1.json` | Final CIS Level 1 AMS observability configuration, including flow logs. | Replaces `oneoe_bcdr_observability_cis1_pre.json` after final network configuration. |
| `oneoe_bcdr_observability_cis2_pre.json` | Initial CIS Level 2 AMS observability configuration. | Use during initial deployment before final hub networking. |
| `oneoe_bcdr_observability_cis2.json` | Final CIS Level 2 AMS observability configuration, including flow logs. | Replaces `oneoe_bcdr_observability_cis2_pre.json` after final network configuration. |
| `oneoe_bcdr_security.json` | Regional AMS Vulnerability Scanning Service (VSS) recipes and targets. | Include in the initial BCDR stack; it has no staged replacement. |
| `oneoe_network_hub_a_acceptor.json` | Final Frankfurt One-OE Hub A network with the AMS RPC acceptor and routes. | Replaces the final Frankfurt `oneoe_network_hub_a.json` in the home-region stack. |
| `oneoe_network_hub_b_acceptor.json` | Final Frankfurt One-OE Hub B network with the AMS RPC acceptor and routes. | Replaces the final Frankfurt `oneoe_network_hub_b.json` in the home-region stack. |
| `oneoe_network_hub_c_acceptor.json` | Final Frankfurt One-OE Hub C network with the AMS RPC acceptor and routes. | Replaces the final Frankfurt `oneoe_network_hub_c.json` in the home-region stack. |
| `oneoe_network_hub_c_backends_acceptor.json` | Final Frankfurt One-OE Hub C-with-backends network with the AMS RPC acceptor and routes. | Replaces the final Frankfurt `oneoe_network_hub_c_backends.json` in the home-region stack. |
| `oneoe_network_hub_e_acceptor.json` | Final Frankfurt One-OE Hub E network with the AMS RPC acceptor and routes. | Replaces the final Frankfurt `oneoe_network_hub_e.json` in the home-region stack. |
