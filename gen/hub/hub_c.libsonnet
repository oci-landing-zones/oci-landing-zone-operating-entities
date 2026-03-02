// hub_c.libsonnet — Hub C builder (third-party firewall with NLB).
// Subnets: untrust, trust, lb, mgmt, mon, dns.
// DRG ingress route table, NLBs (trust + untrust), L7 LB.
//
// function(n, hub_config, vcn_list, lb_backends) -> { pre, post, spoke_route_tables, post_route_tables, fw_nsg_key, has_spoke_natgw, post_route_entity_id, post_route_entity_desc, backends }
//
// n:          naming object from naming('fra')
// hub_config: { kind: 'hub_c', network: { vcn: '...', subnets: { untrust, trust, lb, mgmt, mon, dns } } }
// vcn_list:   [{name: 'prod', cidr: '10.0.64.0/21'}, ...] — (unused by Hub C, no NFW)
// lb_backends: { backend1_ip: '10.0.64.10', backend2_ip: '10.0.64.20' } — example LB backend IPs
local common = import 'hub_common.libsonnet';
local lb = import 'hub_lb.libsonnet';

// NLB builder (trust/untrust) — mirrors gen/addons/oci-hub-models/hub_c/hub_c_nlb.libsonnet
// but uses naming object for key generation.
local nlb_backend(n, zone, suffix, target_id) = {
  [n.key('FW-BACKEND', [zone, suffix])]: {
    name: n.display('fw-backend', [zone, std.asciiLower(suffix)]),
    port: '0',
    is_backup: 'false',
    is_drain: 'false',
    is_offline: 'false',
    target_id: target_id,
    weight: '1',
  },
};

local nlb_backends(n, zone, ip1=null, ip2=null) =
  if ip1 == null && ip2 == null then {}
  else nlb_backend(n, zone, '01', ip1) + nlb_backend(n, zone, '02', ip2);

local nlb(n, zone, backends={}) = {
  [n.key('NLB', ['HUB', std.asciiUpper(zone)])]: {
    display_name: n.display('nlb', ['hub', zone]),
    enable_symmetric_hashing: true,
    is_preserve_source_destination: true,
    is_private: true,
    network_security_group_ids: [n.key('NSG', ['HUB', std.asciiUpper(zone), 'NLB'])],
    subnet_id: n.key('SN', ['HUB', std.asciiUpper(zone)]),
    listeners: {
      [n.key('NLBLSNR', ['HUB', std.asciiUpper(zone)])]: {
        name: n.display('listener', ['hub', zone]),
        protocol: 'ANY',
        port: '0',
        backend_set: {
          name: n.display('backend-set', ['hub', zone]),
          backends: backends,
          health_checker: {
            protocol: 'TCP',
            port: '22',
            interval_in_millis: '10000',
            retries: '3',
            timeout_in_millis: '3000',
          },
        },
      },
    },
  },
};

