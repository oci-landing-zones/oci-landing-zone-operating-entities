// Hub VCN CIDR must be canonical IPv4 CIDR
// error_contains: config.hub.network.vcn must be a canonical IPv4 CIDR
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.1/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
    },
  },
}
