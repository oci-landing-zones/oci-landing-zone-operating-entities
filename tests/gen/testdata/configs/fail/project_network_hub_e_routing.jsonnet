// Hub routing requires a firewall-capable hub.
// error_contains: Environment prod.project_network.subnet_routing hub is not supported with hub_e
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: { subnet_routing: 'hub', network: { vcn: '10.0.64.0/21' } },
  } },
}
