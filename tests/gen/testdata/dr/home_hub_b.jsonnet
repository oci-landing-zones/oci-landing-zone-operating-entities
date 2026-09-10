// Frankfurt Hub B home configuration with exact RPC advertisements.
(import 'gen/defaults.libsonnet').hub_b + {
  disaster_recovery: {
    rpc: {
      advertised_cidrs: [
        '10.0.0.0/21',
        '10.0.64.0/21',
        '10.0.128.0/21',
      ],
    },
  },
}
