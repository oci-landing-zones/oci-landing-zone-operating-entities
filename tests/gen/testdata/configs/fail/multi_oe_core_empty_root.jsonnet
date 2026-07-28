// Multi-OE must contain at least one operating entity.
// error_contains: config.operating_entities must have at least one operating entity
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {},
}
