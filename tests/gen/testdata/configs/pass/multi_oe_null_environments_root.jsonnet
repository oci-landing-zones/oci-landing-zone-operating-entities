// A null One-OE root does not conflict with a valid Multi-OE config.
// contains: CMP-LZ-OE-ALPHA-PROD-KEY
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: null,
  operating_entities: {
    oe_alpha: {
      dns: 'oa',
      environments: { prod: {} },
    },
  },
}
