// Shared L7 Load Balancer, LB security list, and LB NSG fragments.
// Used by all hub models (A, B, C, E).
local ip = import 'subnetting.libsonnet';

{
  _sl_lb:: {
    'SL-FRA-LZ-HUB-LB-KEY': {
      display_name: 'sl-fra-lz-hub-lb',
      egress_rules: [],

      ingress_rules: [
        {
          description: 'ICMP type 3 code 4',
          src: '0.0.0.0/0',
          src_type: 'CIDR_BLOCK',
          protocol: 'ICMP',
          icmp_type: 3,
          icmp_code: 4,
          stateless: false,
        },
        {
          description: 'ICMP type 3',
          src: ip.hub_vcn,
          src_type: 'CIDR_BLOCK',
          protocol: 'ICMP',
          icmp_type: 3,
          stateless: false,
        },
        {
          description: 'ICMP type 8 (Echo)',
          src: ip.hub_vcn,
          src_type: 'CIDR_BLOCK',
          protocol: 'ICMP',
          icmp_type: 8,
          icmp_code: 0,
          stateless: false,
        },
      ],
    },
  },

  _nsg_lb:: {
    'NSG-FRA-LZ-HUB-LB-KEY': {
      display_name: 'nsg-fra-lz-hub-lb',

      egress_rules: {
        anywhere: {
          description: 'Allow all outbound traffic to 0.0.0.0/0 over all protocols',
          dst: '0.0.0.0/0',
          dst_type: 'CIDR_BLOCK',
          protocol: 'TCP',
          stateless: false,
        },
      },

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

        http_443: {
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

  _l7_lb:: {
    'LB-FRA-LZ-PROD-01-KEY': {
      display_name: 'lb-fra-lz-prod-01',
      ip_mode: 'IPV4',
      is_private: false,
      subnet_ids: [],
      subnet_keys: ['SN-FRA-LZ-HUB-LB-KEY'],
      network_security_group_keys: ['NSG-FRA-LZ-HUB-LB-KEY'],
      shape: 'flexible',

      shape_details: {
        maximum_bandwidth_in_mbps: 10,
        minimum_bandwidth_in_mbps: 10,
      },

      listeners: {
        'LBLSNR-FRA-LZ-PROD-01-KEY': {
          connection_configuration: {
            idle_timeout_in_seconds: 1200,
          },
          name: 'lblsnr-fra-lz-prod-01',
          default_backend_set_key: 'LBBKST-FRA-LZ-PROD-01-KEY',
          port: '80',
          protocol: 'HTTP',
          routing_policy_key: 'LBRT-FRA-LZ-PROD-01-KEY',
        },
      },

      backend_sets: {
        'LBBKST-FRA-LZ-PROD-01-KEY': {
          name: 'lbbkst-fra-lz-prod-01',
          policy: 'ROUND_ROBIN',

          backends: {
            'LBBE-FRA-LZ-PROD-01-KEY': {
              ip_address: ip.prod_web_backend1_ip,
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

        'LBBKST-FRA-LZ-PROD-02-KEY': {
          name: 'lbbkst-fra-lz-prod-02',
          policy: 'ROUND_ROBIN',

          backends: {
            'LBBE-FRA-LZ-PROD-02-KEY': {
              ip_address: ip.prod_web_backend2_ip,
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
        'LBRT-FRA-LZ-PROD-01-KEY': {
          name: 'lbrt_fra_lz_prod_01',
          condition_language_version: 'V1',

          rules: {
            lbrouterule_testapp1: {
              actions: {
                'action-1': {
                  backend_set_key: 'LBBKST-FRA-LZ-PROD-01-KEY',
                  name: 'FORWARD_TO_BACKENDSET',
                },
              },
              condition: "all(http.request.url.path sw (i '/testapp1/'))",
              name: 'testapp1',
            },

            lbrouterule_testapp2: {
              actions: {
                'action-2': {
                  backend_set_key: 'LBBKST-FRA-LZ-PROD-02-KEY',
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
