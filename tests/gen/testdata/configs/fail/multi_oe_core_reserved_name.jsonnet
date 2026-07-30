// Operating-entity keys cannot occupy fixed shared or root compartment names.
// error_contains: config.operating_entities.shared uses reserved normalized name "shared"
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    shared: {
      dns: 'sh',
      environments: { prod: {} },
    },
  },
}
