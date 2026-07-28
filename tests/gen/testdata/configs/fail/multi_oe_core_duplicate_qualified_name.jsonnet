// Normalized operating-entity and environment segments must not collide.
// error_contains: config.operating_entities generates duplicate qualified environment names: alpha-beta-prod
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'aa',
      environments: {
        'beta-prod': {},
      },
    },
    alpha_beta: {
      dns: 'bb',
      environments: {
        prod: {},
      },
    },
  },
}
