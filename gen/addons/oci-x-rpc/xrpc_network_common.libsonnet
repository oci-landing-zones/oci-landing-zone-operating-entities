local remote_route_rule(remote_label, remote_cidr) = {
  ['rt-vcn-' + remote_label]: {
    description: 'Route to ' + remote_label + ' through DRG RPC',
    destination: remote_cidr,
    destination_type: 'CIDR_BLOCK',
    network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
  },
};

local rpc_route_table_rule(remote_cidr, rpc_attachment_key) = {
  destination: remote_cidr,
  destination_type: 'CIDR_BLOCK',
  next_hop_drg_attachment_key: rpc_attachment_key,
};

local rpc_remote_peering_extension(
  local_rpc_key,
  local_rpc_display_name,
  peer_region_name,
  peer_key,
  peer_id,
) = {
  remote_peering_connections+: {
    [local_rpc_key]:
      {
        display_name: local_rpc_display_name,
        peer_region_name: peer_region_name,
      }
      + (if peer_id == null then {} else { peer_id: peer_id })
      + (if peer_key == null then {} else { peer_key: peer_key }),
  },
};

local single_stack_rpc_drg_acceptor_extension(
  local_rpc_key,
  local_rpc_display_name,
  peer_region_name,
  peer_key,
  peer_id,
) = {
  drg_attachments+: {
    'DRGATT-FRA-LZ-RPC-KEY': {
      display_name: 'drgatt-fra-lz-rpc',
      drg_route_table_key: 'DRGRT-FRA-LZ-RPC-KEY',

      network_details: {
        type: 'REMOTE_PEERING_CONNECTION',
        attached_resource_key: local_rpc_key,
      },
    },
  },

  drg_route_distributions+: {
    'DRGRD-FRA-LZ-HUB-KEY'+: {
      statements+: {
        'ROUTE-TO-RPC-KEY': {
          action: 'ACCEPT',
          priority: 30,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_TYPE',
            attachment_type: 'REMOTE_PEERING_CONNECTION',
            drg_attachment_key: 'DRGATT-FRA-LZ-RPC-KEY',
          },
        },
      },
    },
  },

  drg_route_tables+: {
    'DRGRT-FRA-LZ-RPC-KEY': {
      display_name: 'drgrt-fra-lz-rpc',
      is_ecmp_enabled: false,

      route_rules: {
        'DRGRT-FRA-LZ-RPC-STATIC-ROUTE': {
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          next_hop_drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
        },
      },
    },

    'DRGRT-FRA-LZ-SPOKES-KEY'+: {
      route_rules+: {
        'DRGRT-FRA-LZ-SPOKES-STATIC-ROUTE': {
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          next_hop_drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
        },
      },
    },
  },
} + rpc_remote_peering_extension(local_rpc_key, local_rpc_display_name, peer_region_name, peer_key, peer_id);

local single_stack_rpc_drg_requester_extension(
  local_rpc_key,
  local_rpc_display_name,
  peer_region_name,
  peer_key,
  peer_id,
) = {
  drg_attachments+: {
    'DRGATT-FRA-LZ-RPC-KEY': {
      display_name: 'drgatt-fra-lz-rpc',
      drg_route_table_key: 'DRGRT-FRA-LZ-RPC-KEY',

      network_details: {
        type: 'REMOTE_PEERING_CONNECTION',
        attached_resource_key: local_rpc_key,
      },
    },
  },

  drg_route_distributions+: {
    'DRGRD-FRA-LZ-HUB-KEY'+: {
      statements+: {
        'ROUTE-TO-RPC-KEY': {
          action: 'ACCEPT',
          priority: 30,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_TYPE',
            attachment_type: 'REMOTE_PEERING_CONNECTION',
            drg_attachment_key: 'DRGATT-FRA-LZ-RPC-KEY',
          },
        },
      },
    },

    'DRGRD-FRA-LZ-RPC-KEY': {
      display_name: 'drgrd-fra-lz-rpc',
      distribution_type: 'IMPORT',

      statements: {
        'ROUTE-TO-RPC-VCN-PROD-KEY': {
          action: 'ACCEPT',
          priority: 10,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_ID',
            attachment_type: 'VCN',
            drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PROJ-KEY',
          },
        },

        'ROUTE-TO-RPC-VCN-NONPROD-KEY': {
          action: 'ACCEPT',
          priority: 20,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_ID',
            attachment_type: 'VCN',
            drg_attachment_key: 'DRGATT-FRA-LZ-PREPROD-PROJ-KEY',
          },
        },

        'ROUTE-TO-RPC-VCN-HUB-KEY': {
          action: 'ACCEPT',
          priority: 30,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_ID',
            attachment_type: 'VCN',
            drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
          },
        },
      },
    },

    'DRGRD-FRA-LZ-SPOKE-KEY'+: {
      statements+: {
        'ROUTE-TO-VCN-S-RPC-KEY': {
          action: 'ACCEPT',
          priority: 40,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_TYPE',
            attachment_type: 'REMOTE_PEERING_CONNECTION',
            drg_attachment_key: 'DRGATT-FRA-LZ-RPC-KEY',
          },
        },
      },
    },
  },

  drg_route_tables+: {
    'DRGRT-FRA-LZ-RPC-KEY': {
      display_name: 'drgrt-fra-lz-rpc',
      import_drg_route_distribution_key: 'DRGRD-FRA-LZ-RPC-KEY',
      is_ecmp_enabled: false,
      route_rules: {},
    },
  },
} + rpc_remote_peering_extension(local_rpc_key, local_rpc_display_name, peer_region_name, peer_key, peer_id);

