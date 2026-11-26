// Reject unsupported Security Zone Recipe 01 CIS choices.
// error_contains: config.security_zone_recipe1_cis_level must be 1 or 2
{ hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } }, security_zone_recipe1_cis_level: 3 }
