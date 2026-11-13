// Published One-OE cost tags and governance for single-apply Tag Default ordering.
local lz = import '../../../../landing_zone.libsonnet';
local cost_governance = import '../../../../lib/cost_governance.libsonnet';
local explicitFlowLogs = import './explicit_flow_logs.libsonnet';
// Published families retain their section defaults without reclassifying resources.
local existingTags(resource, field='defined_tags') =
  if std.objectHas(resource, field) && resource[field] != null then resource[field] else {};
local sectionDefaults(doc, defaults, enabled) =
  if !enabled then doc else {
    [family]: doc[family] + {
      default_defined_tags: defaults + existingTags(doc[family], 'default_defined_tags'),
    }
    for family in std.objectFields(doc)
  };

function(profile) {
  local rendered = lz(profile.config),
  local enabled = !std.objectHas(profile.config, 'cost_governance') ||
    !std.objectHas(profile.config.cost_governance, 'enable_tags') || profile.config.cost_governance.enable_tags,
  local securityTags = rendered.security_cis1.scanning_configuration.default_defined_tags,
  local observabilityTags = rendered.observability_cis1.notifications_configuration.default_defined_tags,
  iam: rendered.iam,
  network: rendered.network,
  network_backends: rendered.network_backends,
  observability_cis1: sectionDefaults(rendered.observability_cis1, observabilityTags, enabled),
  observability_cis1_pre: sectionDefaults(rendered.observability_cis1_pre, observabilityTags, enabled),
  observability_cis2: sectionDefaults(rendered.observability_cis2, observabilityTags, enabled),
  observability_cis2_pre: sectionDefaults(rendered.observability_cis2_pre, observabilityTags, enabled),
  observability_cis1_explicit: explicitFlowLogs(rendered.network, sectionDefaults(rendered.observability_cis1, observabilityTags, enabled)),
  observability_cis2_explicit: explicitFlowLogs(rendered.network, sectionDefaults(rendered.observability_cis2, observabilityTags, enabled)),
  security_cis1: sectionDefaults(rendered.security_cis1, securityTags, enabled),
  security_cis1_pre: sectionDefaults(rendered.security_cis1_pre, securityTags, enabled),
  security_cis2: sectionDefaults(rendered.security_cis2, securityTags, enabled),
  security_cis2_pre: sectionDefaults(rendered.security_cis2_pre, securityTags, enabled),
  governance: cost_governance.apply(rendered.governance, cost_governance.normalize(
    if std.objectHas(profile.config, 'cost_governance') then profile.config.cost_governance else {},
    projects=cost_governance.project_names(profile.config)
  ), projects=cost_governance.project_names(profile.config)),
}
