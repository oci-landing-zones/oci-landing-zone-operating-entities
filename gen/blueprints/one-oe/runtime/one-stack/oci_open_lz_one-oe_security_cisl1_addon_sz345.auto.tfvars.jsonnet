local cis1 = import 'oci_open_lz_one-oe_security_cisl1.auto.tfvars.jsonnet';

cis1 {
  security_zones_configuration+: {
    security_zones+: {
      'SZ-TGT-LZP-SHARED_NETWORK-KEY': {
        name: 'sz-tgt-lzp-shared-network',
        compartment_id: 'CMP-LZP-NETWORK-KEY',
        recipe_key: 'SZ-RCP-LZP-03-SHARED-NETWORK-KEY',
      },
      'SZ-TGT-LZP-P-SHARED-NETWORK-KEY': {
        name: 'sz-tgt-lzp-environment-network',
        compartment_id: 'CMP-LZP-P-NETWORK-KEY',
        recipe_key: 'SZ-RCP-LZP-04-ENV-NETWORK-KEY',
      },
      'SZ-TGT-LZP-P-PROJ1-KEY': {
        name: 'sz-tgt-lzp-proj1',
        compartment_id: 'CMP-LZP-P-PROJ1-KEY',
        recipe_key: 'SZ-RCP-LZP-05-WORKLOADS-KEY',
      },
    },
  },
}

