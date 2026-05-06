local labels = import '../../labels.libsonnet';

{
  product:: 'ExaDB-C@C',

  platform_compartment(scope)::
    '%s Platform %s Compartment' % [scope.scope_long_title, self.product],

  platform_child_compartment(scope, child)::
    '%s Platform %s %s Compartment' % [
      scope.scope_long_title,
      self.product,
      child,
    ],

  project_db_compartment(scope, project_name)::
    '%s environment, %s %s database compartment' % [
      scope.scope_long_title,
      labels.project_display(project_name),
      self.product,
    ],

  global_db_group:: 'Global ExaDB-C@C database administration group.',

  global_infra_group:: 'Global ExaDB-C@C infrastructure administration group.',

  project_group(scope, project_name)::
    'Dedicated team to manage the %s database layer in %s, %s environment.' % [
      self.product,
      labels.project_display(project_name),
      scope.scope_long_title,
    ],

  global_infra_policy::
    'Allow grp-lz-global-exacc-infra-admin group users to manage ExaDB-C@C infrastructure in all ExaDB-C@C infrastructure compartments.',

  global_db_policy::
    'Allow grp-lz-global-exacc-db-admin group users to manage databases in all ExaDB-C@C database compartments.',

  global_generic_policy::
    'Allow grp-lz-global-exacc-infra-admin and grp-lz-global-exacc-db-admin group users to use shared ExaDB-C@C administration services.',

  project_policy(scope, project_name)::
    'Allow grp-lz-%s-%s-exacc-admin group users to manage the %s Autonomous Database layer in %s.' % [
      std.asciiLower(scope.scope_name),
      std.asciiLower(project_name),
      self.product,
      labels.project_display(project_name),
    ],

  shared_db_topic:: 'Topic for shared ExaDB-C@C database workload notifications.',

  shared_infra_topic:: 'Topic for shared ExaDB-C@C infrastructure workload notifications.',

  project_topic(scope):: 'Topic for %s ExaDB-C@C project notifications.' % scope.scope_long_title,
}
