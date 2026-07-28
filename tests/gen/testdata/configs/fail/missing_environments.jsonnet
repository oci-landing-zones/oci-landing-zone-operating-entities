// config without either supported environment root is rejected
// error_contains: config must define environments or operating_entities
{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: null,
  operating_entities: null,
}
