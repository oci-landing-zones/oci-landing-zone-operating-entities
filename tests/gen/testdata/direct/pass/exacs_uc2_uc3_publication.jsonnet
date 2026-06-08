// EXACS published profiles expose UC2 and UC3 with explicit shared, prod, and preprod VCN CIDRs
// contains: "uc1_shared_cidr": "10.0.24.0/21"
// contains: "uc2_prod_cidr": "10.0.104.0/21"
// contains: "uc2_preprod_cidr": "10.0.168.0/21"
// contains: "uc2_shared_children": [
// contains: "CMP-LZ-SHARED-EXACS-INFRA-KEY"
// contains: "uc2_shared_has_db": false
// contains: "uc2_prod_children": [
// contains: "CMP-LZ-PROD-EXACS-DB-KEY"
// contains: "uc2_network_categories": [
// contains: "preprod-platform-exacs"
// contains: "prod-platform-exacs"
// contains: "uc2_alarm_default_compartment": "CMP-LZ-PROD-EXACS-DB-KEY"
// contains: "uc3_prod_cidr": "10.0.104.0/21"
// contains: "uc3_preprod_cidr": "10.0.168.0/21"
// contains: "uc3_shared_exists": false
// contains: "uc3_prod_children": [
// contains: "CMP-LZ-PROD-EXACS-INFRA-KEY"
local lz = import 'gen/landing_zone.libsonnet';
local single_profiles = import 'gen/workload-extensions/exacs/single-stack/profiles.libsonnet';
local multi_profiles = import 'gen/workload-extensions/exacs/multi-stack/profiles.libsonnet';
local multi_published = import 'gen/workload-extensions/exacs/multi-stack/published.libsonnet';

local network_categories(network_doc) =
  network_doc.network_configuration.network_configuration_categories;

local category_cidr(network_doc, category_key) =
  local category = network_categories(network_doc)[category_key];
  local vcn_keys = std.objectFields(category.vcns);
  category.vcns[vcn_keys[0]].cidr_blocks[0];

local child_keys(cmp) =
  if std.objectHas(cmp, 'children') then std.sort(std.objectFields(cmp.children)) else [];

local uc1_single = lz(single_profiles.uc1.config);
local uc2_single = lz(single_profiles.uc2.config);
local uc3_single = lz(single_profiles.uc3.config);
local uc2_multi = multi_published.render(multi_profiles.uc2_hub_e.config);
local uc3_multi = multi_published.render(multi_profiles.uc3_hub_e.config);

local uc2_cmps = uc2_multi.identity.compartments_configuration.compartments;
local uc3_cmps = uc3_multi.identity.compartments_configuration.compartments;

{
  uc1_shared_cidr: category_cidr(uc1_single.network, 'shared-platform-exacs'),

  uc2_prod_cidr: category_cidr(uc2_single.network, 'prod-platform-exacs'),
  uc2_preprod_cidr: category_cidr(uc2_single.network, 'preprod-platform-exacs'),
  uc2_network_categories: std.sort([
    key
    for key in std.objectFields(network_categories(uc2_multi.network))
    if std.length(std.findSubstr('platform-exacs', key)) > 0
  ]),
  uc2_shared_children: child_keys(uc2_cmps['CMP-LZ-SHARED-EXACS-KEY']),
  uc2_shared_has_db: std.objectHas(
    uc2_cmps['CMP-LZ-SHARED-EXACS-KEY'].children,
    'CMP-LZ-SHARED-EXACS-DB-KEY'
  ),
  uc2_prod_children: child_keys(uc2_cmps['CMP-LZ-PROD-EXACS-KEY']),
  uc2_alarm_default_compartment: uc2_multi.observability.alarms_configuration.default_compartment_id,

  uc3_prod_cidr: category_cidr(uc3_single.network, 'prod-platform-exacs'),
  uc3_preprod_cidr: category_cidr(uc3_single.network, 'preprod-platform-exacs'),
  uc3_shared_exists: std.objectHas(uc3_cmps, 'CMP-LZ-SHARED-EXACS-KEY'),
  uc3_prod_children: child_keys(uc3_cmps['CMP-LZ-PROD-EXACS-KEY']),
}
