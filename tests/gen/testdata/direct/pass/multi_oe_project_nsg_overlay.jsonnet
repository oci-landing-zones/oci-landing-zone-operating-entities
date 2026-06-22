// OP03 project network must inject project NSGs into an existing OE VCN instead of recreating the VCN.
local profiles = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/profiles.libsonnet';
local published = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/published.libsonnet';
local rendered = published.render(profiles.hub_e.config);
local alpha_network = rendered.op03.oe_alpha.prod.proj1.network;
local alpha_text = std.manifestJsonEx(alpha_network, '  ');

{
  op03_oes: std.objectFields(rendered.op03),
  alpha_roots: std.objectFields(alpha_network.network_configuration.network_configuration_categories['oe-alpha-prod-proj1']),
  alpha_has_existing_vcn_injection: std.length(std.findSubstr('inject_into_existing_vcns', alpha_text)) > 0,
  alpha_has_vcns_root: std.length(std.findSubstr('"vcns"', alpha_text)) > 0,
  alpha_has_project_web_nsg: std.length(std.findSubstr('NSG-FRA-LZ-OE-ALPHA-PROD-PROJ1-WEB-KEY', alpha_text)) > 0,
  alpha_has_beta_nsg: std.length(std.findSubstr('NSG-FRA-LZ-OE-BETA-PROD-PROJ1-WEB-KEY', alpha_text)) > 0,
}
