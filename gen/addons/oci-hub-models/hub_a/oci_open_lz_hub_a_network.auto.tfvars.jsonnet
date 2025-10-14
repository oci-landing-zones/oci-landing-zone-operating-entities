local firewall_policy = import '../network_firewall_policy_example.libsonnet';
local hub_a = import 'hub_a.libsonnet';

hub_a {
  network_configuration+: {
    network_configuration_categories+: {
      '0-shared'+: {
        non_vcn_specific_gateways+: {
          network_firewalls_configuration: {
            network_firewalls: {
              'NFW-FRA-LZP-HUB-DMZ-KEY': {
                display_name: 'nfw-fra-lzp-hub-dmz',
                ipv4address: '10.0.0.10',
                subnet_key: 'SN-FRA-LZP-HUB-FW-DMZ-KEY',
                network_firewall_policy_key: 'NFWPCY-FRA-LZP-HUB-DMZ-POL1-KEY',
              },
              'NFW-FRA-LZP-HUB-INT-KEY': {
                display_name: 'nfw-fra-lzp-hub-int',
                ipv4address: '10.0.2.10',
                subnet_key: 'SN-FRA-LZP-HUB-FW-INT-KEY',
                network_firewall_policy_key: 'NFWPCY-FRA-LZP-HUB-INT-POL1-KEY',
              },
            },
            network_firewall_policies: firewall_policy,
          },
          l7_load_balancers: {
            'LB-FRA-LZP-HUB-01-KEY': {
              backend_sets: {
                'LBBKST-FRA-LZP-HUB-00-KEY': {
                  health_checker: {
                    interval_ms: 10000,
                    is_force_plain_text: true,
                    port: 80,
                    protocol: 'HTTP',
                    retries: 3,
                    return_code: 200,
                    timeout_in_millis: 3000,
                    url_path: '/',
                  },
                  name: 'lbbkst-fra-lzp-hub-01-00',
                  policy: 'LEAST_CONNECTIONS',
                },
              },
              display_name: 'lb-fra-lzp-hub-01',
              ip_mode: 'IPV4',
              is_private: false,
              listeners: {
                'LBLSNR-FRA-LZP-HUB-011-80-KEY': {
                  connection_configuration: {
                    idle_timeout_in_seconds: 1200,
                  },
                  default_backend_set_key: 'LBBKST-FRA-LZP-HUB-00-KEY',
                  name: 'lblsnr-fra-lzp-hub-01-80',
                  port: '80',
                  protocol: 'HTTP',
                },
              },
              network_security_group_keys: [
                'NSG-FRA-LZP-HUB-LB-KEY',
              ],
              shape: 'flexible',
              shape_details: {
                maximum_bandwidth_in_mbps: 10,
                minimum_bandwidth_in_mbps: 10,
              },
              subnet_ids: [],
              subnet_keys: [
                'SN-FRA-LZP-HUB-LB-KEY',
              ],
            },
          },
        },
      },
    },
  },
}
