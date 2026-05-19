// Shared human-readable description helpers for generated IAM resources.
local labels = import './labels.libsonnet';

{
  scope: {
    environment(env_desc):: 'the %s environment' % env_desc,

    project_compartment(env_desc, project_name)::
      'the %s compartment in the %s environment' % [
        labels.project_display(project_name),
        env_desc,
      ],

    project_db_compartment(env_desc, project_name)::
      'the %s database compartment in the %s environment' % [
        labels.project_display(project_name),
        env_desc,
      ],

    environment_compartment(env_desc, compartment_name)::
      'the %s environment %s compartment' % [env_desc, compartment_name],
  },

  group: {
    tenancy(role):: 'Tenancy-scoped %s access group.' % role,

    landing_zone(scope, role)::
      'Landing Zone %s %s access group.' % [scope, role],

    project(env_desc, project_name, role)::
      'Landing Zone %s environment, %s %s access group.' % [
        env_desc,
        labels.project_display(project_name),
        role,
      ],

    platform(env_desc, platform_name, role)::
      'Landing Zone %s environment %s platform %s access group.' % [
        env_desc,
        platform_name,
        role,
      ],

    product_global(product_name, role)::
      'Landing Zone global %s %s access group.' % [product_name, role],

    product_project(env_desc, project_name, product_name, role)::
      'Landing Zone %s environment, %s %s %s access group.' % [
        env_desc,
        labels.project_display(project_name),
        product_name,
        role,
      ],
  },

  policy: {
    grants(subject, capability, scope)::
      'Grants %s %s in %s.' % [subject, capability, scope],

    unsafe_grants(subject, capability)::
      'Unsafe: grants %s %s.' % [subject, capability],
  },
}
