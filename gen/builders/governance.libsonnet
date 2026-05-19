// gen/builders/governance.libsonnet
// Governance builder: tag namespaces and tag definitions.
//
// Generates the same structure as blueprints/one-oe/runtime/one-stack/oneoe_governance.json.
// This is static — no per-env iteration needed.
//
// function(config, n) → governance output object

function(config, n)
{
  tags_configuration: {
    default_compartment_id: 'TENANCY-ROOT',

    namespaces: {
      [n.key_global('TAGNS', ['ROLE'])]: {
        name: n.display_global('tagns', ['role']),
        description: 'Tag namespace for Tag Based Access Controls of Landing Zone Roles.',
        is_retired: false,

        tags: {
          [n.key_global('TAG', ['ROLE'])]: {
            name: n.display_global('tag', ['role']),
            description: 'Tag used to identify different administrative roles within the Landing Zone, across network and security compartments',
            is_cost_tracking: false,
            is_retired: false,
          },
        },
      },
    },
  },
}
