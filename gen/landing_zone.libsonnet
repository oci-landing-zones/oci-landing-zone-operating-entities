// gen/landing_zone.libsonnet — Main orchestrator for config-driven OCI Landing Zone.
//
// Takes a raw config, normalizes it, builds the hub, generates spoke VCNs
// for each environment with shared_project_network, and composes the output.
//
// function(raw_config) → { network, network_pre, network_backends? }
//
// Task 8: Config normalization, hub dispatch, spoke VCN generation, per-project NSGs.
// Task 9: DRG attachments, route injection into hub, NFW NSG rules, post-deploy routes.
// Task 10: Platform/extension VCNs (OKE, etc.)
local governance_builder = import 'builders/governance.libsonnet';
local hub_integration_builder = import 'builders/hub_integration.libsonnet';
local iam_builder = import 'builders/iam.libsonnet';
local network_spokes_builder = import 'builders/network_spokes.libsonnet';
local observability_builder = import 'builders/observability.libsonnet';
local security_builder = import 'builders/security.libsonnet';
local cfg_lib = import 'config.libsonnet';
local constants = import 'constants.libsonnet';
local extensions = import 'extensions.libsonnet';
local naming = import 'naming.libsonnet';
local platforms = import 'platforms.libsonnet';
local topology = import 'topology.libsonnet';
local hub_builders = {
  hub_a: import 'hub/hub_a.libsonnet',
  hub_b: import 'hub/hub_b.libsonnet',
  hub_c: import 'hub/hub_c.libsonnet',
  hub_e: import 'hub/hub_e.libsonnet',
};
local common = import 'hub/hub_common.libsonnet';

// Extension registry: maps extension type names to extension builder functions.
local extension_registry = {
  oke_simple: import 'workload-extensions/oke/simple/oke_simple.libsonnet',
};

