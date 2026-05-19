// preprod security-zone targets include environment network, project, and oke platform compartments
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    preprod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/21' },
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
{
  security_targets: std.sort([
    key
    for key in std.objectFields(outputs['security_cis1.json'].security_zones_configuration.security_zones)
    if std.length(std.findSubstr('PREPROD', key)) > 0
  ]),
}
