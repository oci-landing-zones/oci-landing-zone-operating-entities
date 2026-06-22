// OP03 project IAM must be scoped to exactly one OE, one environment, and one project.
local profiles = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/profiles.libsonnet';
local published = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/published.libsonnet';
local rendered = published.render(profiles.hub_e.config);
local alpha_prod_iam = rendered.op03.oe_alpha.prod.proj1.iam;
local alpha_prod_text = std.manifestJsonEx(alpha_prod_iam, '  ');

{
  has_project_compartment: std.length(std.findSubstr('"CMP-LZ-OE-ALPHA-PROD-PROJ1-KEY": {', alpha_prod_text)) > 0,
  has_projects_parent_as_managed_compartment: std.length(std.findSubstr('"CMP-LZ-OE-ALPHA-PROD-PROJECTS-KEY": {', alpha_prod_text)) > 0,
  has_preprod_project_compartment: std.length(std.findSubstr('CMP-LZ-OE-ALPHA-PREPROD-PROJ1-KEY', alpha_prod_text)) > 0,
  has_beta_project_compartment: std.length(std.findSubstr('CMP-LZ-OE-BETA-PROD-PROJ1-KEY', alpha_prod_text)) > 0,
  has_project_group: std.length(std.findSubstr('GRP-LZ-OE-ALPHA-PROD-PROJ1-ADMIN-KEY', alpha_prod_text)) > 0,
  has_preprod_project_group: std.length(std.findSubstr('GRP-LZ-OE-ALPHA-PREPROD-PROJ1-ADMIN-KEY', alpha_prod_text)) > 0,
  has_beta_project_group: std.length(std.findSubstr('GRP-LZ-OE-BETA-PROD-PROJ1-ADMIN-KEY', alpha_prod_text)) > 0,
}
