// Bastion allowlist entries use canonical IPv4 CIDRs.
// error_contains: config.bastion.client_cidr_block_allow_list[0] must be a canonical IPv4 CIDR
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: { client_cidr_block_allow_list: ['203.0.113.10/24'] },
})
