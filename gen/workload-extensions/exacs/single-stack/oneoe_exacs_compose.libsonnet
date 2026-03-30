// oneoe_compose.libsonnet — Composes a hub addon with spoke VCNs into a one-oe blueprint.
//
// Merges a hub addon with prod/preprod spoke VCN categories, DRG attachments,
// route distribution statements, and spoke-facing route rules.
//
// Parameters:
//   hub                : Hub addon object (e.g., addon_network_hub_a_pre.jsonnet)
//   ip_config          : Hub IP config from subnetting.libsonnet (e.g., ip.hub_a)
//                        Must have .mgmt_sn and .lb_sn for spoke NSG/security list rules
//   spoke_route_tables : Array of route table keys that receive spoke DRG routes
//                        (e.g., ['RT-FRA-LZ-HUB-FW-INT-KEY'] for Hub A)
//   fw_nsg_key         : NSG key for spoke ingress rules (null for Hub E which has no FW NSG)
//   has_spoke_natgw    : true for Hub E (spokes get NAT GW + explicit routes instead of DRG default)
//
// Architecture notes:
//   This function uses Jsonnet deep merge (+:) to overlay spoke infrastructure onto the hub addon.
//   The hub addon is the base, and spoke VCNs are added as separate categories (1-prod, 2-preprod).
//   See gen/CONVENTIONS.md for the full pre/post deployment pattern.
function(hub, ip_config, spoke_route_tables, fw_nsg_key=null, has_spoke_natgw=false)
  local spokes = (import 'oneoe_exacs_spokes.libsonnet')(ip_config.mgmt_sn, ip_config.lb_sn, has_spoke_natgw);
  hub {
    network_configuration+: {
      network_configuration_categories+: {
        '0-shared'+: {
          vcns+: {
            'VCN-FRA-LZ-HUB-KEY'+: {
              route_tables+: {
                [rt]+: { route_rules+: spokes._hub_spoke_routes_via_drg }
                for rt in spoke_route_tables
              },
            } + (if fw_nsg_key != null then {
              network_security_groups+: {
                [fw_nsg_key]+: { ingress_rules+: spokes._nsg_fw_spoke_ingress },
              },
            } else {}),
          },

          non_vcn_specific_gateways+: {
            dynamic_routing_gateways+: {
              'DRG-FRA-LZ-HUB-KEY'+: {
                drg_attachments+: spokes._drg_spoke_attachments,

                drg_route_distributions+: {
                  'DRGRD-FRA-LZ-HUB-KEY'+: {
                    statements+: spokes._drg_hub_distribution_statements,
                  },
                } + (if has_spoke_natgw then {
                  'DRGRD-FRA-LZ-SPOKE-KEY'+: {
                    statements+: spokes._drg_spoke_distribution_statements,
                  },
                } else {}),
              },
            },
          },
        },

        '1-shared-exacs': spokes._exacs_category
      },
    },
  }
