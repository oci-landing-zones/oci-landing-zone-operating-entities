// gen/builders/iam/tenancy_policies.libsonnet
// Tenancy and shared Landing Zone policy construction.

local project_policies = import './project_policies.libsonnet';
local role_policies = import './role_policies.libsonnet';

function(ctx)
  local config = ctx.config;
  local n = ctx.n;
  local desc = ctx.desc;
  local domain_grp = ctx.domain_grp;
  local tenancy_allow = ctx.tenancy_allow;
  local tenancy_allow_where = ctx.tenancy_allow_where;
  local grp_auditors = ctx.grp_auditors;
  local grp_cost = ctx.grp_cost;
  local grp_iam = ctx.grp_iam;
  local grp_network = ctx.grp_network;
  local grp_security_tenancy = ctx.grp_security_tenancy;

  // Combined group list for generic admin policy statement
  local oe_network_groups =
    if ctx.topo.mode == 'multi_oe' then [
      domain_grp(ctx.oe_grp_name(oe, 'network'))
      for oe in ctx.topo.ordered_oe_entries()
    ] else [];
  local generic_admin_groups = [
    domain_grp(grp_iam),
    domain_grp(grp_auditors),
    domain_grp(grp_security_tenancy),
    domain_grp(grp_network),
  ] + oe_network_groups;
  local generic_admin_stmt = 'allow group %s' % std.join(', ', generic_admin_groups);

  // Service policy: realm-aware FSS and Object Storage service identifiers.
  local fss_service = ctx.realm_constants.service_identifiers.fss;
  local obj_service = ctx.realm_constants.service_identifiers.objectstorage(config.region);
  local usage_report_tenancy_ocid =
    if std.objectHas(ctx.realm_constants, 'usage_report_tenancy_ocid') then
      ctx.realm_constants.usage_report_tenancy_ocid
    else null;
  local usage_report_cross_tenancy_statements =
    if usage_report_tenancy_ocid != null then [
      'define tenancy usage-report as %s' % usage_report_tenancy_ocid,
      "endorse group %s to read objects in tenancy usage-report" % domain_grp(grp_cost),
    ] else [];

  {
    enable_cis_benchmark_checks: 'false',
    supplied_policies: {
      [n.key_tenancy('PCY', ['AUDITING', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['AUDITING', 'ADMIN']),
        description: desc.policy.grants(grp_auditors, 'read-only audit access', 'the tenancy'),
        compartment_id: 'TENANCY-ROOT',
        statements: [
          tenancy_allow(grp_auditors, 'inspect', 'all-resources'),
          tenancy_allow(grp_auditors, 'read', 'instances'),
          tenancy_allow(grp_auditors, 'read', 'load-balancers'),
          tenancy_allow(grp_auditors, 'read', 'buckets'),
          tenancy_allow(grp_auditors, 'read', 'nat-gateways'),
          tenancy_allow(grp_auditors, 'read', 'public-ips'),
          tenancy_allow(grp_auditors, 'read', 'file-family'),
          tenancy_allow(grp_auditors, 'read', 'instance-configurations'),
          tenancy_allow(grp_auditors, 'read', 'network-security-groups'),
          tenancy_allow(grp_auditors, 'read', 'resource-availability'),
          tenancy_allow(grp_auditors, 'read', 'audit-events'),
          tenancy_allow(grp_auditors, 'read', 'users'),
          tenancy_allow(grp_auditors, 'use', 'cloud-shell'),
          tenancy_allow(grp_auditors, 'read', 'vss-family'),
          tenancy_allow(grp_auditors, 'read', 'usage-budgets'),
          tenancy_allow(grp_auditors, 'read', 'usage-reports'),
          tenancy_allow(grp_auditors, 'read', 'data-safe-family'),
          tenancy_allow(grp_auditors, 'read', 'vaults'),
          tenancy_allow(grp_auditors, 'read', 'keys'),
          tenancy_allow(grp_auditors, 'read', 'tag-namespaces'),
          tenancy_allow(grp_auditors, 'read', 'serviceconnectors'),
          tenancy_allow_where(grp_auditors, 'use', 'ons-family', "where any {request.operation!=/Create*/, request.operation!=/Update*/, request.operation!=/Delete*/, request.operation!=/Change*/}"),
        ],
      },

      [n.key_tenancy('PCY', ['COST', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['COST', 'ADMIN']),
        description: desc.policy.grants(grp_cost, 'budget and usage report management access', 'the tenancy'),
        compartment_id: 'TENANCY-ROOT',
        statements: usage_report_cross_tenancy_statements + [
          tenancy_allow(grp_cost, 'manage', 'usage-report'),
          tenancy_allow(grp_cost, 'manage', 'usage-budgets'),
        ],
      },

      [n.key_tenancy('PCY', ['GENERIC', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['GENERIC', 'ADMIN']),
        description: desc.policy.grants('defined administration groups', 'shared service usage', 'the tenancy'),
        compartment_id: 'TENANCY-ROOT',
        statements: [
          '%s to use cloud-shell in tenancy' % generic_admin_stmt,
          '%s to use cloud-shell-public-network in tenancy' % generic_admin_stmt,
          '%s to read usage-budgets in tenancy' % generic_admin_stmt,
          '%s to read usage-reports in tenancy' % generic_admin_stmt,
          '%s to read objectstorage-namespaces in tenancy' % generic_admin_stmt,
          "allow any-user to inspect tag-namespaces in tenancy where target.tag-namespace.name='tagns-lz-role'",
        ],
      },

      [n.key_tenancy('PCY', ['IAM', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['IAM', 'ADMIN']),
        description: desc.policy.grants(grp_iam, 'IAM administration access', 'the tenancy'),
        compartment_id: 'TENANCY-ROOT',
        statements: [
          tenancy_allow(grp_iam, 'manage', 'policies'),
          tenancy_allow(grp_iam, 'manage', 'users'),
          tenancy_allow(grp_iam, 'inspect', 'groups'),
          tenancy_allow_where(grp_iam, 'manage', 'groups', "where all {target.group.name != 'Administrators'}"),
          tenancy_allow(grp_iam, 'manage', 'identity-providers'),
          tenancy_allow(grp_iam, 'manage', 'dynamic-groups'),
          tenancy_allow(grp_iam, 'manage', 'authentication-policies'),
          tenancy_allow(grp_iam, 'manage', 'network-sources'),
          tenancy_allow(grp_iam, 'manage', 'quota'),
          tenancy_allow(grp_iam, 'manage', 'tag-defaults'),
          tenancy_allow(grp_iam, 'manage', 'tag-namespaces'),
          tenancy_allow(grp_iam, 'manage', 'orm-jobs'),
          tenancy_allow(grp_iam, 'manage', 'orm-config-source-providers'),
        ],
      },

    } + role_policies(ctx) + project_policies(ctx) + {
      [n.key_tenancy('PCY', ['SECURITY', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['SECURITY', 'ADMIN']),
        description: desc.policy.grants(grp_security_tenancy, 'security service administration access', 'the tenancy'),
        compartment_id: 'TENANCY-ROOT',
        statements: [
          tenancy_allow(grp_security_tenancy, 'manage', 'cloudevents-rules'),
          tenancy_allow(grp_security_tenancy, 'manage', 'cloud-guard-family'),
          tenancy_allow(grp_security_tenancy, 'read', 'tenancies'),
        ],
      },

      [n.key_tenancy('PCY', ['SERVICES', 'ADMIN'])]: {
        name: n.display_tenancy('PCY', ['SERVICES', 'ADMIN']),
        description: desc.policy.grants('supported OCI services', 'required Landing Zone service access', 'the tenancy'),
        compartment_id: 'TENANCY-ROOT',
        statements: [
          "allow service cloudguard to manage cloudevents-rules in tenancy where target.rule.type='managed'",
          'allow service cloudguard to read tenancies in tenancy',
          'allow service cloudguard to read all-resources in tenancy',
          'allow service cloudguard to use network-security-groups in tenancy',
          "allow any-user to { WLP_BOM_READ, WLP_CONFIG_READ } in tenancy where all { request.principal.id = target.agent.id, request.principal.type = 'workloadprotectionagent'}",
          "endorse any-user to { WLP_LOG_CREATE, WLP_METRICS_CREATE, WLP_ADHOC_QUERY_READ, WLP_ADHOC_RESULTS_CREATE } in any-tenancy where all { request.principal.id = target.agent.id, request.principal.type = 'workloadprotectionagent' }",
          'allow service vulnerability-scanning-service to manage instances in tenancy',
          'allow service vulnerability-scanning-service to read compartments in tenancy',
          'allow service vulnerability-scanning-service to read repos in tenancy',
          'allow service vulnerability-scanning-service to read vnics in tenancy',
          'allow service vulnerability-scanning-service to read vnic-attachments in tenancy',
          'allow service osmh to read instances in tenancy',
          'allow service blockstorage, oke, streaming, %s, %s to use keys in tenancy' % [fss_service, obj_service],
        ],
      },
    },
  }
