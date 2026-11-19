// Custom hub subnets share MGMT routing and security, including firewall return paths.
local lz = import 'gen/landing_zone.libsonnet';
local defaults = import 'gen/defaults.libsonnet';
local common = import 'gen/hub/hub_common.libsonnet';
local naming = import 'gen/naming.libsonnet';
local normalize = (import 'gen/config.libsonnet').normalize;
local check(kind) =
  local config = defaults[kind] {
    hub+: { network+: { custom_subnets: { tools: '10.0.6.0/24', 'ops-app': '10.0.7.0/24' } } },
  };
  local output = lz(config).network.network_configuration.network_configuration_categories['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'];
  local mgmt = output.subnets['SN-FRA-LZ-HUB-MGMT-KEY'];
  local tools = output.subnets['SN-FRA-LZ-HUB-TOOLS-KEY'];
  local ops = output.subnets['SN-FRA-LZ-HUB-OPS-APP-KEY'];
  local tools_only = common._hub_vcn(naming('fra'), '10.0.0.0/21',
    normalize(defaults[kind]).hub.network.subnets + { tools: '10.0.6.0/24' });
  assert tools.dns_label == tools_only.subnets['SN-FRA-LZ-HUB-TOOLS-KEY'].dns_label;
  assert tools.cidr_block == '10.0.6.0/24';
  assert tools.route_table_key == mgmt.route_table_key;
  assert ops.route_table_key == mgmt.route_table_key;
  assert tools.security_list_keys == mgmt.security_list_keys;
  assert tools.prohibit_internet_ingress && tools.prohibit_public_ip_on_vnic;
  assert std.length(tools.dns_label) <= 15;
  assert std.length(ops.dns_label) <= 15 && ops.dns_label != tools.dns_label;
  assert if std.member(['hub_a', 'hub_b'], kind) then
    local rules = output.route_tables['RT-FRA-LZ-HUB-NATGW-KEY'].route_rules;
    local returns = [r for r in std.objectValues(rules) if r.destination == tools.cidr_block];
    std.length(returns) == 1 && returns[0].network_entity_id ==
      (if kind == 'hub_a' then 'NFW-FRA-LZ-HUB-INT-KEY' else 'NFW-FRA-LZ-HUB-KEY')
    else true;
  true;
{ [kind]: check(kind) for kind in ['hub_a', 'hub_b', 'hub_c', 'hub_e'] }