local multi_stack_rpc_drg_extension(
  remote_label,
  remote_cidr,
  local_rpc_key,
  local_rpc_display_name,
  peer_region_name,
  peer_key,
  peer_id,
) = {
  drg_attachments+: {
    'DRGATT-FRA-LZ-RPC-KEY': {
      display_name: 'drgatt-fra-lz-rpc',
      drg_route_table_key: 'DRGRT-FRA-LZ-RPC-KEY',

      network_details: {
        type: 'REMOTE_PEERING_CONNECTION',
        attached_resource_key: local_rpc_key,
      },
    },
  },

  drg_route_distributions+: {
    'DRGRD-FRA-LZ-RPC-KEY': {
      display_name: 'drgrd-fra-lz-rpc',
      distribution_type: 'IMPORT',

      statements: {
        'ROUTE-TO-RPC-VCN-HUB-KEY': {
          action: 'ACCEPT',
          priority: 10,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_ID',
            attachment_type: 'VCN',
            drg_attachment_key: 'DRGATT-FRA-LZ-HUB-VCN-KEY',
          },
        },

        'ROUTE-TO-RPC-VCN-PROD-KEY': {
          action: 'ACCEPT',
          priority: 20,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_ID',
            attachment_type: 'VCN',
            drg_attachment_key: 'DRGATT-FRA-LZ-PROD-PROJ-KEY',
          },
        },

        'ROUTE-TO-RPC-VCN-PREPROD-KEY': {
          action: 'ACCEPT',
          priority: 30,

          match_criteria: {
            match_type: 'DRG_ATTACHMENT_ID',
            attachment_type: 'VCN',
            drg_attachment_key: 'DRGATT-FRA-LZ-PREPROD-PROJ-KEY',
          },
        },
      },
    },
  },

  drg_route_tables+: {
    'DRGRT-FRA-LZ-HUB-KEY'+: {
      display_name: 'drgrt-fra-lz-hub',
      import_drg_route_distribution_key: 'DRGRD-FRA-LZ-HUB-KEY',
      is_ecmp_enabled: false,

      route_rules+: {
        'DRGRT-FRA-LZ-HUB-TO-RPC-KEY': rpc_route_table_rule(remote_cidr, 'DRGATT-FRA-LZ-RPC-KEY'),
      },
    },

    'DRGRT-FRA-LZ-SPOKES-KEY'+: {
      display_name: 'drgrt-fra-lz-spokes',
      import_drg_route_distribution_key: 'DRGRD-FRA-LZ-SPOKE-KEY',
      is_ecmp_enabled: false,

      route_rules+: {
        'DRGRT-FRA-LZ-SPOKES-TO-RPC-KEY': rpc_route_table_rule(remote_cidr, 'DRGATT-FRA-LZ-RPC-KEY'),
      },
    },

    'DRGRT-FRA-LZ-RPC-KEY': {
      display_name: 'drgrt-fra-lz-rpc',
      import_drg_route_distribution_key: 'DRGRD-FRA-LZ-RPC-KEY',
      is_ecmp_enabled: false,
      route_rules: {},
    },
  },

} + rpc_remote_peering_extension(local_rpc_key, local_rpc_display_name, peer_region_name, peer_key, peer_id);

