// Every operating entity requires its own DNS identifier.
// error_contains: config.operating_entities.alpha.dns is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      environments: { prod: {} },
    },
  },
}
