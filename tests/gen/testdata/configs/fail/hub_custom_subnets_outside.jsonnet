// Reject invalid custom hub subnet definitions.
// error_contains: must be contained by
{ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21', custom_subnets: { tools: '10.99.0.0/24' } } } }
