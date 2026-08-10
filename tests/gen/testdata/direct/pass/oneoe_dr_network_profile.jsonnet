// Published One-OE DR network entrypoints create only Amsterdam hub and PROD networks.
// contains: "hub_vcn_name": "vcn-ams-lz-hub"
// contains: "hub_vcn_cidr": "10.0.192.0/21"
// contains: "prod_vcn_name": "vcn-ams-lz-prod-projects"
// contains: "prod_vcn_cidr": "10.0.200.0/21"
// contains: "has_preprod_category": false
local summarize(network) =
  local categories = network.network_configuration.network_configuration_categories;
  {
    hub_vcn_name: categories['0-shared'].vcns['VCN-AMS-LZ-HUB-KEY'].display_name,
    hub_vcn_cidr: categories['0-shared'].vcns['VCN-AMS-LZ-HUB-KEY'].cidr_blocks[0],
    prod_vcn_name: categories['1-prod'].vcns['VCN-AMS-LZ-PROD-PROJECTS-KEY'].display_name,
    prod_vcn_cidr: categories['1-prod'].vcns['VCN-AMS-LZ-PROD-PROJECTS-KEY'].cidr_blocks[0],
    has_preprod_category: std.objectHas(categories, '2-preprod'),
  };
{
  hub_a_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a_pre.jsonnet'),
  hub_a: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_a.jsonnet'),
  hub_b_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b_pre.jsonnet'),
  hub_b: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_b.jsonnet'),
  hub_c_pre: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_pre.jsonnet'),
  hub_c_backends: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c_backends.jsonnet'),
  hub_c: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_c.jsonnet'),
  hub_e: summarize(import 'gen/addons/oci-lz-dr/one-oe/oneoe_bcdr_network_hub_e.jsonnet'),
}
