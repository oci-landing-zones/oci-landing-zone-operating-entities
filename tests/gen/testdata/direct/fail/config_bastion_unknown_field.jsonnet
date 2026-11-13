// Session and destination settings do not belong to persistent Bastion input.
// error_contains: config.bastion contains unsupported keys: session_type
(import 'gen/config.libsonnet').normalize({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  bastion: { client_cidr_block_allow_list: ['203.0.113.10/32'], session_type: 'MANAGED_SSH' },
})