local hub_lb_route_table(remote_label, remote_cidr, local_prod_cidr, local_preprod_cidr) = {
  'RT-FRA-LZ-HUB-LB-KEY': {
    display_name: 'rt-fra-lz-hub-lb',

    route_rules:
      {
        'rt-internet': {
          description: 'Route to the Internet through Internet GW',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'IGW-FRA-LZ-HUB-KEY',
        },

        'rt-fra-prod-projects': {
          description: 'Route to VCN Prod Projects through DRG',
          destination: local_prod_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        'rt-fra-preprod-projects': {
          description: 'Route to VCN PreProd Projects through DRG',
          destination: local_preprod_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },
      }
      + remote_route_rule(remote_label, remote_cidr),
  },
};

local hub_mgmt_route_table(remote_label, remote_cidr, local_prod_cidr, local_preprod_cidr) = {
  'RT-FRA-LZ-HUB-MGMT-KEY': {
    display_name: 'rt-fra-lz-hub-mgmt',

    route_rules:
      {
        'rt-natgw': {
          description: 'Route to Internet through NAT GW',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'NGW-FRA-LZ-HUB-KEY',
        },

        'rt-fra-prod-projects': {
          description: 'Route to VCN Prod Projects through DRG',
          destination: local_prod_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        'rt-fra-preprod-projects': {
          description: 'Route to VCN PreProd Projects through DRG',
          destination: local_preprod_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        'rt-sgw': {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: 'SGW-FRA-LZ-HUB-KEY',
        },
      }
      + remote_route_rule(remote_label, remote_cidr),
  },
};

local prod_route_table(remote_label, remote_cidr, local_hub_cidr, local_preprod_cidr) = {
  'RT-FRA-LZ-PROD-PROJ-GENERIC-KEY': {
    display_name: 'rt-fra-lz-prod-proj-generic',

    route_rules:
      {
        'rt-natgw': {
          description: 'Route to the Internet through NAT GW',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'NGW-FRA-LZ-PROD-PROJ-KEY',
        },

        'rt-fra-lz-hub': {
          description: 'Route to the Hub VCN through DRG',
          destination: local_hub_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        'rt-fra-preprod-projects': {
          description: 'Route to the VCN PreProd Projects through DRG',
          destination: local_preprod_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        sgw_route: {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: 'SGW-FRA-LZ-PROD-PROJ-KEY',
        },
      }
      + remote_route_rule(remote_label, remote_cidr),
  },
};

local preprod_route_table(remote_label, remote_cidr, local_prod_cidr, local_hub_cidr) = {
  'RT-FRA-LZ-PREPROD-PROJ-GENERIC-KEY': {
    display_name: 'rt-fra-lz-preprod-proj-generic',

    route_rules:
      {
        'rt-natgw': {
          description: 'Route to the Internet through NAT GW',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'NGW-FRA-LZ-PREPROD-PROJ-KEY',
        },

        'rt-fra-prod-projects': {
          description: 'Route to th VCN Prod Projects through DRG',
          destination: local_prod_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        'rt-fra-lz-hub': {
          description: 'Route to the Hub VCN through DRG',
          destination: local_hub_cidr,
          destination_type: 'CIDR_BLOCK',
          network_entity_key: 'DRG-FRA-LZ-HUB-KEY',
        },

        sgw_route: {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: 'SGW-FRA-LZ-PREPROD-PROJ-KEY',
        },
      }
      + remote_route_rule(remote_label, remote_cidr),
  },
};

local single_stack_network_extension(
  remote_label,
  remote_cidr,
  local_rpc_key,
  local_rpc_display_name,
  peer_region_name,
  peer_key,
  peer_id,
  rpc_role,
) = {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        vcns+: {
          'VCN-FRA-LZ-HUB-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-HUB-LB-KEY'+: {
                route_rules+: remote_route_rule(remote_label, remote_cidr),
              },

              'RT-FRA-LZ-HUB-MGMT-KEY'+: {
                route_rules+: remote_route_rule(remote_label, remote_cidr),
              },
            },
          },
        },

        non_vcn_specific_gateways+: {
          dynamic_routing_gateways+: {
            'DRG-FRA-LZ-HUB-KEY'+:
              if rpc_role == 'acceptor' then
                single_stack_rpc_drg_acceptor_extension(
                  local_rpc_key,
                  local_rpc_display_name,
                  peer_region_name,
                  peer_key,
                  peer_id,
                )
              else
                single_stack_rpc_drg_requester_extension(
                  local_rpc_key,
                  local_rpc_display_name,
                  peer_region_name,
                  peer_key,
                  peer_id,
                ),
          },
        },
      },

      '1-prod'+: {
        vcns+: {
          'VCN-FRA-LZ-PROD-PROJECTS-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-PROD-PROJ-GENERIC-KEY'+: {
                route_rules+: remote_route_rule(remote_label, remote_cidr),
              },
            },
          },
        },
      },

      '2-preprod'+: {
        vcns+: {
          'VCN-FRA-LZ-PREPROD-PROJECTS-KEY'+: {
            route_tables+: {
              'RT-FRA-LZ-PREPROD-PROJ-GENERIC-KEY'+: {
                route_rules+: remote_route_rule(remote_label, remote_cidr),
              },
            },
          },
        },
      },
    },
  },
};

