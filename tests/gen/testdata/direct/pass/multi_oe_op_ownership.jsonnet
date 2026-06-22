// OP01, OP02, and OP03 stack boundaries must not duplicate IAM, network, or observability ownership.
local profiles = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/profiles.libsonnet';
local published = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/published.libsonnet';
local rendered = published.render(profiles.hub_e.config);
local rendered_hub_a = published.render(profiles.hub_a.config);
local op01_text = std.manifestJsonEx(rendered.op01.network_hub_e, '  ');
local alpha_text = std.manifestJsonEx(rendered.op02.oe_alpha.network_hub_e, '  ');
local op01_hub_a_pre_text = std.manifestJsonEx(rendered_hub_a.op01.network_hub_a_pre, '  ');
local op01_hub_a_final_text = std.manifestJsonEx(rendered_hub_a.op01.network_hub_a, '  ');
local alpha_hub_a_text = std.manifestJsonEx(rendered_hub_a.op02.oe_alpha.network_hub_a, '  ');
local op01_iam_text = std.manifestJsonEx(rendered.op01.iam, '  ');
local alpha_iam_text = std.manifestJsonEx(rendered.op02.oe_alpha.iam, '  ');
local alpha_project_iam_text = std.manifestJsonEx(rendered.op03.oe_alpha.prod.proj1.iam, '  ');
local op01_obs_text = std.manifestJsonEx(rendered.op01.observability_cis2, '  ');
local alpha_obs_text = std.manifestJsonEx(rendered.op02.oe_alpha.observability_cis2, '  ');
local op01_security_text = std.manifestJsonEx(rendered.op01.security_cis2, '  ');
local alpha_security_text = std.manifestJsonEx(rendered.op02.oe_alpha.security_cis2, '  ');

