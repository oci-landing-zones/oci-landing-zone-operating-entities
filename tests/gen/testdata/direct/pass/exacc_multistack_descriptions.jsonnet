// ExaCC multi-stack publication adapter uses the same standardized descriptions as config rendering
// contains: Shared Platform ExaDB-C@C Compartment
// contains: Production Platform ExaDB-C@C Database Compartment
// contains: Pre-Production environment, Project 1 ExaDB-C@C database compartment
// contains: Topic for shared ExaDB-C@C database workload notifications.
// contains: Topic for Production ExaDB-C@C project notifications.
local profiles = import 'gen/workload-extensions/exacc/published_profiles.libsonnet';
local published = import 'gen/workload-extensions/exacc/multi-stack/published.libsonnet';

local rendered = published.render(profiles.hub_e_prod_preprod_exacc_config);

std.manifestJsonEx({
  shared_platform_description: rendered.identity.compartments_configuration.compartments['CMP-LZ-SHARED-EXACC-KEY'].description,
  prod_platform_db_description: rendered.identity.compartments_configuration.compartments['CMP-LZ-PROD-EXACC-KEY'].children['CMP-LZ-PROD-EXACC-DB-KEY'].description,
  preprod_project_db_description: rendered.identity.compartments_configuration.compartments['CMP-LZ-PREPROD-PROJ1-DB-KEY'].description,
  db_topic_description: rendered.observability.notifications_configuration.topics['NOTT-LZ-EXACC-DB-WORKLOADS-KEY'].description,
  prod_topic_description: rendered.observability.notifications_configuration.topics['NOTT-LZ-PROD-EXACC-PROJECTS-KEY'].description,
}, '  ')