function(n, hub_config, vcn_list=[], lb_backends=null)
  local vcn_cidr = hub_config.network.vcn;
  local subnets = hub_config.network.subnets;
  local bastion_ip = common.bastion_ip_from_mgmt(subnets.mgmt);

  // Placeholder OCID strings for post-deployment routes
  local untrust_nlb_ocid = 'UNTRUST NLB PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljtgvl...';
  local trust_nlb_ocid = 'TRUST NLB PRIVATE IP OCID, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljt53k...';

  {
    pre: {
      network_configuration: {
        default_compartment_id: 'CMP-LZ-NETWORK-KEY',
        default_enable_cis_checks: false,

        network_configuration_categories: {
          '0-shared': {
            category_compartment_id: 'CMP-LZ-NETWORK-KEY',

            vcns: {
              [n.key('VCN', ['HUB'])]: common._hub_vcn(n, vcn_cidr, subnets, {
                [n.key('SN', ['HUB', 'UNTRUST'])]: {
                  display_name: n.display('sn', ['hub', 'untrust']),
                  dns_label: n.dns_label(['sn', n.region, 'hub', 'untrust']),
                  cidr_block: subnets.untrust,
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: false,
                  prohibit_public_ip_on_vnic: false,
                  route_table_key: n.key('RT', ['HUB', 'UNTRUST']),
                  security_list_keys: [n.key('SL', ['HUB', 'UNTRUST'])],
                },

                [n.key('SN', ['HUB', 'TRUST'])]: {
                  display_name: n.display('sn', ['hub', 'trust']),
                  dns_label: n.dns_label(['sn', n.region, 'hub', 'trust']),
                  cidr_block: subnets.trust,
                  dhcp_options_key: 'default_dhcp_options',
                  prohibit_internet_ingress: true,
                  prohibit_public_ip_on_vnic: true,
                  route_table_key: n.key('RT', ['HUB', 'TRUST']),
                  security_list_keys: [n.key('SL', ['HUB', 'TRUST'])],
                },
              }) + {

                route_tables: {
                  [n.key('RT', ['HUB', 'IGW'])]: {
                    display_name: n.display('rt', ['hub', 'igw']),
                    route_rules: {},
                  },

                  [n.key('RT', ['HUB', 'INGRESS'])]: {
                    display_name: n.display('rt', ['hub', 'ingress']),
                    route_rules: {},
                  },

                  [n.key('RT', ['HUB', 'LB'])]: {
                    display_name: n.display('rt', ['hub', 'lb']),
                    route_rules: {},
                  },

                  [n.key('RT', ['HUB', 'MGMT'])]: {
                    display_name: n.display('rt', ['hub', 'mgmt']),
                    route_rules: common._services_route_via_sgw(n),
                  },

                  [n.key('RT', ['HUB', 'TRUST'])]: {
                    display_name: n.display('rt', ['hub', 'trust']),
                    route_rules: {},
                  },

                  [n.key('RT', ['HUB', 'UNTRUST'])]: {
                    display_name: n.display('rt', ['hub', 'untrust']),
                    route_rules: common._internet_route_via_igw(n),
                  },
                },

                default_security_list: common._empty_default_security_list,

                security_lists: common._icmp_sl(n, ['HUB', 'LB'], vcn_cidr)
                  + common._icmp_sl(n, ['HUB', 'TRUST'], vcn_cidr)
                  + common._icmp_sl(n, ['HUB', 'UNTRUST'], vcn_cidr)
                  + common._mgmt_security_list(n, vcn_cidr, bastion_ip),

                network_security_groups: {
                  [n.key('NSG', ['HUB', 'LB'])]: {
                    display_name: n.display('nsg', ['hub', 'lb']),
                    egress_rules: common._nsg_egress_tcp_only,

                    ingress_rules: {
                      http_80: {
                        description: 'Allow inbound traffic from Hub Untrust subnet over HTTP',
                        src: subnets.untrust,
                        src_type: 'CIDR_BLOCK',
                        dst_port_max: 80,
                        dst_port_min: 80,
                        protocol: 'TCP',
                        stateless: false,
                      },

                      https_443: {
                        description: 'Allow inbound traffic from Hub Untrust subnet over HTTPS',
                        src: subnets.untrust,
                        src_type: 'CIDR_BLOCK',
                        dst_port_max: 443,
                        dst_port_min: 443,
                        protocol: 'TCP',
                        stateless: false,
                      },
                    },
                  },

                  [n.key('NSG', ['HUB', 'TRUST', 'FW'])]: {
                    display_name: n.display('nsg', ['hub', 'trust', 'fw']),
                    egress_rules: common._nsg_egress_all_protocols,

                    ingress_rules: {
                      from_trust_nlb_http: {
                        description: 'Allow inbound from NSG %s over HTTP' % n.display('nsg', ['hub', 'trust', 'nlb']),
                        src: n.key('NSG', ['HUB', 'TRUST', 'NLB']),
                        src_type: 'NETWORK_SECURITY_GROUP',
                        dst_port_max: 80,
                        dst_port_min: 80,
                        protocol: 'TCP',
                        stateless: false,
                      },

                      from_trust_nlb_https: {
                        description: 'Allow inbound from NSG %s over HTTPS' % n.display('nsg', ['hub', 'trust', 'nlb']),
                        src: n.key('NSG', ['HUB', 'TRUST', 'NLB']),
                        src_type: 'NETWORK_SECURITY_GROUP',
                        dst_port_max: 443,
                        dst_port_min: 443,
                        protocol: 'TCP',
                        stateless: false,
                      },

                      from_trust_nlb_icmp: {
                        description: 'Allow ICMP type 8 (Echo) from NSG %s' % n.display('nsg', ['hub', 'trust', 'nlb']),
                        src: n.key('NSG', ['HUB', 'TRUST', 'NLB']),
                        src_type: 'NETWORK_SECURITY_GROUP',
                        protocol: 'ICMP',
                        icmp_type: 8,
                        icmp_code: 0,
                        stateless: false,
                      },

                      from_trust_nlb_ssh: {
                        description: 'Allow inbound from NSG %s over SSH' % n.display('nsg', ['hub', 'trust', 'nlb']),
                        src: n.key('NSG', ['HUB', 'TRUST', 'NLB']),
                        src_type: 'NETWORK_SECURITY_GROUP',
                        dst_port_max: 22,
                        dst_port_min: 22,
                        protocol: 'TCP',
                        stateless: false,
                      },
                    },
                  },

                  [n.key('NSG', ['HUB', 'TRUST', 'NLB'])]: {
                    display_name: n.display('nsg', ['hub', 'trust', 'nlb']),
                    ingress_rules: {},
                    egress_rules: common._nsg_egress_all_protocols,
                  },

                  [n.key('NSG', ['HUB', 'UNTRUST', 'FW'])]: {
                    display_name: n.display('nsg', ['hub', 'untrust', 'fw']),
                    egress_rules: common._nsg_egress_all_protocols,

                    ingress_rules: {
                      from_untrust_nlb: {
                        description: 'Allow inbound from NSG %s over TCP ALL' % n.display('nsg', ['hub', 'untrust', 'nlb']),
                        src: n.key('NSG', ['HUB', 'UNTRUST', 'NLB']),
                        src_type: 'NETWORK_SECURITY_GROUP',
                        protocol: 'TCP',
                        stateless: false,
                      },
                    },
                  },

                  [n.key('NSG', ['HUB', 'UNTRUST', 'NLB'])]: {
                    display_name: n.display('nsg', ['hub', 'untrust', 'nlb']),
                    egress_rules: common._nsg_egress_all_protocols,

                    ingress_rules: {
                      https_443: {
                        description: 'Allow inbound traffic from 0.0.0.0/0 over HTTPS',
                        src: '0.0.0.0/0',
                        src_type: 'CIDR_BLOCK',
                        dst_port_max: 443,
                        dst_port_min: 443,
                        protocol: 'TCP',
                        stateless: false,
                      },

                      http_80: {
                        description: 'Allow inbound traffic from 0.0.0.0/0 over HTTP',
                        src: '0.0.0.0/0',
                        src_type: 'CIDR_BLOCK',
                        dst_port_max: 80,
                        dst_port_min: 80,
                        protocol: 'TCP',
                        stateless: false,
                      },
                    },
                  },
                },

                vcn_specific_gateways: {
                  internet_gateways: common._internet_gateway(n, ['HUB'], route_table_key=n.key('RT', ['HUB', 'IGW'])),
                  service_gateways: common._service_gateway(n, ['HUB']),
                },
              },
            },

            non_vcn_specific_gateways: {
              dynamic_routing_gateways: common._firewall_hub_drg(n),
              l7_load_balancers: lb._l7_load_balancer(n, lb_backends),
            },
          },
        },
      },

      nlb_configuration: {
        default_compartment_id: 'CMP-LZ-NETWORK-KEY',

        nlbs: nlb(n, 'trust') + nlb(n, 'untrust'),
      },
    },

    post: {
      network_configuration+: {
        network_configuration_categories+: {
          '0-shared'+: {
            vcns+: {
              [n.key('VCN', ['HUB'])]+: {
                route_tables+: {
                  [n.key('RT', ['HUB', 'IGW'])]+: {
                    route_rules: {
                      [n.route_rule([n.region, 'igw', 'ingress'])]: {
                        description: "Route to Public LoadBalancer's subnet through Untrust NLB and Firewalls",
                        destination: subnets.lb,
                        destination_type: 'CIDR_BLOCK',
                        network_entity_id: untrust_nlb_ocid,
                      },
                    },
                  },

                  [n.key('RT', ['HUB', 'INGRESS'])]+: {
                    route_rules: {
                      [n.route_rule([n.region, 'internet'])]: {
                        description: 'Route to the Internet through Trust NLB and Firewalls',
                        destination: '0.0.0.0/0',
                        destination_type: 'CIDR_BLOCK',
                        network_entity_id: trust_nlb_ocid,
                      },
                    },
                  },

                  [n.key('RT', ['HUB', 'LB'])]+: {
                    route_rules+: {
                      [n.route_rule([n.region, 'internet'])]: {
                        description: 'Route to the Internet through Untrust NLB and Firewalls',
                        destination: '0.0.0.0/0',
                        destination_type: 'CIDR_BLOCK',
                        network_entity_id: untrust_nlb_ocid,
                      },
                    },
                  },

                  [n.key('RT', ['HUB', 'MGMT'])]+: {
                    route_rules+: {
                      [n.route_rule([n.region, 'internet'])]: {
                        description: 'Route to the Internet through Trust NLB and Firewalls',
                        destination: '0.0.0.0/0',
                        destination_type: 'CIDR_BLOCK',
                        network_entity_id: trust_nlb_ocid,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    spoke_route_tables: [
      n.key('RT', ['HUB', 'LB']),
      n.key('RT', ['HUB', 'MGMT']),
      n.key('RT', ['HUB', 'TRUST']),
    ],

    post_route_tables: [
      n.key('RT', ['HUB', 'INGRESS']),
    ],

    fw_nsg_key: n.key('NSG', ['HUB', 'TRUST', 'NLB']),

    has_spoke_natgw: false,

    post_route_entity_id: trust_nlb_ocid,
    post_route_entity_desc: 'Trust NLB and Firewalls',

    // NLB backend builder for third-party firewall integration
    backends: {
      nlb_backends:: nlb_backends,
      nlb:: nlb,

      build(fw1_trust_ip, fw2_trust_ip, fw1_untrust_ip, fw2_untrust_ip):: {
        nlb_configuration+: {
          nlbs:
            nlb(n, 'trust', nlb_backends(n, 'trust', fw1_trust_ip, fw2_trust_ip))
            + nlb(n, 'untrust', nlb_backends(n, 'untrust', fw1_untrust_ip, fw2_untrust_ip)),
        },
      },
    },
  }
