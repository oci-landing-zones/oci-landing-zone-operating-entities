local labels = import '../../labels.libsonnet';

{
  product:: 'ExaDB-D',

  platform_compartment(scope)::
    '%s Platform %s Compartment' % [scope.scope_long_title, self.product],

  platform_child_compartment(scope, child)::
    '%s Platform %s %s Compartment' % [scope.scope_long_title, self.product, child],

  project_db_compartment(scope, project_name)::
    '%s environment, %s %s database compartment' % [scope.scope_long_title, labels.project_display(project_name), self.product],

  global_db_group:: 'Global ExaDB-D database administration group.',
  global_infra_group:: 'Global ExaDB-D infrastructure administration group.',

  project_group(scope, project_name)::
    'Dedicated team to manage the %s database layer in %s, %s environment.' % [self.product, labels.project_display(project_name), scope.scope_long_title],

  global_infra_policy::
    'Allow grp-lz-global-exacs-infra-admin group users to manage ExaDB-D infrastructure in all ExaDB-D infrastructure compartments.',

  global_db_policy::
    'Allow grp-lz-global-exacs-db-admin group users to manage databases in all ExaDB-D database compartments.',

  global_generic_policy::
    'Allow grp-lz-global-exacs-infra-admin and grp-lz-global-exacs-db-admin group users to use shared ExaDB-D administration services.',

  project_policy(scope, project_name)::
    'Allow grp-lz-%s-%s-exacs-admin group users to manage the %s Autonomous Database layer in %s.' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name), self.product, labels.project_display(project_name)],

  shared_db_topic:: 'Topic for shared ExaDB-D database workload notifications.',
  shared_infra_topic:: 'Topic for shared ExaDB-D infrastructure workload notifications.',
  project_topic(scope):: 'Topic for %s ExaDB-D project notifications.' % scope.scope_long_title,
}
