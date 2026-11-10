// Home IAM adds the selected DR Object Storage principal without changing other policies.
// contains: "failures": []
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local baseline = lz(defaults.hub_b).iam.policies_configuration.supplied_policies;
local with_dr = lz(defaults.hub_b + { dr_region: 'eu-amsterdam-1' }).iam.policies_configuration.supplied_policies;
local unchanged = lz(defaults.hub_b + { dr_region: null }).iam.policies_configuration.supplied_policies;
local grant = 'allow service blockstorage, oke, streaming, Fssoc1Prod, objectstorage-eu-frankfurt-1, objectstorage-eu-amsterdam-1 to use keys in tenancy';
local checks = [
  {
    name: 'home IAM does not authorize both regional Object Storage principals',
    ok: std.member(with_dr['PCY-SERVICES-ADMIN-KEY'].statements, grant),
  },
  {
    name: 'DR region changed unrelated IAM policies',
    ok: std.objectFields(with_dr) == std.objectFields(baseline) &&
        std.length([
          key
          for key in std.objectFields(baseline)
          if key != 'PCY-SERVICES-ADMIN-KEY' && baseline[key] != with_dr[key]
        ]) == 0,
  },
  {
    name: 'omitting the DR region changes the normal home grant',
    ok: unchanged == baseline &&
        !std.member(baseline['PCY-SERVICES-ADMIN-KEY'].statements, grant),
  },
];
{
  failures: [check.name for check in checks if !check.ok],
}
