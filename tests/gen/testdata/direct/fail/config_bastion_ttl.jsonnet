// Session lifetime is an integer number of seconds in the service range.
// error_contains: config.bastion.max_session_ttl_in_seconds must be an integer between 1800 and 10800
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: { client_cidr_block_allow_list: ['203.0.113.10/32'], max_session_ttl_in_seconds: 1800.5 },
})
