// Multi-OE and legacy One-OE environment roots are mutually exclusive.
// error_contains: config cannot define both environments and operating_entities
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {},
  },
  operating_entities: {
    alpha: {
      dns: 'aa',
      environments: {
        prod: {},
      },
    },
  },
}
