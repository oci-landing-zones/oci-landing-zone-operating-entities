// CIDRs must not use leading-zero octets or prefixes
// error_contains: config.hub.network.vcn must be a canonical IPv4 CIDR
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.00.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
