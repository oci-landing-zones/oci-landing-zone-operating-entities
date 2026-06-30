// gen/builders/iam/compartments.libsonnet
// Compartment tree construction for the IAM output.

function(ctx)
  local config = ctx.config;
  local n = ctx.n;
  local env_entries = ctx.env_entries;
  local tbac_tag = ctx.tbac_tag;
  local tag_network = ctx.tag_network;
  local tag_security = ctx.tag_security;

  // --- Compartments ---

  local platform_children(entry) =
    local env = entry.env;
    if std.objectHas(env, 'platforms') then {
      [platform.compartment_key]: {
        name: platform.compartment_name,
        description: platform.compartment_description,
      }
      for platform in [
        ctx.env_platform(entry, p_name)
        for p_name in std.objectFields(env.platforms)
      ]
    } else {};

  local shared_platform_children =
    if std.objectHas(config, 'shared_platforms') then {
      [platform.compartment_key]: {
        name: platform.compartment_name,
        description: platform.compartment_description,
      }
      for platform in [
        ctx.topo.shared_platform(p_name)
        for p_name in std.objectFields(config.shared_platforms)
      ]
    } else {};

  // Per-environment children compartments
  local env_compartment_children(entry) =
    local env_name = entry.env_name;
    local platform_kids = platform_children(entry);

    // Per-project compartments inside PROJECTS
    local project_names = ctx.project_names(entry);

    local proj_children = {
      [ctx.env_project_compartment_key(entry, proj_name)]: {
        name: ctx.env_project_compartment_name(entry, proj_name),
        description: '%s environment, %s compartment' % [ctx.env_desc(env_name), ctx.proj_display(proj_name)],
      }
      for proj_name in project_names
    };

    {
      [ctx.env_child_compartment_key(entry, 'NETWORK')]: {
        name: ctx.env_child_compartment_name(entry, 'network'),
        // 'prod' is abbreviated to "Prod" for the NETWORK compartment (matches hand-written JSON).
        description: '%s Workload Environment, Common Network Compartment' % ctx.topo.env_display_network(env_name),
        defined_tags: {
          [tbac_tag]: tag_network,
        },
      },

      [ctx.env_child_compartment_key(entry, 'PLATFORM')]: {
        name: ctx.env_child_compartment_name(entry, 'platform'),
        description: '%s Workload Environment, Common Platform Compartment' % ctx.env_desc(env_name),
      } + (
        if std.length(std.objectFields(platform_kids)) > 0 then {
          children: platform_kids,
        } else {}
      ),

      [ctx.env_child_compartment_key(entry, 'PROJECTS')]: {
        name: ctx.env_child_compartment_name(entry, 'projects'),
        description: '%s Workload Environment, Common Projects Compartment' % ctx.env_desc(env_name),
        children: proj_children,
      },

      [ctx.env_child_compartment_key(entry, 'SECURITY')]: {
        name: ctx.env_child_compartment_name(entry, 'security'),
        description: '%s Workload Environment, Common Security Compartment' % ctx.env_desc(env_name),
        defined_tags: {
          [tbac_tag]: tag_security,
        },
      },
    };

  // All env children (merged into LANDINGZONE children)
  local one_oe_env_compartments = std.foldl(
    function(acc, entry)
      acc + {
        [ctx.env_compartment_key(entry)]: {
          name: ctx.env_compartment_name(entry),
          description: '%s Environment Compartment' % ctx.env_desc(entry.env_name),
          children: env_compartment_children(entry),
        },
      },
    env_entries,
    {}
  );

  {
    enable_delete: 'true',
    compartments: {
      'CMP-LANDINGZONE-KEY': {
        name: 'cmp-landingzone',
        description: 'Enclosing Landing Zone Compartment',
        children: {
          [n.key_global('CMP', ['NETWORK'])]: {
            name: 'cmp-lz-network',
            description: 'Shared Network Compartment',
            defined_tags: {
              [tbac_tag]: tag_network,
            },
          },
          [n.key_global('CMP', ['PLATFORM'])]: {
            name: 'cmp-lz-platform',
            description: 'Shared Platform Compartment',
          } + (
            if std.length(std.objectFields(shared_platform_children)) > 0 then {
              children: shared_platform_children,
            } else {}
          ),
        } + one_oe_env_compartments + {
          [n.key_global('CMP', ['SECURITY'])]: {
            name: 'cmp-lz-security',
            description: 'Shared Security Compartment',
            defined_tags: {
              [tbac_tag]: tag_security,
            },
          },
        },
      },
    },
  }
