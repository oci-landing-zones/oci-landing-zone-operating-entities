// The legacy shared_project_network field is rejected instead of being ignored.
// error_contains: Environment prod.shared_project_network is not supported; use project_network
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    shared_project_network: { network: { vcn: '10.0.64.0/21' } },
  } },
}