function(raw_config)
  local config = cfg_lib.normalize(raw_config);
  local n = naming(config.region_short_name);
  local topo = topology(config, n);
  local realm = constants[config.realm];

  // Hub CIDRs needed for spoke NSG/security list rules
  local hub_vcn_cidr = config.hub.network.vcn;
  local hub_subnets = config.hub.network.subnets;
  local mgmt_cidr = hub_subnets.mgmt;
  local lb_cidr = hub_subnets.lb;

  // --- Collect environments with shared_project_network ---
  local ordered_env_names = topo.ordered_env_names();
  local spoke_env_names = topo.ordered_spoke_env_names();
  local spoke_envs = [
    { name: name, env: config.environments[name] }
    for name in spoke_env_names
  ];

  // Number categories starting from 1 using the spoke-environment semantic order.
  local spoke_env_indexed = std.mapWithIndex(
    function(i, s) s { index: i + 1 },
    spoke_envs
  );

  // Collect all spoke VCN CIDRs for peer routing (Hub E)
  local all_spoke_vcn_cidrs = [
    { name: topo.env_display(s.name), raw_name: s.name, vcn: s.env.shared_project_network.network.vcn }
    for s in spoke_envs
  ];

  local platform_state = platforms.collect_entries(config, ordered_env_names, topo);
  local all_platform_entries = platform_state.all_platform_entries;
  local extension_entries = platform_state.extension_entries;
  local network_only_platforms = platform_state.network_only_platforms;
  local routed_vcn_state = platforms.build_routed_vcn_entries(config, all_platform_entries, topo, n);
  local all_vcn_entries = routed_vcn_state.all_vcn_entries;

  // All VCN CIDRs for spoke-to-spoke+platform peer routing (Hub E with NAT GW)
  local all_peer_vcn_cidrs = all_spoke_vcn_cidrs + [
    local label = platforms.vcn_label(pe);
    {
      name: label.display,
      raw_name: label.raw_name,
      vcn: pe.platform_config.network.vcn,
    }
    for pe in all_platform_entries
  ];

  // LB example backends follow the first ordered spoke environment's web subnet.
  // This preserves the documented prod examples for default configs and degrades
  // to explicit placeholders only when no workload spoke exists.
  local lb_backends =
    if std.length(spoke_envs) > 0 then
      local web_subnet = spoke_envs[0].env.shared_project_network.network.subnets.web;
      {
        backend1_ip: common.host_ip_from_subnet(web_subnet, 10),
        backend2_ip: common.host_ip_from_subnet(web_subnet, 20),
      }
    else {
      backend1_ip: '0.0.0.0',
      backend2_ip: '0.0.0.0',
    };

  // All VCN entries for hub builders: [{name: 'prod', cidr: '10.0.64.0/21'}, ...]
  local all_vcns = [
    { name: e.name, cidr: e.vcn }
    for e in all_vcn_entries
  ];

  // Build hub with vcn_list for NFW policies
  local hub = hub_builders[config.hub.kind](n, config.hub, all_vcns, lb_backends);

  local hub_integration = hub_integration_builder({
    naming: n,
    hub: hub,
    all_vcn_entries: all_vcn_entries,
  });
  local hub_integration_pre = hub_integration.pre;
  local hub_integration_post = hub_integration.post;

  local spoke_network = network_spokes_builder({
    naming: n,
    topology: topo,
    hub_network: config.hub.network,
    spoke_env_indexed: spoke_env_indexed,
    all_peer_vcn_cidrs: all_peer_vcn_cidrs,
    hub_has_spoke_natgw: hub.has_spoke_natgw,
  });

  local network_only_categories = if std.length(network_only_platforms) > 0 then {
    ['%d-%s-platform-%s' % [
      std.length(spoke_env_indexed) + i + 1,
      network_only_platforms[i].scope.scope_name,
      network_only_platforms[i].scope.platform_name,
    ]]:
      platforms.build_network_category(network_only_platforms[i], n, hub_vcn_cidr)
    for i in std.range(0, std.length(network_only_platforms) - 1)
  } else {};

  local extension_state = extensions.resolve(
    cfg_lib,
    extension_registry,
    extension_entries,
    n,
    hub_vcn_cidr,
    all_vcn_entries
  );
  local extension_network_pre = extension_state.network_pre;
  local extension_iam = extension_state.iam;
  local extension_security_cis1 = extension_state.security_cis1;
  local extension_security_cis2 = extension_state.security_cis2;
  local extension_extra = extension_state.extra;

  // --- Build security, observability, governance ---
  local security = security_builder(config, n, realm, topo);
  local observability = observability_builder(config, n, realm, topo);
  local assembled_network_pre = hub.pre + hub_integration_pre + extension_network_pre {
    network_configuration+: {
      network_configuration_categories+: spoke_network.categories + network_only_categories,
    },
  };
  local assembled_network =
    if hub.post != null then assembled_network_pre + hub.post + hub_integration_post
    else assembled_network_pre;

  // --- Compose output ---
  {
    // Canonical network output: final deployable artifact for all hub types.
    network: assembled_network,

    // Optional staged precursor output: only for hubs with post overlays.
    network_pre: if hub.post != null then assembled_network_pre else null,

    // Hub C backends: full network config with NLB backend configuration.
    network_backends:
      if hub.post != null && std.objectHas(hub, 'backends') then
        assembled_network + hub.backends.build(
          'NETWORK FIREWALL-1 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrr...',
          'NETWORK FIREWALL-2 PRIVATE IP OCID IN TRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljrt...',
          'NETWORK FIREWALL-1 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsm...',
          'NETWORK FIREWALL-2 PRIVATE IP OCID IN UNTRUST SUBNET, e.g. ocid1.privateip.oc1.eu-frankfurt-1.abtheljsh...',
        )
      else null,

    // IAM output: compartments, groups, identity domains, policies
    iam: iam_builder(config, n, realm, topo) + extension_iam,

    // Governance output: tag namespaces and definitions
    governance: governance_builder(config, n),

    // Security outputs: 4 CIS variants (merged with extension contributions)
    security_cis1_pre: security.cis1_pre,
    security_cis1: security.cis1 + extension_security_cis1,
    security_cis2_pre: security.cis2_pre,
    security_cis2: security.cis2 + extension_security_cis2,

    // Observability outputs: 4 CIS variants
    observability_cis1_pre: observability.cis1_pre,
    observability_cis1: observability.cis1,
    observability_cis2_pre: observability.cis2_pre,
    observability_cis2: observability.cis2,

    // Extra outputs from extensions (e.g. oke_clusters, oke_workers)
    [if std.length(std.objectFields(extension_extra)) > 0 then 'extra']: extension_extra,
  }
