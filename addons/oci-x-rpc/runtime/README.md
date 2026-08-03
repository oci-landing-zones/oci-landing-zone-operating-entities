# X-RPC Runtime References

This directory contains generated RPC-only reference fragments. The generator renders the current One-OE implementation and the X-RPC publication adapter projects only the relevant network and IAM delta.

These are not standalone or complete One-OE configurations. Governance remains part of the standard One-OE deployment and is not duplicated by this add-on.

## Files

| Scenario | Network | IAM |
|---|---|---|
| Same-tenancy acceptor | [`same_tenancy_acceptor_network.json`](./same_tenancy_acceptor_network.json) | Not required |
| Same-tenancy requestor | [`same_tenancy_requester_network.json`](./same_tenancy_requester_network.json) | Not required |
| Cross-tenancy acceptor | [`cross_tenancy_acceptor_network.json`](./cross_tenancy_acceptor_network.json) | [`cross_tenancy_acceptor_iam.json`](./cross_tenancy_acceptor_iam.json) |
| Cross-tenancy requestor | [`cross_tenancy_requester_network.json`](./cross_tenancy_requester_network.json) | [`cross_tenancy_requester_iam.json`](./cross_tenancy_requester_iam.json) |

The cross-tenancy acceptor IAM fragment identifies the foreign requestor group by OCID. The requestor IAM fragment references its local `'id_lz_common'/'grp-lz-network-admin'` group by name.

Regenerate these files from the repository root:

```bash
bash gen/generate.sh
```

Generate complete deployment files from a customer source config instead:

```bash
bash gen/generate.sh --config <config-file> <output-directory>
```
