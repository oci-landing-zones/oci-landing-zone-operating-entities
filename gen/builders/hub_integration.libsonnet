// gen/builders/hub_integration.libsonnet
// Builds hub integration overlays for DRG attachments, route distributions,
// hub route-table injection, firewall NSG ingress, and post-deploy routing.
//
// function(params) -> { pre, post }

local common = import '../hub/hub_common.libsonnet';

function(params)
  local n = params.naming;
  local hub = params.hub;
  local all_vcn_entries = params.all_vcn_entries;

  local drg_key = n.key('DRG', ['HUB']);

  // --- 1. DRG Spoke/Platform Attachments ---
  local drg_spoke_attachments = {
    [e.drg_att_key]: {
      display_name: e.drg_att_display,
      drg_route_table_key: n.key('DRGRT', ['SPOKES']),
      network_details: {
        attached_resource_key: e.vcn_key,
        type: 'VCN',
      },
    }
    for e in all_vcn_entries
  };

  // --- 2. DRG Route Distribution Statements ---
  local drg_distribution_statements(priority_offset, key_suffix) = {
    ['ROUTE-TO-VCN-%s%s-KEY' % [std.asciiUpper(e.name), key_suffix]]: {
      priority: e.priority + priority_offset,
      action: 'ACCEPT',
      match_criteria: {
        match_type: 'DRG_ATTACHMENT_ID',
        attachment_type: 'VCN',
        drg_attachment_key: e.drg_att_key,
      },
    }
    for e in all_vcn_entries
  };

  // Hub distribution (DRGRD-*-HUB-KEY): accept traffic from each spoke/platform VCN
  local drg_hub_distribution_statements = drg_distribution_statements(0, '');

  // Spoke distribution (Hub E only, DRGRD-*-SPOKE-KEY): hub VCN + all spoke/platform VCNs
  // The hub VCN statement is already there (priority 10), entries start at priority + 10
  // Spoke statement keys append -S before -KEY. Terraform flattens route distribution
  // statements by key across distributions, so hub and spoke statements cannot share
  // the otherwise consistent ROUTE-TO-VCN-<name>-KEY naming standard.
  local drg_spoke_distribution_statements = drg_distribution_statements(10, '-S');

  // --- 3. Hub Route Table Injection ---
  // Route rules for each VCN CIDR through DRG
  local hub_spoke_routes_via_drg = {
    [e.route_key]: common._route_via_key('%s through DRG' % e.route_desc, e.vcn, drg_key)
    for e in all_vcn_entries
  };

  // --- 4. Firewall NSG Ingress Rules ---
  local nsg_fw_spoke_ingress = std.foldl(
    function(acc, e) acc {
      ['from_%s_http' % e.name]: common._tcp_ingress_rule(
        'Allow inbound traffic from %s VCN over HTTP' % e.display,
        e.vcn,
        80
      ),
      ['from_%s_https' % e.name]: common._tcp_ingress_rule(
        'Allow inbound traffic from %s VCN over HTTPS' % e.display,
        e.vcn,
        443
      ),
      ['from_%s_icmp' % e.name]: {
        description: 'Allow ICMP type 8 (Echo) from %s VCN' % e.display,
        src: e.vcn,
        src_type: 'CIDR_BLOCK',
        protocol: 'ICMP',
        icmp_type: 8,
        icmp_code: 0,
        stateless: false,
      },
    },
    all_vcn_entries,
    {}
  );

  // --- 5. Post-Deploy Routes ---
  // Route rules through firewall IP for each VCN CIDR
  local post_route_tables =
    if std.objectHas(hub, 'post_route_tables') then hub.post_route_tables else [];
  local post_route_entity_desc =
    if std.objectHas(hub, 'post_route_entity_desc') && hub.post_route_entity_desc != null
    then hub.post_route_entity_desc
    else 'post-route entity';
  local has_post_route_entity =
    std.objectHas(hub, 'post_route_entity_id') && hub.post_route_entity_id != null;
  local hub_spoke_routes_via_nfw = if has_post_route_entity then {
    [e.route_key]: common._route_via_id(
      '%s through %s' % [e.route_desc, post_route_entity_desc],
      e.vcn,
      hub.post_route_entity_id
    )
    for e in all_vcn_entries
  } else {};

  local pre = {
    network_configuration+: {
      network_configuration_categories+: {
        '0-shared'+: {
          // Inject spoke routes into hub route tables
          vcns+: {
            [n.key('VCN', ['HUB'])]+: {
              route_tables+: {
                [rt]+: { route_rules+: hub_spoke_routes_via_drg }
                for rt in hub.spoke_route_tables
              },
            } + (if hub.fw_nsg_key != null then {
                   network_security_groups+: {
                     [hub.fw_nsg_key]+: { ingress_rules+: nsg_fw_spoke_ingress },
                   },
                 } else {}),
          },

          // DRG spoke attachments and distribution statements
          non_vcn_specific_gateways+: {
            dynamic_routing_gateways+: {
              [drg_key]+: {
                drg_attachments+: drg_spoke_attachments,

                drg_route_distributions+: {
                  [n.key('DRGRD', ['HUB'])]+: {
                    statements+: drg_hub_distribution_statements,
                  },
                } + (if hub.has_spoke_natgw then {
                       [n.key('DRGRD', ['SPOKE'])]+: {
                         statements+: drg_spoke_distribution_statements,
                       },
                     } else {}),
              },
            },
          },
        },
      },
    },
  };

  local post =
    if has_post_route_entity
       && std.length(post_route_tables) > 0
       && std.length(all_vcn_entries) > 0 then {
      network_configuration+: {
        network_configuration_categories+: {
          '0-shared'+: {
            vcns+: {
              [n.key('VCN', ['HUB'])]+: {
                route_tables+: {
                  [rt]+: { route_rules+: hub_spoke_routes_via_nfw }
                  for rt in post_route_tables
                },
              },
            },
          },
        },
      },
    } else {};

  {
    pre: pre,
    post: post,
  }
