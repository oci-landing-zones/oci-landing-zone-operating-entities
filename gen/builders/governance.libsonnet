// gen/builders/governance.libsonnet
// Governance builder: tag namespaces and tag definitions.
//
// Generates the same structure as blueprints/one-oe/runtime/one-stack/oneoe_governance.json.
// Workload-extension namespaces are contributed by their owning extensions.
//
// function(config, n) → governance output object

function(config, n)
{
  tags_configuration: {
    default_compartment_id: 'TENANCY-ROOT',

    namespaces: {
      [n.key_global('TAGNS', ['COST', 'GOVERNANCE'])]: {
        name: n.display_global('tagns', ['cost', 'governance']),
        description: 'Cost governance tags for FinOps reporting.',
        is_retired: false,

        tags: {
          [n.key_global('TAG', ['COST', 'CENTER'])]: {
            name: n.display_global('tag', ['cost', 'center']),
            description: 'Cost center responsible for the resource.',
            is_cost_tracking: false,
            is_retired: false,
            valid_values: ['none', 'CC12345'],
          },
          [n.key_global('TAG', ['PLATFORM'])]: {
            name: n.display_global('tag', ['platform']),
            description: 'Platform associated with the resource.',
            is_cost_tracking: false,
            is_retired: false,
            valid_values: ['none', 'network', 'security', 'observability', 'oke', 'ocvs', 'exacs', 'exacc', 'ebs', 'hpc', 'finops', 'ai-services'],
          },
          [n.key_global('TAG', ['ENVIRONMENT'])]: {
            name: n.display_global('tag', ['environment']),
            description: 'Deployment environment associated with the resource.',
            is_cost_tracking: false,
            is_retired: false,
            valid_values: std.set(['none', 'shared', 'prod', 'preprod', 'dev', 'uat', 'staging', 'test'] + std.objectFields(config.environments)),
          },
          [n.key_global('TAG', ['OWNER'])]: {
            name: n.display_global('tag', ['owner']),
            description: 'Person or team accountable for the resource.',
            is_cost_tracking: false,
            is_retired: false,
            valid_values: ['none', 'email.address@example.com'],
          },
          [n.key_global('TAG', ['BUSINESS', 'UNIT'])]: {
            name: n.display_global('tag', ['business', 'unit']),
            description: 'Business unit responsible for the resource.',
            is_cost_tracking: false,
            is_retired: false,
            valid_values: ['none', 'IT', 'Finance', 'Digital', 'Retail'],
          },
          [n.key_global('TAG', ['PROJECT'])]: {
            name: n.display_global('tag', ['project']),
            description: 'Project associated with the resource.',
            is_cost_tracking: false,
            is_retired: false,
            valid_values: std.set(['none', 'proj1', 'proj2'] + std.flattenArrays([
              std.objectFields(config.environments[env].projects)
              for env in std.objectFields(config.environments)
              if std.objectHas(config.environments[env], 'projects')
            ])),
          },
        },
      },
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
