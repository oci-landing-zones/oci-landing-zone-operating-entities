local one_oe = import '../../../../../blueprints/one-oe/runtime/one-stack/oci_open_lz_one-oe_iam.auto.tfvars.json';
local oke_identity = import '../oke_identity.libsonnet';

one_oe + oke_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LANDINGZONE-P-KEY'+: {
        children+: {
          'CMP-LZP-PROD-KEY'+: {
            children+: {
              'CMP-LZP-P-PLATFORM-KEY'+: {
                children+: {
                  'CMP-LZP-P-PLATFORM-OKE-KEY': {
                    name: 'cmp-lzp-p-platform-oke',
                    description: 'Platform compartment for oke Prod related resources',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
