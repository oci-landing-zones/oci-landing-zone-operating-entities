// Project subnet routing accepts only the documented vcn and hub modes.
// error_contains: Environment prod.project_network.subnet_routing must be one of: vcn, hub
{
  hub: { kind: 'hub_b', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: {
      subnet_routing: 'direct',
      network: { vcn: '10.0.64.0/21' },
    },
  } },
}
