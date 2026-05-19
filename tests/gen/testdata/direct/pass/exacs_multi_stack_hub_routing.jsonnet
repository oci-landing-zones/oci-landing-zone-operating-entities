// EXACS multi-stack spoke routing follows the selected hub model for Hub A and Hub E publications
local published = import 'gen/workload-extensions/exacs/multi-stack/published.libsonnet';
local profiles = import 'gen/workload-extensions/exacs/multi-stack/profiles.libsonnet';

local hub_a = published.render(profiles.uc1_hub_a.config);
local hub_e = published.render(profiles.uc1_hub_e.config);

local category_key = 'shared-platform-exacs';
local vcn_key = 'VCN-FRA-LZ-SHARED-PLATFORM-EXACS-KEY';
local rt_key = 'RT-FRA-LZ-SHARED-PLATFORM-EXACS-GENERIC-KEY';

local vcn(doc) =
  doc.network_configuration.network_configuration_categories[category_key].vcns[vcn_key];

local routes(doc) =
  vcn(doc).route_tables[rt_key].route_rules;

local route_keys(doc) =
  std.objectFields(routes(doc));

local route_entity(doc, key) =
  if std.objectHas(routes(doc), key) then routes(doc)[key].network_entity_key
  else null;

local route_destination(doc, key) =
  if std.objectHas(routes(doc), key) then routes(doc)[key].destination
  else null;

local has_natgw(doc) =
  std.objectHas(vcn(doc).vcn_specific_gateways, 'nat_gateways');

{
  hub_a_pre_has_natgw: has_natgw(hub_a.network_pre),
  hub_a_pre_route_keys: route_keys(hub_a.network_pre),
  hub_a_final_default_target: route_entity(hub_a.network, 'rr-fra-drg'),
  hub_e_pre_has_natgw: has_natgw(hub_e.network_pre),
  hub_e_pre_default_target: route_entity(hub_e.network_pre, 'rr-fra-natgw'),
  hub_e_pre_route_keys: route_keys(hub_e.network_pre),
  hub_e_final_default_target: route_entity(hub_e.network, 'rr-fra-natgw'),
  hub_e_final_hub_destination: route_destination(hub_e.network, 'rr-fra-hub'),
  hub_e_final_prod_destination: route_destination(hub_e.network, 'rr-fra-prod-projects'),
  hub_e_final_route_keys: route_keys(hub_e.network),
}
