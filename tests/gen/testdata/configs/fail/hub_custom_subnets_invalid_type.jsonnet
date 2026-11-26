// Reject invalid custom hub subnet definitions.
// error_contains: must be an object
{ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21', custom_subnets: [] } } }
