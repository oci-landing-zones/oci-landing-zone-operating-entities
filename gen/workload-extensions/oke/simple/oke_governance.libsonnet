// OKE-owned tag namespace used for platform isolation.

local contract = import './oke_public_load_balancer.libsonnet';

{
  tags_configuration+: {
    namespaces+: {
      'TAGNS-LZ-OKE-KEY': {
        name: contract.tag_namespace,
        description: 'Landing Zone-owned tag that isolates OKE platforms.',
        is_retired: false,

        tags: {
          'TAG-LZ-OKE-PLATFORM-KEY': {
            name: 'platform',
            description: 'Identifies the owning OKE platform for principal-to-resource tag matching.',
            is_cost_tracking: false,
            is_retired: false,
          },
        },
      },
    },
  },
}
