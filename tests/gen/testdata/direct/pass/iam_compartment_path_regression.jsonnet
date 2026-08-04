// IAM policy compartment paths keep One-OE leaf statements and rooted platform statements
// contains: "oke_platform_admin_uses_rooted_path": true
// contains: "oke_rbac_uses_rooted_path": true
// contains: "one_oe_project_policy_uses_leaf_name": true
// contains: "one_oe_network_policy_uses_leaf_name": true
local one = import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_iam.jsonnet';
local oke = import 'gen/workload-extensions/oke/simple/single-stack/oke_identity.jsonnet';

local one_prod_project =
  one.policies_configuration.supplied_policies['PCY-LZ-PROD-PROJ1-ADMIN-KEY'].statements;
local one_prod_network =
  one.policies_configuration.supplied_policies['PCY-LZ-PROD-PROJ1-ADMIN-NET-KEY'].statements;
local oke_admin =
  oke.policies_configuration.supplied_policies['PCY-LZ-PROD-PLATFORM-OKE-ADMINS-KEY'].statements;
local oke_rbac =
  oke.policies_configuration.supplied_policies['PCY-LZ-PROD-PLATFORM-OKE-RBAC-ROLE-KEY'].statements;

{
  oke_platform_admin_uses_rooted_path:
    std.length(std.findSubstr(
      'cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-oke',
      oke_admin[0]
    )) > 0,
  oke_rbac_uses_rooted_path:
    std.length(std.findSubstr(
      'cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-oke',
      oke_rbac[0]
    )) > 0,
  one_oe_project_policy_uses_leaf_name:
    std.length(std.findSubstr('in compartment cmp-lz-prod-proj1', one_prod_project[0])) > 0
    && std.length(std.findSubstr('cmp-lz-prod:cmp-lz-prod-projects', one_prod_project[0])) == 0,
  one_oe_network_policy_uses_leaf_name:
    std.length(std.findSubstr('in compartment cmp-lz-prod-network', one_prod_network[0])) > 0
    && std.length(std.findSubstr('cmp-lz-prod:cmp-lz-prod-network', one_prod_network[0])) == 0,
}
