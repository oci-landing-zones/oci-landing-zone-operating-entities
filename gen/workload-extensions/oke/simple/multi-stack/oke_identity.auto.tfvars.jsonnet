local oke_identity = import '../oke_identity.libsonnet';

oke_identity {
  compartments_configuration+: {
    enable_delete: 'true',

    compartments+: {
      'CMP-LZP-P-PLATFORM-OKE-KEY': {
        name: 'cmp-lzp-p-platform-oke',
        description: 'Platform compartment for oke Prod related resources',
        parent_id: 'CMP-LZP-P-PLATFORM-KEY',
      },
    },
  },
}
