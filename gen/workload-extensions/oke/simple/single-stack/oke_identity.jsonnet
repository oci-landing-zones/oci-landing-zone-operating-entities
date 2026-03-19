local one_oe = import '../../../../../blueprints/one-oe/runtime/one-stack/oneoe_iam.json';
local oke_identity = import '../oke_identity.libsonnet';

one_oe + oke_identity + {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LANDINGZONE-KEY'+: {
        children+: {
          'CMP-LZ-PROD-KEY'+: {
            children+: {
              'CMP-LZ-PROD-PLATFORM-KEY'+: {
                children+: {
                  'CMP-LZ-PROD-PLATFORM-OKE-KEY': {
                    name: 'cmp-lz-prod-platform-oke',
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
