// Reject invalid custom hub subnet definitions.
// error_contains: reserved subnet name
{ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21', custom_subnets: { mgmt: '10.0.6.0/24' } } } }
