local base = {
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  realm: 'oc1',
  environments: {
    prod: {
      shared_project_network: {
        network: {
          vcn: '10.0.200.0/21',
        },
      },
      projects: {
        proj1: {},
      },
    },
  },
};

{
  hub_a: base {
    hub: {
      kind: 'hub_a',
      network: {
        vcn: '10.0.192.0/21',
      },
    },
  },
  hub_b: base {
    hub: {
      kind: 'hub_b',
      network: {
        vcn: '10.0.192.0/21',
      },
    },
  },
  hub_c: base {
    hub: {
      kind: 'hub_c',
      network: {
        vcn: '10.0.192.0/21',
      },
    },
  },
  hub_e: base {
    hub: {
      kind: 'hub_e',
      network: {
        vcn: '10.0.192.0/21',
      },
    },
  },
}
