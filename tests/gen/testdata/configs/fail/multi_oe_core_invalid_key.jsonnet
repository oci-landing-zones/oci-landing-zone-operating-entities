// Operating-entity keys use the lower-case public grammar.
// error_contains: config.operating_entities key must match [a-z][a-z0-9_]*: Alpha
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    Alpha: {
      dns: 'al',
      environments: { prod: {} },
    },
  },
}
