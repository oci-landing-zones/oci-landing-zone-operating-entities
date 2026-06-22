// Multi-OE observability must reference OE-qualified environment compartments.
local lz = import 'gen/landing_zone.libsonnet';
local profiles = import 'gen/blueprints/multi-oe/generic/runtime/profiles.libsonnet';
local rendered = lz(profiles.hub_e.config);
local text = std.manifestJsonEx(rendered.observability_cis2, '  ');

{
  has_alpha_prod_security: std.length(std.findSubstr('CMP-LZ-OE-ALPHA-PROD-SECURITY-KEY', text)) > 0,
  has_beta_prod_security: std.length(std.findSubstr('CMP-LZ-OE-BETA-PROD-SECURITY-KEY', text)) > 0,
  has_unqualified_prod_security: std.length(std.findSubstr('CMP-LZ-PROD-SECURITY-KEY', text)) > 0,
  has_unqualified_preprod_security: std.length(std.findSubstr('CMP-LZ-PREPROD-SECURITY-KEY', text)) > 0,
}
