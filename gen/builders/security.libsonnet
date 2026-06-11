// gen/builders/security.libsonnet
// Security builder: cloud guard, scanning, security zones, and vaults.
//
// Generates the same structures as:
//   blueprints/one-oe/runtime/one-stack/oneoe_security_cis1_pre.json
//   blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.json
//   blueprints/one-oe/runtime/one-stack/oneoe_security_cis2_pre.json
//   blueprints/one-oe/runtime/one-stack/oneoe_security_cis2.json
//
// function(config, n, realm_constants, topo) → { cis1_pre, cis1, cis2_pre, cis2 }

function(config, n, realm_constants, topo)
  local security_target_networked_env_names = topo.security_target_networked_env_names();
  local szp = realm_constants.security_zone_policy_ocids;

  // --- Base security (shared across all CIS levels) ---
  local base = {
    cloud_guard_configuration: {
      compartment_id: 'TENANCY-ROOT',
      reporting_region: config.region,
      self_manage_resources: false,

      targets: {
        [n.key_tenancy('CG-TGT', ['ROOT'])]: {
          name: n.display_tenancy('cg-tgt', ['root']),
          compartment_id: 'TENANCY-ROOT',
          resource_id: 'TENANCY-ROOT',
          resource_type: 'COMPARTMENT',
          use_cloned_recipes: true,
        },
      },
    },

    scanning_configuration: {
      default_compartment_id: n.key_global('CMP', ['SECURITY']),

      host_recipes: {
        [n.key_global('VSS-RCPH', [])]: {
          name: n.display_global('vss-rcph', []),
          port_scan_level: 'STANDARD',

          agent_settings: {
            cis_benchmark_scan_level: 'STRICT',
            scan_level: 'STANDARD',
            vendor: 'OCI',
          },

          file_scan_settings: {
            enable: true,
            folders_to_scan: ['/'],
            operating_system: 'LINUX',
            scan_recurrence: 'FREQ=WEEKLY;INTERVAL=2;WKST=SU',
          },

          schedule_settings: {
            type: 'WEEKLY',
            day_of_week: 'SUNDAY',
          },
        },
      },

      host_targets: {
        [n.key_global('VSS-TGTH', [])]: {
          name: n.display_global('vss-tgth', []),
          host_recipe_id: n.key_global('VSS-RCPH', []),
          target_compartment_id: 'CMP-LANDINGZONE-KEY',
        },
      },
    },

    security_zones_configuration: {
      reporting_region: config.region,
      tenancy_ocid: 'TENANCY-ROOT',

      recipes: {
        [n.key_global('SZ-RCP', ['01', 'CIS', 'L1'])]: {
          name: n.display_global('sz-rcp', ['01', 'cis', 'l1']),
          description: 'Recipe 01 CIS Level 1',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          cis_level: '1',
        },

        [n.key_global('SZ-RCP', ['02', 'CIS', 'L2'])]: {
          name: n.display_global('sz-rcp', ['02', 'cis', 'l2']),
          description: 'Recipe 02 CIS Level 2',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          cis_level: '2',
        },

        [n.key_global('SZ-RCP', ['03', 'SHARED', 'NETWORK'])]: {
          name: n.display_global('sz-rcp', ['03', 'shared', 'network']),
          description: 'Recipe 03 Shared Network',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          cis_level: '2',
          security_policies_ocids: szp.shared_network,
        },

        [n.key_global('SZ-RCP', ['04', 'ENVIRONMENT', 'NETWORK'])]: {
          name: n.display_global('sz-rcp', ['04', 'environment', 'network']),
          description: 'Recipe 04 Environment Network',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          cis_level: '2',
          security_policies_ocids: szp.environment_network,
        },

        [n.key_global('SZ-RCP', ['05', 'WORKLOAD'])]: {
          name: n.display_global('sz-rcp', ['05', 'workload']),
          description: 'Recipe 05 Workload',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          cis_level: '2',
          security_policies_ocids: szp.workload,
        },
      },
    },
  };

  // --- CIS1 pre: base + CIS L1 zone only ---
  local cis1_pre = base {
    security_zones_configuration+: {
      security_zones: {
        [n.key_global('SZ-TGT', ['CIS', 'L1'])]: {
          name: n.display_global('sz-tgt', ['cis', 'l1']),
          compartment_id: 'CMP-LANDINGZONE-KEY',
          recipe_key: n.key_global('SZ-RCP', ['01', 'CIS', 'L1']),
        },
      },
    },
  };

  // --- Per-env security zone targets (shared network + env network + project workloads) ---
  // The topology helper decides which environments are security targets.
  // Config mode defaults this to all environments; published profiles can pin a narrower list.
  local env_zone_targets = {
    [n.key_global('SZ-TGT', ['SHARED', 'NETWORK'])]: {
      name: n.display_global('sz-tgt', ['shared', 'network']),
      compartment_id: n.key_global('CMP', ['NETWORK']),
      recipe_key: n.key_global('SZ-RCP', ['03', 'SHARED', 'NETWORK']),
    },
  } + std.foldl(
    function(acc, env_name)
      local project_names = topo.project_names(env_name);
      acc + {
        [n.key_global('SZ-TGT', [env_name, 'ENVIRONMENT', 'NETWORK'])]: {
          name: n.display_global('sz-tgt', [env_name, 'environment', 'network']),
          compartment_id: n.key_global('CMP', [env_name, 'NETWORK']),
          recipe_key: n.key_global('SZ-RCP', ['04', 'ENVIRONMENT', 'NETWORK']),
        },
      } + {
        [n.key_global('SZ-TGT', [env_name, proj])]: {
          name: n.display_global('sz-tgt', [env_name, proj]),
          compartment_id: n.key_global('CMP', [env_name, proj]),
          recipe_key: n.key_global('SZ-RCP', ['05', 'WORKLOAD']),
        }
        for proj in project_names
      },
    security_target_networked_env_names,
    {}
  );

  // --- CIS1: cis1_pre + env-specific targets ---
  local cis1 = cis1_pre {
    security_zones_configuration+: {
      security_zones+: env_zone_targets,
    },
  };

  // --- CIS2 pre: same base as cis1_pre but with CIS L2 zone + vaults ---
  local cis2_pre = base {
    security_zones_configuration+: {
      security_zones: {
        [n.key_global('SZ-TGT', ['CIS', 'L2'])]: {
          name: n.display_global('sz-tgt', ['cis', 'l2']),
          compartment_id: 'CMP-LANDINGZONE-KEY',
          recipe_key: n.key_global('SZ-RCP', ['02', 'CIS', 'L2']),
        },
      },
    },

    vaults_configuration: {
      default_compartment_id: n.key_global('CMP', ['SECURITY']),

      vaults: {
        [n.key_global('VLT', ['SHARED', 'SECURITY'])]: {
          name: n.display_global('vlt', ['shared', 'security']),
        },
      },

      keys: {
        [n.key_global('KEY', ['SHARED', 'OSS', 'AUDIT', 'BKT'])]: {
          name: n.display_global('key', ['shared', 'oss', 'audit', 'bkt']),
          protection_mode: 'SOFTWARE',
          vault_key: n.key_global('VLT', ['SHARED', 'SECURITY']),
          service_grantees: [realm_constants.service_identifiers.objectstorage(config.region)],
          group_grantees: [n.display_global('grp', ['security', 'admin'])],
          versions: ['1', '2'],
        },
      },
    },
  };

  // --- CIS2: cis2_pre + env-specific targets ---
  local cis2 = cis2_pre {
    security_zones_configuration+: {
      security_zones+: env_zone_targets,
    },
  };

  // Return all four variants
  {
    cis1_pre: cis1_pre,
    cis1: cis1,
    cis2_pre: cis2_pre,
    cis2: cis2,
  }
