// London Hub E DR configuration with one exact RPC advertisement.
{
  region: 'uk-london-1',
  region_short_name: 'lhr',
  realm: 'oc1',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.1.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: {
        network: { vcn: '10.1.64.0/21' },
      },
      projects: { proj1: {} },
    },
  },
  disaster_recovery: {
    rpc: { advertised_cidrs: ['10.1.64.0/21'] },
  },
}
