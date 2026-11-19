// Reject invalid custom hub subnet definitions.
// error_contains: custom subnet names must use
{ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21', custom_subnets: { 'Bad Name': '10.0.6.0/24' } } } }