local multi_stack_network_extension(
  remote_label,
  remote_cidr,
  local_hub_cidr,
  local_prod_cidr,
  local_preprod_cidr,
  local_rpc_key,
  local_rpc_display_name,
  peer_region_name,
  peer_key,
  peer_id,
) = {
  network_configuration: {
    default_enable_cis_checks: false,

    network_configuration_categories: {
      xrpc_routes: {
        inject_into_existing_vcns: {
          'VCN-FRA-LZ-HUB-KEY': {
            vcn_id: 'VCN-FRA-LZ-HUB-KEY',
            route_tables:
              hub_lb_route_table(remote_label, remote_cidr, local_prod_cidr, local_preprod_cidr)
              + hub_mgmt_route_table(remote_label, remote_cidr, local_prod_cidr, local_preprod_cidr),
          },

          'VCN-FRA-LZ-PROD-PROJECTS-KEY': {
            vcn_id: 'VCN-FRA-LZ-PROD-PROJECTS-KEY',
            route_tables: prod_route_table(remote_label, remote_cidr, local_hub_cidr, local_preprod_cidr),
          },

          'VCN-FRA-LZ-PREPROD-PROJECTS-KEY': {
            vcn_id: 'VCN-FRA-LZ-PREPROD-PROJECTS-KEY',
            route_tables: preprod_route_table(remote_label, remote_cidr, local_prod_cidr, local_hub_cidr),
          },
        },
      },

      xrpc_drg: {
        non_vcn_specific_gateways: {
          inject_into_existing_drgs: {
            'DRG-FRA-LZ-HUB-KEY': {
              drg_id: 'DRG-FRA-LZ-HUB-KEY',
            } + multi_stack_rpc_drg_extension(
              remote_label,
              remote_cidr,
              local_rpc_key,
              local_rpc_display_name,
              peer_region_name,
              peer_key,
              peer_id,
            ),
          },
        },
      },
    },
  },
};

{
  single_stack: {
    tenancy1: single_stack_network_extension(
      'tenancy2',
      '10.1.0.0/16',
      'RPC-FRA-LZ-DRG-TENANCY2-KEY',
      'rpc-fra-lz-drg-tenancy2',
      'eu-frankfurt-1',
      null,
      null,
      'acceptor',
    ),

    tenancy2: single_stack_network_extension(
      'tenancy1',
      '10.0.0.0/16',
      'RPC-FRA-LZ-DRG-TENANCY1-KEY',
      'rpc-fra-lz-drg-tenancy1',
      'eu-frankfurt-1',
      '',
      'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.amaaaaaayvkqliqaqm573l3jxisgtoqg6wp2aghrxbizzdq4wxvgqgnyu2iq',
      'requester',
    ),
  },

  multi_stack: {
    tenancy1: multi_stack_network_extension(
      'tenancy2',
      '10.1.0.0/16',
      '10.0.0.0/21',
      '10.0.64.0/21',
      '10.0.128.0/21',
      'RPC-FRA-LZ-DRG-TENANCY2-KEY',
      'rpc-fra-lz-drg-tenancy2',
      'eu-frankfurt-1',
      null,
      null,
    ),

    tenancy2: multi_stack_network_extension(
      'tenancy1',
      '10.0.0.0/16',
      '10.1.0.0/21',
      '10.1.64.0/21',
      '10.1.128.0/21',
      'RPC-FRA-LZ-DRG-TENANCY1-KEY',
      'rpc-fra-lz-drg-tenancy1',
      'eu-frankfurt-1',
      'RPC-FRA-LZ-DRG-TENANCY2-KEY',
      null,
    ),
  },
}
