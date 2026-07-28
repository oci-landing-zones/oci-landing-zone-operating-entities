// Every operating entity must contain at least one environment.
// error_contains: config.operating_entities.alpha.environments must have at least one environment
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'al',
      environments: {},
    },
  },
}
