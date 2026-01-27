local sec = import '../../../blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet';

sec + {
  security_zones_configuration+: {
    security_zones+: {
      'SZ-TGT-OKE-PLATFORM-KEY': {
        name: 'sz-tgt-oke-platform',
        compartment_id: 'CMP-LZ-PROD-PLATFORM-OKE-KEY',
        recipe_key: 'SZ-RCP-LZ-05-WORKLOAD-KEY',
      },
    },
  },
}
