// ZPR permissions follow configured projects and retain tag-scoped policy management.
// contains: "verified": true
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local config = defaults.hub_e + {
  environments: {
    dev: { projects: { payments: {}, orders: {} } },
    test: {},
  },
  security_targets: ['dev'],
};
local policies = lz(config).iam.policies_configuration.supplied_policies;
local generic = policies['PCY-GENERIC-ADMIN-KEY'].statements;
local security = policies['PCY-LZ-SECURITY-ADMIN-KEY'].statements;
local tenancy = policies['PCY-SECURITY-ADMIN-KEY'].statements;
local expected_attribute_use = "allow group 'id_lz_common'/'grp-lz-network-admin', 'id_lz_common'/'grp-lz-dev-orders-admin', 'id_lz_common'/'grp-lz-dev-payments-admin' to use security-attribute-namespace in compartment cmp-landingzone";
local no_projects = lz(defaults.hub_e + { environments: {}, security_targets: [] }).iam.policies_configuration.supplied_policies;

assert std.member(generic, expected_attribute_use) : 'Attribute use must follow configured project groups';
assert std.member(no_projects['PCY-GENERIC-ADMIN-KEY'].statements, "allow group 'id_lz_common'/'grp-lz-network-admin' to use security-attribute-namespace in compartment cmp-landingzone") : 'No-project landing zones must grant attribute use to the network group';
assert std.member(security, "allow group 'id_lz_common'/'grp-lz-security-admin' to read all-resources in compartment cmp-landingzone") : 'LZ security administrators must read the whole Landing Zone';
assert std.member(tenancy, "allow group 'id_lz_common'/'grp-lz-security-admin' to read security-attribute-namespace in tenancy") : 'LZ security administrators must read tenancy security attributes';
assert std.member(tenancy, "allow group 'id_lz_common'/'grp-lz-security-admin' to manage zpr-policy in tenancy where target.resource.tag.tagns-lz-role.tag-lz-role='oneoe-lz'") : 'LZ ZPR policy management must retain its resource tag restriction';
assert !std.member(tenancy, "allow group 'id_lz_common'/'grp-lz-security-admin' to manage zpr-policy in tenancy") : 'LZ security administrators must not gain unrestricted tenancy ZPR policy management';
assert std.length(tenancy) == std.length(std.set(tenancy)) : 'Tenancy security policy must not contain duplicate statements';
{ verified: true }
