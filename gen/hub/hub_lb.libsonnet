// hub_lb.libsonnet — L7 Load Balancer and LB NSG fragments.
// Used by all hub models (A, B, C, E).
//
// PURE FUNCTION LIBRARY — no module-level imports of config or subnetting.
// Every function accepts a naming object (n) and explicit values.
//
// Exports:
//   _lb_nsg(n)                      — NSG for LB (TCP egress, HTTP/HTTPS ingress from 0.0.0.0/0)
//   _l7_load_balancer(n, backends) — L7 LB with routing policies and backend sets
//
// Architecture notes:
//   All hubs share the same LB components. Hub-specific NSG rules for
//   spoke ingress (FW/NLB NSGs) are defined in each hub's own file.
local common = import 'hub_common.libsonnet';

{
  // --- LB NSG ---

  _lb_nsg(n):: {
    [n.key('NSG', ['HUB', 'LB'])]: {
      display_name: n.display('nsg', ['hub', 'lb']),

      egress_rules: common._nsg_egress_tcp_only,

      ingress_rules: {
        http_80: {
          description: 'Allow inbound traffic from 0.0.0.0/0 over HTTP',
          src: '0.0.0.0/0',
          src_type: 'CIDR_BLOCK',
          dst_port_max: 80,
          dst_port_min: 80,
          protocol: 'TCP',
          stateless: false,
        },

        https_443: {
          description: 'Allow inbound traffic from 0.0.0.0/0 over HTTPS',
          src: '0.0.0.0/0',
          src_type: 'CIDR_BLOCK',
          dst_port_max: 443,
          dst_port_min: 443,
          protocol: 'TCP',
          stateless: false,
        },
      },
    },
  },

  // --- L7 Load Balancer ---
  // backends: required object { backend1_ip, backend2_ip }.
  // Callers must decide whether to provide subnet-derived examples or explicit placeholders.

  _l7_load_balancer(n, backends)::
    assert backends != null : 'L7 load balancer backends must be provided explicitly';
    local be = backends;
    {
      [n.key('LB', ['PROD', '01'])]: {
        display_name: n.display('lb', ['prod', '01']),
        ip_mode: 'IPV4',
        is_private: false,
        subnet_ids: [],
        subnet_keys: [n.key('SN', ['HUB', 'LB'])],
        network_security_group_keys: [n.key('NSG', ['HUB', 'LB'])],
        shape: 'flexible',

        shape_details: {
          maximum_bandwidth_in_mbps: 10,
          minimum_bandwidth_in_mbps: 10,
        },

        listeners: {
          [n.key('LBLSNR', ['PROD', '01'])]: {
            connection_configuration: {
              idle_timeout_in_seconds: 1200,
            },
            name: n.display('lblsnr', ['prod', '01']),
            default_backend_set_key: n.key('LBBKST', ['PROD', '01']),
            port: '80',
            protocol: 'HTTP',
            routing_policy_key: n.key('LBRT', ['PROD', '01']),
          },
        },

        backend_sets: {
          [n.key('LBBKST', ['PROD', '01'])]: {
            name: n.display('lbbkst', ['prod', '01']),
            policy: 'ROUND_ROBIN',

            backends: {
              [n.key('LBBE', ['PROD', '01'])]: {
                ip_address: be.backend1_ip,
                port: 80,
              },
            },

            health_checker: {
              interval_ms: 10000,
              is_force_plain_text: true,
              port: 80,
              protocol: 'HTTP',
              retries: 3,
              return_code: 200,
              timeout_in_millis: 3000,
              url_path: '/testapp1/',
            },
          },

          [n.key('LBBKST', ['PROD', '02'])]: {
            name: n.display('lbbkst', ['prod', '02']),
            policy: 'ROUND_ROBIN',

            backends: {
              [n.key('LBBE', ['PROD', '02'])]: {
                ip_address: be.backend2_ip,
                port: 80,
              },
            },

            health_checker: {
              interval_ms: 10000,
              is_force_plain_text: true,
              port: 80,
              protocol: 'HTTP',
              retries: 3,
              return_code: 200,
              timeout_in_millis: 3000,
              url_path: '/testapp2/',
            },
          },
        },

        routing_policies: {
          [n.key('LBRT', ['PROD', '01'])]: {
            name: std.strReplace(n.display('lbrt', ['prod', '01']), '-', '_'),
            condition_language_version: 'V1',

            rules: {
              lbrouterule_testapp1: {
                actions: {
                  'action-1': {
                    backend_set_key: n.key('LBBKST', ['PROD', '01']),
                    name: 'FORWARD_TO_BACKENDSET',
                  },
                },
                condition: "all(http.request.url.path sw (i '/testapp1/'))",
                name: 'testapp1',
              },

              lbrouterule_testapp2: {
                actions: {
                  'action-2': {
                    backend_set_key: n.key('LBBKST', ['PROD', '02']),
                    name: 'FORWARD_TO_BACKENDSET',
                  },
                },
                condition: "all(http.request.url.path sw (i '/testapp2/'))",
                name: 'testapp2',
              },
            },
          },
        },
      },
    },
}
