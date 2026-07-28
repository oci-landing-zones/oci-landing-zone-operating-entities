// Multi-OE security targets must use fully qualified environment names.
// error_contains: config.security_targets must only reference defined qualified environments: prod
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'aa',
      environments: {
        prod: {},
      },
    },
    beta: {
      dns: 'bb',
      environments: {
        prod: {},
      },
    },
  },
  security_targets: ['prod'],
}
