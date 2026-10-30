// Builds hybrid resources and routes using Networking v0.9.0 contracts.
// function(params) -> { route_entries, network_overlay }
local contract = import '../addons/oci-hybrid-connectivity/config.libsonnet';
local without(o, fields) = { [k]: o[k] for k in std.objectFields(o) if !std.member(fields, k) };

function(params)
  local c = params.config;
  local n = params.naming;
  local locals = params.local_vcn_entries;
  local direct = params.hub_kind == 'hub_e';
  local segment(name) = std.strReplace(name, '_', '-');
  local key(type, name) = n.key(type, ['HUB', segment(name)]);
  local drg_key = n.key('DRG', ['HUB']);
  local hub_attachment = n.key('DRGATT', ['HUB', 'VCN']);
  local hc_table = key('DRGRT', 'HC');
  local remote_cidrs = contract.remote_cidrs(c);
  local types = (if std.length(std.objectFields(c.ipsecs)) > 0 then [{ name: 'VPN', type: 'IPSEC_TUNNEL', selector: 'ipsec_tunnel' }] else [])
              + (if std.length([v for v in std.objectValues(c.fast_connect_virtual_circuits) if v.provision_fc_virtual_circuit]) > 0 then [{ name: 'FASTCONNECT', type: 'VIRTUAL_CIRCUIT', selector: 'virtual_circuit' }] else []);
  local routes = [
    { name: 'hybrid-%d' % i, display: 'External network', vcn: remote_cidrs[i], kind: 'remote',
      priority: 50000 + i, vcn_key: null, drg_att_key: null,
      route_key: n.route_rule([n.region, 'hybrid', '%d' % i]), route_desc: 'Route to external CIDR %s' % remote_cidrs[i] }
    for i in std.range(0, std.length(remote_cidrs) - 1)
  ];
  local imports(suffix) = {
    [n.key_global('ROUTE-TO-HYBRID', [t.name, suffix])]: {
      priority: 50000 + i, action: 'ACCEPT',
      match_criteria: { match_type: 'DRG_ATTACHMENT_TYPE', attachment_type: t.type },
    }
    for i in std.range(0, std.length(types) - 1)
    for t in [types[i]]
  };
  local local_entries = [{ vcn: params.hub_cidr, name: 'hub', drg_att_key: hub_attachment }] + locals;
  local tables = if std.length(types) == 0 then {} else {
    [hc_table]: {
      display_name: n.display('drgrt', ['hub', 'hc']), is_ecmp_enabled: false,
      route_rules: if direct then {} else {
        [n.route_rule(['hybrid', 'hc', e.name])]: {
          destination: e.vcn, destination_type: 'CIDR_BLOCK', next_hop_drg_attachment_key: hub_attachment,
        } for e in local_entries
      },
    } + (if direct then { import_drg_route_distribution_key: key('DRGRD', 'HYBRID-LOCAL') } else {})
  };
  local resources = {
    customer_premises_equipments: {
      [key('CPE', name)]: c.customer_premises_equipments[name] + {
        display_name: n.display('cpe', ['hub', segment(name)]), cpe_device_shape_vendor_name: 'Other',
      }
      for name in std.objectFields(c.customer_premises_equipments)
    },
    ipsecs: {
      [key('IPSEC', name)]:
        local vpn = c.ipsecs[name];
        without(vpn, ['remote_cidrs', 'cpe_key']) + {
          display_name: n.display('ipsec', ['hub', segment(name)]), drg_key: drg_key, static_routes: vpn.remote_cidrs,
          [if std.objectHas(vpn, 'cpe_key') then 'cpe_key']: key('CPE', vpn.cpe_key),
        }
      for name in std.objectFields(c.ipsecs)
    },
    fast_connect_virtual_circuits: {
      [key('FCVC', name)]:
        local circuit = c.fast_connect_virtual_circuits[name];
        without(circuit, ['remote_cidrs']) + {
          display_name: n.display('fcvc', ['hub', segment(name)]),
          gateway_key: drg_key,
        }
      for name in std.objectFields(c.fast_connect_virtual_circuits)
    },
    cross_connect_groups: {
      [key('CCG', name)]: c.cross_connect_groups[name] + {
        display_name: n.display('ccg', ['hub', segment(name)]),
        cross_connects: {
          [n.key('CC', ['HUB', segment(name), segment(child)])]: c.cross_connect_groups[name].cross_connects[child] + {
            display_name: n.display('cc', ['hub', segment(name), segment(child)]),
          }
          for child in std.objectFields(c.cross_connect_groups[name].cross_connects)
        },
      }
      for name in std.objectFields(c.cross_connect_groups)
    },
  };
  local has_resources = std.length(std.flattenArrays([std.objectFields(resources[k]) for k in std.objectFields(resources)])) > 0;
  {
    route_entries: routes,
    network_overlay: if !has_resources then {} else {
      network_configuration+: { network_configuration_categories+: { '0-shared'+: {
        non_vcn_specific_gateways+: resources + {
          dynamic_routing_gateways+: { [drg_key]+: {
            default_drg_route_tables: { [t.selector]: { drg_route_table_id: hc_table } for t in types },
            drg_route_tables+: tables,
            drg_route_distributions+: {
              [n.key('DRGRD', ['HUB'])]+: { statements+: imports('HUB') },
            } + (if direct && std.length(types) > 0 then {
              [n.key('DRGRD', ['SPOKE'])]+: { statements+: imports('SPOKE') },
              [key('DRGRD', 'HYBRID-LOCAL')]: {
                display_name: n.display('drgrd', ['hub', 'hybrid-local']), distribution_type: 'IMPORT',
                statements: {
                  [n.key_global('HYBRID-LOCAL', [e.name])]: {
                    priority: i + 1, action: 'ACCEPT',
                    match_criteria: { match_type: 'DRG_ATTACHMENT_ID', attachment_type: 'VCN', drg_attachment_key: e.drg_att_key },
                  }
                  for i in std.range(0, std.length(local_entries) - 1)
                  for e in [local_entries[i]]
                },
              },
            } else {}),
          } },
        },
      } } },
    },
  }
