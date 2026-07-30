// A null Multi-OE root does not displace an otherwise valid One-OE config.
// contains: CMP-LZ-PROD-KEY
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  operating_entities: null,
}
