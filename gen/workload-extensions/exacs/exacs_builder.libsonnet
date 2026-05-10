local common = import '../../hub/hub_common.libsonnet';
local descriptions = import './descriptions.libsonnet';
local exadb_iam = import '../exadb/iam.libsonnet';
local exadb_observability = import '../exadb/observability.libsonnet';
local exadb_project_db = import '../exadb/project_db.libsonnet';
local products = import '../exadb/products.libsonnet';
local notification_emails = import '../../lib/notification_emails.libsonnet';

{
  metadata(params):: {
    network_mode: 'optional',
    default_subnets: {
      db: '/24',
      backup: '/24',
    },
    subnet_order: ['db', 'backup'],
  },

  render(params)::
    assert std.objectHas(params, 'topology') : 'exacs requires topology scope semantics';
    assert std.objectHas(params, 'config_params') : 'exacs requires config_params';
    local n = params.naming;
    local scope = params.topology;
    local scope_config =
      if std.objectHas(params, 'scope_config') then params.scope_config
      else {};
    local env = scope.scope_name;
    local plat = scope.platform_name;
    local dns = scope.dns;
    local cfg = params.config_params;
    local routing =
      if std.objectHas(params, 'routing') then params.routing
      else null;
    local has_hub = routing != null && std.objectHas(routing, 'hub') && routing.hub != null;
    local category_key = '%s-platform-%s' % [std.asciiLower(env), std.asciiLower(plat)];
    local vcn_key = n.key('VCN', [env, 'PLATFORM', plat]);
    local sgw_key = n.key('SGW', [env, 'PLATFORM', plat]);
    local drg_key = n.key('DRG', ['HUB']);
    local rt_key = n.key('RT', [env, 'PLATFORM', plat, 'GENERIC']);
    local sl_key = n.key('SL', [env, 'PLATFORM', plat, 'GENERIC']);
    local route_rules =
      {
        [n.route_rule([n.region, 'sgw'])]: {
          description: 'Route to Oracle Services Network through Service GW',
          destination: 'all-services',
          destination_type: 'SERVICE_CIDR_BLOCK',
          network_entity_key: sgw_key,
        },
      }
      + (if has_hub then {
        [n.route_rule([n.region, 'drg'])]: {
          description: 'Route to 0.0.0.0/0 through DRG',
          destination: '0.0.0.0/0',
          destination_type: 'CIDR_BLOCK',
          network_entity_key: drg_key,
        },
      } else {});
    local build_network_category() = {
      category_compartment_id: scope.network_compartment_key,
      vcns: {
        [vcn_key]: {
          display_name: n.display('vcn', [env, 'platform', plat]),
          cidr_blocks: [params.network.vcn],
          dns_label: n.dns_label(['vcn', n.region, 'lz', dns, plat]),
          block_nat_traffic: false,
          is_attach_drg: false,
          is_create_igw: false,
          is_ipv6enabled: false,
          is_oracle_gua_allocation_enabled: false,
          default_security_list: { egress_rules: [], ingress_rules: [] },
          network_security_groups: {},
          route_tables: {
            [rt_key]: {
              display_name: n.display('rt', [env, 'platform', plat, 'generic']),
              route_rules: route_rules,
            },
          },
          security_lists: {
            [sl_key]: {
              display_name: n.display('sl', [env, 'platform', plat, 'generic']),
              egress_rules: [
                {
                  description: 'Allow all outbound traffic',
                  dst: '0.0.0.0/0',
                  dst_type: 'CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
                {
                  description: 'Allow outbound traffic to Oracle Services Network over ALL protocols',
                  dst: 'all-services',
                  dst_type: 'SERVICE_CIDR_BLOCK',
                  protocol: 'ALL',
                  stateless: false,
                },
              ],
              ingress_rules: common._icmp_ingress_rules(
                params.network.vcn,
                management_cidr=if has_hub then routing.hub.destination else null
              ),
            },
          },
          subnets: {
            [n.key('SN', [env, 'PLATFORM', plat, 'DB'])]: {
              display_name: n.display('sn', [env, 'platform', plat, 'db']),
              cidr_block: params.network.subnets.db,
              dns_label: n.dns_label(['sn', n.region, dns, plat, 'db']),
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            },
            [n.key('SN', [env, 'PLATFORM', plat, 'BACKUP'])]: {
              display_name: n.display('sn', [env, 'platform', plat, 'backup']),
              cidr_block: params.network.subnets.backup,
              dns_label: n.dns_label(['sn', n.region, dns, plat, 'bck']),
              dhcp_options_key: 'default_dhcp_options',
              prohibit_internet_ingress: true,
              prohibit_public_ip_on_vnic: true,
              route_table_key: rt_key,
              security_list_keys: [sl_key],
            },
          },
          vcn_specific_gateways: {
            service_gateways: {
              [sgw_key]: {
                display_name: n.display('sgw', [env, 'platform', plat]),
                services: 'all-services',
              },
            },
          },
        },
      },
    };

    local supported_notification_keys = ['default', 'db_workloads', 'infra_workloads', 'projects'];
    local notification = notification_emails.validate('exacs', cfg, supported_notification_keys);

    local project_db = exadb_project_db.normalize({
      product: products.exacs,
      scope: scope,
      scope_config: scope_config,
      cfg: cfg,
    });

    local tag_key = 'tagns-lz-role.tag-lz-role';
    local product = products.exacs;
    local db_key = exadb_project_db.platform_db_key(product, n, scope);
    local infra_key = exadb_project_db.platform_infra_key(product, n, scope);
    local platform_overlay = exadb_project_db.platform_compartment_overlay({
      product: product,
      naming: n,
      descriptions: descriptions,
      scope: scope,
      tag_key: tag_key,
    });
    local project_db_key(env_name, project_name) =
      exadb_project_db.project_db_key(product, n, env_name, project_name);
    local project_db_name(env_name, project_name) =
      exadb_project_db.project_db_name(product, env_name, project_name);
    local project_db_overlay = exadb_project_db.project_compartment_overlay({
      product: product,
      naming: n,
      descriptions: descriptions,
      model: project_db,
      tag_key: tag_key,
    });
    local iam = exadb_iam.render({
      product: product,
      naming: n,
      descriptions: descriptions,
      model: project_db,
      tag_key: tag_key,
      project_db_key: project_db_key,
      project_db_name: project_db_name,
    });
    local observability = exadb_observability.render({
      product: product,
      naming: n,
      descriptions: descriptions,
      scope: scope,
      model: project_db,
      notification: notification,
      db_key: db_key,
      infra_key: infra_key,
      project_db_key: project_db_key,
    });

    {
      contributions: {
        iam: {
          compartments_configuration+: {
            compartments+: platform_overlay + project_db_overlay,
          },
          identity_domain_groups_configuration+: {
            groups+: iam.groups,
          },
          policies_configuration+: {
            supplied_policies+: iam.policies,
          },
        },
        observability_cis1: {
          alarms_configuration+: { alarms+: observability.alarms },
          events_configuration+: { event_rules+: observability.event_rules },
          notifications_configuration+: { topics+: observability.topics },
        },
        observability_cis2: {
          alarms_configuration+: { alarms+: observability.alarms },
          events_configuration+: { event_rules+: observability.event_rules },
          notifications_configuration+: { topics+: observability.topics },
        },
        [if params.network != null then 'network_pre']: {
          network_configuration+: {
            network_configuration_categories+: {
              [category_key]: build_network_category(),
            },
          },
        },
      },
    },
}
