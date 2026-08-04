// CIS1 and CIS2 grant only scoped use of existing capacity reservations to OKE administrators, the OKE service, and node pools.
// contains: "cis1_missing_statements": []
// contains: "cis2_missing_statements": []
// contains: "cis1_forbidden_statements": []
// contains: "cis2_forbidden_statements": []
local lz = import 'gen/landing_zone.libsonnet';

local render(cis_level) =
  local result = lz({
    cis_level: cis_level,
    hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
    environments: {
      prod: {
        platforms: {
          oke: {
            network: { vcn: '10.0.80.0/20' },
            extension: {
              type: 'oke_simple',
              params: {
                kubernetes_version: 'v1.35.2',
                services_cidr: '10.96.0.0/16',
                api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              },
            },
          },
        },
      },
    },
  });
  local policies = result.iam.policies_configuration.supplied_policies;
  {
    admin: policies['PCY-LZ-PROD-PLATFORM-OKE-ADMINS-KEY'].statements,
    compute: policies['PCY-LZ-PROD-PLATFORM-OKE-SERVICE-COMPUTE-KEY'].statements,
  };

local expected = [
  "allow group 'id_lz_common'/'grp-lz-prod-oke-admins' to use compute-capacity-reservations in compartment cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-oke",
  'allow service oke to use compute-capacity-reservations in compartment cmp-lz-prod-oke',
  "allow any-user to use compute-capacity-reservations in compartment cmp-lz-prod-oke where all { request.principal.type = 'nodepool', request.principal.compartment.id = target.compartment.id }",
];

local evaluate(cis_level) =
  local policies = render(cis_level);
  local statements = policies.admin + policies.compute;
  {
    missing_statements: [statement for statement in expected if !std.member(statements, statement)],
    forbidden_statements: [
      statement
      for statement in statements
      if std.length(std.findSubstr('compute-capacity-reservations', statement)) > 0 &&
         (std.length(std.findSubstr(' in tenancy', statement)) > 0 ||
          std.length(std.findSubstr(' to manage compute-capacity-reservations ', statement)) > 0)
    ],
  };

local cis1 = evaluate(1);
local cis2 = evaluate(2);

{
  cis1_missing_statements: cis1.missing_statements,
  cis2_missing_statements: cis2.missing_statements,
  cis1_forbidden_statements: cis1.forbidden_statements,
  cis2_forbidden_statements: cis2.forbidden_statements,
}