{
  op01_has_alpha_project_vcn: std.length(std.findSubstr('VCN-FRA-LZ-OE-ALPHA-PROD-PROJECTS-KEY', op01_text)) > 0,
  op02_oes: std.objectFields(rendered.op02),
  op03_oes: std.objectFields(rendered.op03),
  alpha_has_alpha_project_vcn: std.length(std.findSubstr('VCN-FRA-LZ-OE-ALPHA-PROD-PROJECTS-KEY', alpha_text)) > 0,
  alpha_has_beta_project_vcn: std.length(std.findSubstr('VCN-FRA-LZ-OE-BETA-PROD-PROJECTS-KEY', alpha_text)) > 0,
  alpha_has_beta_route_rule: std.length(std.findSubstr('rr-fra-oe-beta', alpha_text)) > 0,
  op01_hub_a_pre_has_spoke_drg_attachment_ref:
    std.length(std.findSubstr('DRGATT-FRA-LZ-OE-ALPHA-PROD-PROJ-KEY', op01_hub_a_pre_text)) > 0,
  op01_hub_a_pre_has_spoke_cidr_route:
    std.length(std.findSubstr('"destination": "10.0.64.0/21"', op01_hub_a_pre_text)) > 0,
  op01_hub_a_pre_has_spoke_drg_route_table:
    std.length(std.findSubstr('DRGRT-FRA-LZ-SPOKES-KEY', op01_hub_a_pre_text)) > 0,
  op01_hub_a_final_has_spoke_drg_attachment_ref:
    std.length(std.findSubstr('DRGATT-FRA-LZ-OE-ALPHA-PROD-PROJ-KEY', op01_hub_a_final_text)) > 0,
  op01_hub_a_final_uses_spoke_vcn_ocid:
    std.length(std.findSubstr('"attached_resource_id": "<VCN vcn-fra-lz-oe-alpha-prod-projects OCID>"', op01_hub_a_final_text)) > 0,
  op01_hub_a_final_uses_spoke_attached_resource_key:
    std.length(std.findSubstr('"attached_resource_key": "VCN-FRA-LZ-OE-ALPHA-PROD-PROJECTS-KEY"', op01_hub_a_final_text)) > 0,
  op01_hub_a_final_has_spaced_drgatt_name:
    std.length(std.findSubstr('drgatt-fra-lz-oe alpha', op01_hub_a_final_text)) > 0,
  alpha_hub_a_uses_hub_drg_ocid:
    std.length(std.findSubstr('"network_entity_id": "<HUB DRG OCID>"', alpha_hub_a_text)) > 0,
  alpha_hub_a_uses_hub_drg_key:
    std.length(std.findSubstr('"network_entity_key": "DRG-FRA-LZ-HUB-KEY"', alpha_hub_a_text)) > 0,
  alpha_hub_a_vcn_attach_drg:
    std.length(std.findSubstr('"is_attach_drg": true', alpha_hub_a_text)) > 0,
  op01_iam_has_oe_alpha: std.length(std.findSubstr('CMP-LZ-OE-ALPHA-KEY', op01_iam_text)) > 0,
  alpha_iam_has_oe_alpha: std.length(std.findSubstr('CMP-LZ-OE-ALPHA-KEY', alpha_iam_text)) > 0,
  alpha_iam_has_parent_placeholder:
    std.length(std.findSubstr('"default_parent_id": "<Compartment cmp-landingzone OCID>"', alpha_iam_text)) > 0,
  alpha_iam_has_beta: std.length(std.findSubstr('CMP-LZ-OE-BETA-KEY', alpha_iam_text)) > 0,
  alpha_iam_has_project_child: std.length(std.findSubstr('CMP-LZ-OE-ALPHA-PROD-PROJ1-KEY', alpha_iam_text)) > 0,
  alpha_iam_has_project_group: std.length(std.findSubstr('GRP-LZ-OE-ALPHA-PROD-PROJ1-ADMIN-KEY', alpha_iam_text)) > 0,
  alpha_project_iam_has_parent_placeholder:
    std.length(std.findSubstr('"default_parent_id": "<Compartment cmp-lz-oe-alpha-prod-projects OCID>"', alpha_project_iam_text)) > 0,
  op01_obs_has_alpha_flow_log: std.length(std.findSubstr('LOG-LZ-OE-ALPHA-PROD-VCN-FLOW-KEY', op01_obs_text)) > 0,
  alpha_obs_has_alpha_flow_log: std.length(std.findSubstr('LOG-LZ-OE-ALPHA-PROD-VCN-FLOW-KEY', alpha_obs_text)) > 0,
  alpha_obs_has_beta_flow_log: std.length(std.findSubstr('LOG-LZ-OE-BETA-PROD-VCN-FLOW-KEY', alpha_obs_text)) > 0,
  alpha_obs_has_spaced_event_display_name:
    std.length(std.findSubstr('rul-lz-oe alpha', alpha_obs_text)) > 0,
  op01_obs_has_network_topic_object: std.length(std.findSubstr('"NOTT-LZ-NETWORK-KEY": {', op01_obs_text)) > 0,
  alpha_obs_has_network_topic_object: std.length(std.findSubstr('"NOTT-LZ-NETWORK-KEY": {', alpha_obs_text)) > 0,
  alpha_obs_home_region_rule_count: std.length(std.objectFields(rendered.op02.oe_alpha.observability_cis2.home_region_events_configuration.event_rules)),
  op01_security_has_alpha_target: std.length(std.findSubstr('SZ-TGT-LZ-OE-ALPHA-PROD-ENVIRONMENT-KEY', op01_security_text)) > 0,
  alpha_security_has_alpha_target: std.length(std.findSubstr('SZ-TGT-LZ-OE-ALPHA-PROD-ENVIRONMENT-KEY', alpha_security_text)) > 0,
  alpha_security_has_beta_target: std.length(std.findSubstr('SZ-TGT-LZ-OE-BETA-PROD-ENVIRONMENT-KEY', alpha_security_text)) > 0,
  alpha_security_has_cloud_guard: std.objectHas(rendered.op02.oe_alpha.security_cis2, 'cloud_guard_configuration'),
}
