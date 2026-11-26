// Reject invalid custom hub subnet definitions.
// error_contains: contains overlapping CIDRs
{ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21', custom_subnets: { tools: '10.0.1.0/24' } } } }
