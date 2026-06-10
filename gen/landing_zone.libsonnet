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
local extensions = import 'extensions.libsonnet';
local platforms = import 'platforms.libsonnet';
local render_context = import 'render_context.libsonnet';
local hub_builders = {
  hub_a: import 'hub/hub_a.libsonnet',
  hub_b: import 'hub/hub_b.libsonnet',
  hub_c: import 'hub/hub_c.libsonnet',
  hub_e: import 'hub/hub_e.libsonnet',
};

// Extension registry: maps extension type names to extension builder functions.
local extension_registry = {
  oke_simple: import 'workload-extensions/oke/simple/oke_simple.libsonnet',
  exacc: import 'workload-extensions/exacc/exacc.libsonnet',
  exacs: import 'workload-extensions/exacs/exacs.libsonnet',
};

function(raw_config)
  local ctx = render_context.from_raw_config(raw_config);
  local config = ctx.config;
  local n = ctx.n;
  local topo = ctx.topo;
  local realm = ctx.realm_constants;
  local spoke_envs = ctx.spoke_envs;
  local extension_entries = ctx.extension_entries;
  local network_only_platforms = ctx.network_only_platforms;
  local all_vcn_entries = ctx.all_vcn_entries;
  local lb_env_name = ctx.lb_env_name;
  local lb_backends = ctx.lb_backends;
  local create_hub_l7_load_balancer =
    std.length([
      entry
      for entry in extension_entries
      if entry.platform_config.extension.type == 'oke_simple'
    ]) == 0;

  // Hub CIDRs needed for spoke NSG/security list rules
  local hub_vcn_cidr = config.hub.network.vcn;

  // Number categories starting from 1 using the spoke-environment semantic order.
  local spoke_env_indexed = std.mapWithIndex(
    function(i, s) s { index: i + 1 },
    spoke_envs
  );
  // Build hub with semantic VCN list for NFW policies and example LB backends.
  local hub = hub_builders[config.hub.kind]({
    naming: n,
    hub_config: config.hub,
    vcn_list: [
      { name: entry.name, cidr: entry.vcn }
      for entry in all_vcn_entries
    ],
    create_l7_load_balancer: create_hub_l7_load_balancer,
    lb_backends: lb_backends,
    lb_env_name: lb_env_name,
  });

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
    all_peer_vcn_entries: all_vcn_entries,
    hub_has_spoke_natgw: hub.has_spoke_natgw,
  });

  local network_only_categories = if std.length(network_only_platforms) > 0 then {
    ['%d-%s-platform-%s' % [
      std.length(spoke_env_indexed) + i + 1,
      network_only_platforms[i].scope.scope_name,
      network_only_platforms[i].scope.platform_name,
    ]]:
      platforms.build_network_category({
        platform_entry: network_only_platforms[i],
        naming: n,
        hub_vcn_cidr: hub_vcn_cidr,
        routed_vcn_entries: all_vcn_entries,
        hub_has_spoke_natgw: hub.has_spoke_natgw,
      })
    for i in std.range(0, std.length(network_only_platforms) - 1)
  } else {};

  local extension_state = extensions.resolve({
    extension_registry: extension_registry,
    extension_entries: extension_entries,
    naming: n,
    hub_vcn_cidr: hub_vcn_cidr,
    hub_lb_cidr: config.hub.network.subnets.lb,
    routed_vcn_entries: all_vcn_entries,
    hub_has_spoke_natgw: hub.has_spoke_natgw,
  });
  local extension_network_pre = extension_state.network_pre;
  local extension_iam = extension_state.iam;
  local extension_security_cis1 = extension_state.security_cis1;
  local extension_security_cis2 = extension_state.security_cis2;
  local extension_observability_cis1 = extension_state.observability_cis1;
  local extension_observability_cis2 = extension_state.observability_cis2;
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
        assembled_network + hub.backends.build_placeholders()
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

    // Observability outputs: 4 CIS variants. Extension observability is
    // non-logging by contract, so it belongs in pre and final variants.
    observability_cis1_pre: observability.cis1_pre + extension_observability_cis1,
    observability_cis1: observability.cis1 + extension_observability_cis1,
    observability_cis2_pre: observability.cis2_pre + extension_observability_cis2,
    observability_cis2: observability.cis2 + extension_observability_cis2,

    // Extra outputs from extensions (e.g. oke_clusters, oke_workers)
    [if std.length(std.objectFields(extension_extra)) > 0 then 'extra']: extension_extra,
  }
