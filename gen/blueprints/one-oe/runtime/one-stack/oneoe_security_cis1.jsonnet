local cis1 = import 'oneoe_security_cis1_pre.jsonnet';

cis1 {
  security_zones_configuration+: {
    security_zones+: {
      'SZ-TGT-LZ-SHARED-NETWORK-KEY': {
        name: 'sz-tgt-lz-shared-network',
        compartment_id: 'CMP-LZ-NETWORK-KEY',
        recipe_key: 'SZ-RCP-LZ-03-SHARED-NETWORK-KEY',
      },
      'SZ-TGT-LZ-PROD-ENVIRONMENT-NETWORK-KEY': {
        name: 'sz-tgt-lz-prod-environment-network',
        compartment_id: 'CMP-LZ-PROD-NETWORK-KEY',
        recipe_key: 'SZ-RCP-LZ-04-ENVIRONMENT-NETWORK-KEY',
      },
      'SZ-TGT-LZ-PROD-PROJ1-KEY': {
        name: 'sz-tgt-lz-prod-proj1',
        compartment_id: 'CMP-LZ-PROD-PROJ1-KEY',
        recipe_key: 'SZ-RCP-LZ-05-WORKLOAD-KEY',
      },
    },
  },
}
