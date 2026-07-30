// Operating-entity DNS labels must be unique.
// error_contains: config.operating_entities dns values must be unique: aa
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
      dns: 'aa',
      environments: {
        prod: {},
      },
    },
  },
}
