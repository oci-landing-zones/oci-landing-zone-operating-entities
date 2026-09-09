local labels = import '../../labels.libsonnet';
local desc = import '../../descriptions.libsonnet';

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

  global_db_group:: desc.group.product_global(self.product, 'database administration'),

  global_infra_group:: desc.group.product_global(self.product, 'infrastructure administration'),

  environment_db_group(scope)::
    desc.group.platform(scope.scope_long_title, self.product, 'database administration'),

  environment_infra_group(scope)::
    desc.group.platform(scope.scope_long_title, self.product, 'infrastructure administration'),

  project_group(scope, project_name)::
    desc.group.product_project(scope.scope_long_title, project_name, self.product, 'database administration'),

  global_infra_policy::
    desc.policy.grants(
      'grp-lz-global-exacc-infra-admin',
      '%s infrastructure administration access' % self.product,
      'Landing Zone %s infrastructure compartments' % self.product
    ),

  global_db_policy::
    desc.policy.grants(
      'grp-lz-global-exacc-db-admin',
      '%s database administration access' % self.product,
      'Landing Zone %s database compartments' % self.product
    ),

  global_generic_policy::
    desc.policy.grants(
      'grp-lz-global-exacc-infra-admin and grp-lz-global-exacc-db-admin',
      'shared %s administration service access' % self.product,
      'the tenancy and Landing Zone'
    ),

  environment_infra_policy(scope)::
    desc.policy.grants(
      'grp-lz-%s-exacc-infra-admin' % std.asciiLower(scope.scope_name),
      '%s infrastructure administration access' % self.product,
      'the %s environment %s platform scope' % [scope.scope_long_title, self.product]
    ),

  environment_db_policy(scope)::
    desc.policy.grants(
      'grp-lz-%s-exacc-db-admin' % std.asciiLower(scope.scope_name),
      '%s database administration access' % self.product,
      'the %s environment %s platform scope' % [scope.scope_long_title, self.product]
    ),

  environment_generic_policy(scope)::
    desc.policy.grants(
      'the %s environment %s administration groups' % [scope.scope_long_title, self.product],
      'shared administration service access',
      'the %s environment' % scope.scope_long_title
    ),

  project_policy(scope, project_name)::
    desc.policy.grants(
      'grp-lz-%s-%s-exacc-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)],
      '%s Autonomous Database administration access' % self.product,
      desc.scope.project_db_compartment(scope.scope_long_title, project_name)
    ),

  shared_db_topic:: 'Topic for shared ExaDB-C@C database workload notifications.',

  shared_infra_topic:: 'Topic for shared ExaDB-C@C infrastructure workload notifications.',

  project_topic(scope):: 'Topic for %s ExaDB-C@C project notifications.' % scope.scope_long_title,
}
