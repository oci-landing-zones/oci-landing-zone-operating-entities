# Hybrid Connectivity contributor and discovery guide

Root `AGENTS.md` owns classification, customer acceptance, discovery order, artifact placement and delivery defaults. This add-on extends the supported connectivity boundary; it does not replace those rules.

## Source and contract

- `config.libsonnet` owns the `hybrid_connectivity` input contract and address validation.
- `ipsec-options.json` defines the phase-specific algorithm and DH-group choices shared by Blueprint Factory validation and Studio.
- `gen/builders/hybrid_connectivity.libsonnet` owns resource names, custom VPN/circuit tables, imports and route entries.
- `gen/landing_zone.libsonnet` composes hybrid and RPC routing without replacing the hub DRG.
- Networking v0.9.0, selected by Orchestrator v2.2.0, is the downstream contract. Do not add fields unsupported by that tag.
- FastConnect provider connections require `provider_service_id`, an OCID for the target realm and region. Name-based `provider_service` input is not supported. Keep the provider activation reference `provider_service_key_name` separate. Catalog review, source evidence and realm/region coverage follow [Studio's data maintenance guide](../../../addons/oci-landingzone-studio/src/data/AGENTS.md). Studio offers only verified regional provider-service OCIDs in its dropdown, with manual identifier entry elsewhere.
- Keep canonical networking in `network.json`; never add another simultaneous root `network_configuration` fragment.

## Customer discovery addendum

After the normal baseline/hub decisions and before final address allocation, ask one question at a time for the connections, reviewed remote networks and intended redundancy. Collect the CPE public IP or existing CPE OCID, static/BGP tunnel choices, customer ASN, both tunnels' interface pairs, IKE requirements, and key source. FastConnect supports private circuits only. Collect the provider service or ready physical connection OCIDs, remote CIDRs, bandwidth, VLAN/peering pairs, ASN and optional MD5 authentication.

VPN interfaces use paired /30 or /31 host addresses; private FastConnect peering uses /28 through /31. Check the official OCI requirements for reserved ranges, device-specific settings and provider-controlled BGP. Remote CIDRs must avoid all local network ranges; identical remote prefixes may intentionally provide backup. Networkless platform scopes do not get routes or attachments.

Explain that the LZ Vault does not automatically store inline keys. Studio retains inline keys only in memory and includes them in explicit exports. Existing Vault references must exist before apply. The customer configures peer equipment, traffic permissions and carrier work separately.

## Routing and verification

Assign both automatic VPN tunnel attachments and private circuit attachments through the existing `default_drg_route_tables` selectors. Do not create those attachments again or claim to update DRG-wide future-attachment defaults. Hubs A/B/C keep firewall inspection; Hub E routes directly. External ingress tables reach local networks and do not intentionally provide external transit. Routes do not add firewall allow rules.

Use synthetic secrets in tests and examples. Test all hubs, overlap rejection, both tunnel assignments, rejection of public circuits and their fields, backup prefixes and networked platforms. Run `python3 -m unittest discover -s tests -p 'test_*.py'` and Studio tests/lint/typecheck/build. Studio tests must prove secret stripping on save, cache suppression, masked previews, export passthrough and required re-entry after reload.

Do not modify upstream repositories for this alternative. The pinned RMS facade has incompatible provider constraints; the current supported handoff is Terraform CLI with the orchestrator root. Do not perform OCI plan/apply jobs as part of customer guidance.
