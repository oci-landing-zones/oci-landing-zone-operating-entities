// Hub routing emits the project-VCN DRG override for every firewall hub model.
local lz = import 'gen/landing_zone.libsonnet';

local build(hub_kind) = lz({
  hub: { kind: hub_kind, network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {
    project_network: {
      subnet_routing: 'hub',
      network: { vcn: '10.0.64.0/21' },
    },
  } },
});
local route_target(network_output) = network_output.network_configuration
  .network_configuration_categories['1-prod'].vcns['VCN-FRA-LZ-PROD-PROJECTS-KEY']
  .route_tables['RT-FRA-LZ-PROD-PROJ-GENERIC-KEY']
  .route_rules['rr-fra-project-inspection'].network_entity_key;
local hub_a = build('hub_a');
local hub_b = build('hub_b');
local hub_c = build('hub_c');

{
  hub_a_final_target: route_target(hub_a.network),
  hub_b_final_target: route_target(hub_b.network),
  hub_c_final_target: route_target(hub_c.network),
  hub_c_pre_target: route_target(hub_c.network_pre),
  hub_c_staged_network_present: hub_c.network_pre != null,
  hub_c_backend_network_present: hub_c.network_backends != null,
}
