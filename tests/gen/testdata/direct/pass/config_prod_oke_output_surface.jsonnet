// config-mode prod OKE emits generic landing-zone files plus OKE cluster and worker outputs, without separate split-output files
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.72.0/21' } },
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
local unexpected_split_output_files = ['network_pre.json', 'oke_identity.json', 'oke_network.json'];
{
  unexpected_split_output_files_present:
    [name for name in unexpected_split_output_files if std.objectHas(outputs, name)],
  output_files: std.sort(std.objectFields(outputs)),
}
