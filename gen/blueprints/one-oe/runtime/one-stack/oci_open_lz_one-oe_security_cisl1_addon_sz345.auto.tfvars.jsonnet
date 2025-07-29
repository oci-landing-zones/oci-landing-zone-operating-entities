local cis1 = import 'oci_open_lz_one-oe_security_cisl1.auto.tfvars.jsonnet';

cis1 {
  security_zones_configuration+: {
    security_zones+: {
      'sz-tgt-lzp-shared_network-key': {
        name: 'sz-tgt-lzp-shared-network',
        compartment_id: 'CMP-LZP-NETWORK-KEY',
        recipe_key: 'SZ-RCP-LZP-03-SHARED-NETWORK-KEY',
      },
      'sz-tgt-lzp-p-shared-network-key': {
        name: 'sz-tgt-lzp-environment-network',
        compartment_id: 'CMP-LZP-P-NETWORK-KEY',
        recipe_key: 'SZ-RCP-LZP-04-ENV-NETWORK-KEY',
      },
      'sz-tgt-lzp-p-proj1-key': {
        name: 'sz-tgt-lzp-proj1',
        compartment_id: 'CMP-LZP-P-PROJ1-KEY',
        recipe_key: 'SZ-RCP-LZP-05-WORKLOADS-KEY',
      },
    },
  },
}
