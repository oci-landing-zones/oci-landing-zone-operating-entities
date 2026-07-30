// Operating-entity DNS identifiers are exactly two lowercase letters.
// error_contains: config.operating_entities.alpha.dns must be exactly two lowercase letters
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      dns: 'AL',
      environments: { prod: {} },
    },
  },
}
