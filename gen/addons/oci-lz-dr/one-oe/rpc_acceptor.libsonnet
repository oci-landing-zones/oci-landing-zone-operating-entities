local naming = import '../../../naming.libsonnet';

local amsterdam_prod_cidr = '10.0.200.0/21';
local amsterdam_region = 'eu-amsterdam-1';

local remote_route(drg_key) = {
  description: 'Route to Amsterdam PROD CIDR %s through DRG' % amsterdam_prod_cidr,
  destination: amsterdam_prod_cidr,
  destination_type: 'CIDR_BLOCK',
  network_entity_key: drg_key,
};

local rpc_route_statement(attachment_key, priority) = {
  action: 'ACCEPT',
  priority: priority,
  match_criteria: {
    match_type: 'DRG_ATTACHMENT_TYPE',
    attachment_type: 'REMOTE_PEERING_CONNECTION',
    drg_attachment_key: attachment_key,
  },
};

function(final_network, firewall_egress_route_table=null)
  local n = naming('fra');
  local drg_key = n.key('DRG', ['HUB']);
  local hub_vcn_key = n.key('VCN', ['HUB']);
  local prod_vcn_key = n.key('VCN', ['PROD', 'PROJECTS']);
  local hub_attachment_key = n.key('DRGATT', ['HUB', 'VCN']);
  local prod_attachment_key = n.key('DRGATT', ['PROD', 'PROJ']);
  local hub_distribution_key = n.key('DRGRD', ['HUB']);
  local spoke_distribution_key = n.key('DRGRD', ['SPOKE']);
  local rpc_key = n.key('RPC', ['HUB', 'DR']);
  local rpc_attachment_key = n.key('DRGATT', ['HUB', 'RPC', 'DR']);
  local rpc_distribution_key = n.key('DRGRD', ['RPC', 'DR']);
  local rpc_route_table_key = n.key('DRGRT', ['RPC', 'DR']);
  local rpc_route_rule_key = n.route_rule([n.region, 'rpc', 'dr', '1']);
  local rpc_prod_static_route_key = std.join('-', [
    'DRGRT',
    std.asciiUpper(n.region),
    'LZ',
    'RPC',
    'DR',
    'PROD',
    'STATIC',
    'ROUTE',
  ]);
  local prod_cidr = final_network.network_configuration.network_configuration_categories[
    '1-prod'
  ].vcns[prod_vcn_key].cidr_blocks[0];
  local rpc_attachment = {
    display_name: n.display('DRGATT', ['HUB', 'RPC', 'DR']),
    drg_route_table_key: rpc_route_table_key,
    network_details: {
      type: 'REMOTE_PEERING_CONNECTION',
      attached_resource_key: rpc_key,
    },
  };
  local rpc = {
    display_name: n.display('RPC', ['HUB', 'DR']),
    peer_region_name: amsterdam_region,
  };
  local rpc_distribution = {
    display_name: n.display('DRGRD', ['RPC', 'DR']),
    distribution_type: 'IMPORT',
    statements: {},
  };
  local common_drg = {
    drg_attachments+: {
      [rpc_attachment_key]: rpc_attachment,
    },
    drg_route_distributions+: {
      [rpc_distribution_key]: rpc_distribution,
    },
    remote_peering_connections+: {
      [rpc_key]: rpc,
    },
  };
  local hub_e_drg = common_drg + {
    drg_route_distributions+: {
      [hub_distribution_key]+: {
        statements+: {
          [n.key_global('ROUTE-TO-RPC', ['DR'])]:
            rpc_route_statement(rpc_attachment_key, 30),
        },
      },
      [spoke_distribution_key]+: {
        statements+: {
          [n.key_global('ROUTE-TO-RPC', ['DR', 'S'])]:
            rpc_route_statement(rpc_attachment_key, 40),
        },
      },
      [rpc_distribution_key]+: {
        statements+: {
          [n.key_global('ROUTE-TO-RPC', ['DR', 'VCN', 'HUB'])]: {
            action: 'ACCEPT',
            priority: 10,
            match_criteria: {
              match_type: 'DRG_ATTACHMENT_ID',
              attachment_type: 'VCN',
              drg_attachment_key: hub_attachment_key,
            },
          },
          [n.key_global('ROUTE-TO-RPC', ['DR', 'VCN', 'PROD'])]: {
            action: 'ACCEPT',
            priority: 20,
            match_criteria: {
              match_type: 'DRG_ATTACHMENT_ID',
              attachment_type: 'VCN',
              drg_attachment_key: prod_attachment_key,
            },
          },
        },
      },
    },
    drg_route_tables+: {
      [rpc_route_table_key]: {
        display_name: n.display('DRGRT', ['RPC', 'DR']),
        import_drg_route_distribution_key: rpc_distribution_key,
        is_ecmp_enabled: false,
        route_rules: {},
      },
    },
  };
  local firewall_drg = common_drg + {
    drg_route_distributions+: {
      [hub_distribution_key]+: {
        statements+: {
          [n.key_global('ROUTE-TO-RPC', ['DR'])]:
            rpc_route_statement(rpc_attachment_key, 30),
        },
      },
    },
    drg_route_tables+: {
      [rpc_route_table_key]: {
        display_name: n.display('DRGRT', ['RPC', 'DR']),
        import_drg_route_distribution_key: rpc_distribution_key,
        is_ecmp_enabled: false,
        route_rules: {
          [rpc_prod_static_route_key]: {
            destination: prod_cidr,
            destination_type: 'CIDR_BLOCK',
            next_hop_drg_attachment_key: hub_attachment_key,
          },
        },
      },
    },
  };
  final_network + {
    network_configuration+: {
      network_configuration_categories+: {
        '0-shared'+: {
          vcns+: {
            [hub_vcn_key]+: {
              route_tables+: if firewall_egress_route_table == null then {
                [n.key('RT', ['HUB', 'LB'])]+: {
                  route_rules+: {
                    [rpc_route_rule_key]: remote_route(drg_key),
                  },
                },
                [n.key('RT', ['HUB', 'MGMT'])]+: {
                  route_rules+: {
                    [rpc_route_rule_key]: remote_route(drg_key),
                  },
                },
              } else {
                [firewall_egress_route_table]+: {
                  route_rules+: {
                    [rpc_route_rule_key]: remote_route(drg_key),
                  },
                },
              },
            },
          },
          non_vcn_specific_gateways+: {
            dynamic_routing_gateways+: {
              [drg_key]+: if firewall_egress_route_table == null then hub_e_drg else firewall_drg,
            },
          },
        },
        '1-prod'+: {
          vcns+: if firewall_egress_route_table == null then {
            [prod_vcn_key]+: {
              route_tables+: {
                [n.key('RT', ['PROD', 'PROJ', 'GENERIC'])]+: {
                  route_rules+: {
                    [rpc_route_rule_key]: remote_route(drg_key),
                  },
                },
              },
            },
          } else {},
        },
      },
    },
  }
