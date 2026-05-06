# ExaCC Jsonnet Config Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add config-driven Jsonnet support for the ExaDB-C@C workload extension, using the OKE simple extension pattern without blindly copying generated ExaCC snapshots from `we_exacc_update`.

**Architecture:** Extend the generic extension contract so non-network extensions can participate in config mode, then add an `exacc` extension builder that contributes IAM and observability resources. Keep published ExaCC single-stack and multi-stack JSON as generated snapshots, with publication-specific adapters only where config-mode output shape and committed artifact shape differ.

**Tech Stack:** Jsonnet generator under `gen/`, Python `unittest` generator fixtures, checked-in published JSON under `workload-extensions/exacc`.

---

## Context Summary

Current branch: `config-jsonnet`.

Source branch inspected: `we_exacc_update`, limited to `workload-extensions/exacc`.

Relevant current patterns:

- OKE config support lives under `gen/workload-extensions/oke/simple/`.
- Extension registration is in `gen/landing_zone.libsonnet`.
- Generic extension resolution is in `gen/extensions.libsonnet`.
- Config mode emits standard files through `gen/landing_zone_multi.jsonnet`.
- Published OKE JSON snapshots are generated from thin entrypoints under `gen/workload-extensions/oke/simple/...`.

Branch delta to preserve:

- New ExaCC published layout: `workload-extensions/exacc/{single-stack,multi-stack,exacc_use_cases,content}`.
- New single-stack ExaCC files: governance, IAM, security CIS1/CIS2, observability CIS1/CIS2.
- New multi-stack ExaCC files: extension-only IAM and observability.
- New docs describe single-stack for PoC/exploration and multi-stack for existing One-OE extension.

Branch delta to avoid copying as source:

- JSON files are generated deployment snapshots and hard-code `prod`, `preprod`, `proj1`, `uc1`, branch URLs, and fixed key names.
- `content/OLD/` is docs history, not published content and should be removed.
- Old `1_exacc_extension/*.auto.tfvars.json` in curennt branch and `2_exacc_use_cases/readme.md` should be replaced by new files from `we_exacc_update`  generated-layout docs only after the generator owns the new snapshots.

## Chosen Design

Use extension type `exacc`.

Example config:

```jsonnet
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacc: {
          extension: {
            type: 'exacc',
            params: {
              project_db_compartments: ['proj1'],
              notification_emails: {
                default: ['exacc-platform@example.com'],
                projects: ['prod-exacc-projects@example.com'],
              },
            },
          },
        },
      },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: {
        exacc: {
          extension: {
            type: 'exacc',
            params: {
              project_db_compartments: ['proj1'],
              notification_emails: {
                default: ['exacc-platform@example.com'],
                projects: ['preprod-exacc-projects@example.com'],
              },
            },
          },
        },
      },
    },
  },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: ['exacc-platform@example.com'],
            db_workloads: ['exacc-db@example.com'],
            infra_workloads: ['exacc-infra@example.com'],
          },
        },
      },
    },
  },
}
```

Important contract changes:

- Extension-backed platforms may omit `network` only when extension metadata declares `requires_network: false`.
- `network_pre` remains required for networked extensions like `oke_simple`.
- Extensions can merge into `observability_cis1` and `observability_cis2`.
- ExaCC does not emit `network_pre`, `network`, or subnet metadata.
- ExaCC requires `notification_emails.default` with at least one email and may override topic-specific lists with `db_workloads`, `infra_workloads`, and `projects`.
- ExaCC validates notification recipient shape only: supported keys and non-empty string arrays. It does not validate email address syntax.

## File Map

Create:

- `gen/workload-extensions/exacc/exacc.libsonnet` - thin extension wrapper.
- `gen/workload-extensions/exacc/exacc_builder.libsonnet` - IAM and observability builder.
- `gen/workload-extensions/exacc/profiles.libsonnet` - published use-case 1 profile.
- `gen/workload-extensions/exacc/single-stack/*.jsonnet` - published single-stack entrypoints.
- `gen/workload-extensions/exacc/multi-stack/published.libsonnet` - extension-only publication adapter.
- `gen/workload-extensions/exacc/multi-stack/*.jsonnet` - published multi-stack entrypoints.
- `tests/gen/testdata/direct/pass/extensions_contract_networkless_observability.jsonnet`
- `tests/gen/testdata/direct/pass/extensions_contract_networkless_observability.out`
- `tests/gen/testdata/direct/pass/exacc_builder_uc1_surface.jsonnet`
- `tests/gen/testdata/configs/pass/prod_preprod_exacc_uc1.jsonnet`
- `tests/gen/testdata/configs/fail/exacc_notification_emails_missing_default.jsonnet`
- `tests/gen/testdata/configs/fail/exacc_notification_emails_empty_default.jsonnet`
- `tests/gen/testdata/configs/fail/exacc_notification_emails_unknown_key.jsonnet`
- `tests/gen/test_exacc_publication_boundaries.py`

Modify:

- `gen/config.libsonnet` - allow extension-backed networkless platform configs.
- `gen/platforms.libsonnet` - skip networkless extensions in routed VCN calculations.
- `gen/extensions.libsonnet` - support `requires_network: false` and observability merge channels.
- `gen/landing_zone.libsonnet` - register `exacc`, merge extension observability contributions.
- `gen/landing_zone_multi.jsonnet` - no change expected unless extra output naming changes.
- `gen/AGENTS.md`, `gen/README.md`, `gen/JSONNET_COMPOSITION.md` - document new extension contract.
- `tests/gen/test_direct_entrypoints.py` - add ExaCC published parity directories.
- `workload-extensions/exacc/**` - copy and rewrite branch docs/assets; regenerate JSON snapshots from new entrypoints.

## Task 1: Add Generic Extension Contract Failing Test

**Files:**

- Create: `tests/gen/testdata/direct/pass/extensions_contract_networkless_observability.jsonnet`
- Create: `tests/gen/testdata/direct/pass/extensions_contract_networkless_observability.out`

- [ ] **Step 1: Add direct fixture**

```jsonnet
// networkless extensions can omit network, skip network_pre, and merge observability
local extensions = import 'gen/extensions.libsonnet';

local registry = {
  no_network_obs: {
    metadata(params):: {
      requires_network: false,
    },
    render(params):: {
      iam: { marker: { identity: true } },
      observability_cis1: { marker: { obs1: true } },
      observability_cis2: { marker: { obs2: true } },
    },
  },
};

local state = extensions.resolve({
  extension_registry: registry,
  extension_entries: [
    {
      scope: {
        scope_name: 'shared',
        platform_name: 'exacc',
      },
      platform_config: {
        extension: {
          type: 'no_network_obs',
          params: {},
        },
      },
    },
  ],
  naming: (import 'gen/naming.libsonnet')('fra'),
  hub_vcn_cidr: '10.0.0.0/21',
  routed_vcn_entries: [],
  hub_has_spoke_natgw: true,
});

{
  iam_marker: state.iam.marker.identity,
  network_pre_empty: state.network_pre == {},
  observability_cis1_marker: state.observability_cis1.marker.obs1,
  observability_cis2_marker: state.observability_cis2.marker.obs2,
}
```

- [ ] **Step 2: Add expected output**

```json
{
  "iam_marker": true,
  "network_pre_empty": true,
  "observability_cis1_marker": true,
  "observability_cis2_marker": true
}
```

- [ ] **Step 3: Run test and verify failure**

Run:

```bash
python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases
```

Expected: fail before implementation because `extensions.resolve_entry` reads `pe.platform_config.network.vcn`.

## Task 2: Extend Generic Extension Contract

**Files:**

- Modify: `gen/config.libsonnet`
- Modify: `gen/platforms.libsonnet`
- Modify: `gen/extensions.libsonnet`
- Modify: `gen/landing_zone.libsonnet`

- [ ] **Step 1: Let extension-backed platforms omit network**

In `gen/config.libsonnet`, replace `norm_platform` with logic equivalent to:

```jsonnet
local norm_platform(plat, p_name) =
  local extension =
    if std.objectHas(plat, 'extension') then
      assert plat.extension != null && std.type(plat.extension) == 'object' :
        'Platform %s.extension must be an object' % p_name;
      assert std.objectHas(plat.extension, 'type') :
        'Platform %s.extension.type is required' % p_name;
      assert std.objectHas(plat.extension, 'params') :
        'Platform %s.extension.params is required' % p_name;
      assert plat.extension.params != null && std.type(plat.extension.params) == 'object' :
        'Platform %s.extension.params must be an object' % p_name;
      plat.extension
    else null;
  local has_network = std.objectHas(plat, 'network') && plat.network != null;
  assert has_network || extension != null :
    'Platform %s.network is required' % p_name;
  local normalized_network =
    if has_network then
      assert std.objectHas(plat.network, 'vcn') : 'Platform %s.network.vcn is required' % p_name;
      local platform_vcn = cidrs.validate('Platform %s.network.vcn' % p_name, plat.network.vcn);
      {
        network: plat.network {
          vcn: platform_vcn,
          subnets:
            if std.objectHas(plat.network, 'subnets') then
              if extension != null then plat.network.subnets
              else subnet_utils.validate_named_subnets(
                plat.network.subnets,
                'Platform %s.network.subnets' % p_name,
                platform_vcn
              )
            else if extension != null then null
            else error 'Platform %s requires explicit subnets (no extension to auto-compute from)' % p_name,
        },
      }
    else {};
  plat
  + (if extension != null then { extension: extension } else {})
  + normalized_network;
```

- [ ] **Step 2: Exclude networkless platforms from VCN overlap validation**

In `gen/config.libsonnet`, build `env_vcn_entries` and `shared_vcn_entries` only when `std.objectHas(platform, 'network') && platform.network != null`.

- [ ] **Step 3: Exclude networkless platforms from routed VCN entries**

In `gen/platforms.libsonnet`, add helper:

```jsonnet
has_network(pe):: std.objectHas(pe.platform_config, 'network') && pe.platform_config.network != null,
```

Use it in `build_routed_vcn_entries` so platform VCN entries include only `$.has_network(pe)`.

Use it in `collect_entries` so `network_only_platforms` includes only platforms with no extension and with network.

- [ ] **Step 4: Support networkless extension resolution**

In `gen/extensions.libsonnet`, after `ext_meta` is computed:

```jsonnet
local requires_network =
  if std.objectHas(ext_meta, 'requires_network') then ext_meta.requires_network
  else true;
assert std.type(requires_network) == 'boolean' :
       'Extension "%s" metadata.requires_network must be a boolean' % ext_type;
assert !requires_network || (std.objectHas(pe.platform_config, 'network') && pe.platform_config.network != null) :
       'Extension "%s" for platform %s/%s requires network.vcn' % [
         ext_type,
         pe.scope.scope_name,
         pe.scope.platform_name,
       ];
```

Then set subnet resolution and routing conditionally:

```jsonnet
local resolved_subnets =
  if requires_network then
    if pe.platform_config.network.subnets != null then
      subnet_utils.validate_subnet_map(
        pe.platform_config.network.subnets,
        subnet_names,
        subnet_label,
        pe.platform_config.network.vcn
      )
    else subnet_utils.auto_subnets(
      pe.platform_config.network.vcn,
      [
        { name: sn_name, size: ext_meta.default_subnets[sn_name] }
        for sn_name in subnet_names
      ]
    )
  else null;
local routing =
  if requires_network then platforms.build_extension_route_targets({
    platform_entry: pe,
    routed_vcn_entries: routed_vcn_entries,
    naming: n,
    hub_vcn_cidr: hub_vcn_cidr,
    hub_has_spoke_natgw: hub_has_spoke_natgw,
  }) else null;
```

Set `render_params.network` to `null` when `requires_network` is false.

- [ ] **Step 5: Add observability standard channels**

In `gen/extensions.libsonnet`, change `standard_key_specs` to include:

```jsonnet
local standard_key_specs = [
  { key: 'network_pre', required: false },
  { key: 'iam', required: false },
  { key: 'security_cis1', required: false },
  { key: 'security_cis2', required: false },
  { key: 'observability_cis1', required: false },
  { key: 'observability_cis2', required: false },
];
```

Add a per-result assertion after render:

```jsonnet
assert !resolved.metadata.requires_network || std.objectHas(ext_contributions, 'network_pre') :
       'Extension "%s" is missing required contribution "network_pre"' % resolved.type;
```

If `requires_network` is omitted, default it to true in `resolved.metadata`.

- [ ] **Step 6: Merge extension observability in the landing zone output**

In `gen/landing_zone.libsonnet`, add locals:

```jsonnet
local extension_observability_cis1 = extension_state.observability_cis1;
local extension_observability_cis2 = extension_state.observability_cis2;
```

Change output fields:

```jsonnet
observability_cis1: observability.cis1 + extension_observability_cis1,
observability_cis2: observability.cis2 + extension_observability_cis2,
```

Keep `_pre` observability outputs unchanged unless a future extension proves it needs pre-only observability.

- [ ] **Step 7: Run contract test**

Run:

```bash
python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases
```

Expected: direct pass fixtures pass.

- [ ] **Step 8: Commit**

```bash
git add gen/config.libsonnet gen/platforms.libsonnet gen/extensions.libsonnet gen/landing_zone.libsonnet tests/gen/testdata/direct/pass/extensions_contract_networkless_observability.jsonnet tests/gen/testdata/direct/pass/extensions_contract_networkless_observability.out
git commit -m "feat: support networkless config extensions"
```

## Task 3: Add ExaCC Builder Failing Fixtures

**Files:**

- Create: `tests/gen/testdata/direct/pass/exacc_builder_uc1_surface.jsonnet`
- Create: `tests/gen/testdata/configs/pass/prod_preprod_exacc_uc1.jsonnet`
- Create: `tests/gen/testdata/configs/fail/exacc_notification_emails_missing_default.jsonnet`
- Create: `tests/gen/testdata/configs/fail/exacc_notification_emails_empty_default.jsonnet`
- Create: `tests/gen/testdata/configs/fail/exacc_notification_emails_unknown_key.jsonnet`

- [ ] **Step 1: Add direct surface fixture**

```jsonnet
// ExaCC use case 1 contributes shared/env platform IAM, project DB layers, and observability
// contains: CMP-LZ-SHARED-EXACC-KEY
// contains: CMP-LZ-PROD-EXACC-KEY
// contains: CMP-LZ-PREPROD-EXACC-KEY
// contains: CMP-LZ-PROD-PROJ1-DB-KEY
// contains: GRP-LZ-GLOBAL-DB-ADMIN-KEY
// contains: PCY-LZ-GLOBAL-EXACC-INFRA-ADMIN-KEY
// contains: NOTT-LZ-EXACC-SHARED-INFRA-WORKLOADS-KEY
// contains: RUL-LZ-NOTIFICATION-PLATFORM-EXACC-VMC-KEY
// contains: AL-LZ-DB-CLUSTER-CPUUTIL-KEY
// contains: exacc-db@example.com
// contains: exacc-infra@example.com
// contains: exacc-projects@example.com
local lz = import 'gen/landing_zone.libsonnet';

local exacc_platform(projects=[], topic='projects') = {
  extension: {
    type: 'exacc',
    params: {
      project_db_compartments: projects,
      notification_emails: {
        default: ['exacc-platform@example.com'],
        [topic]: ['exacc-%s@example.com' % topic],
      },
    },
  },
};

local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: { exacc: exacc_platform(['proj1'], 'projects') },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: { exacc: exacc_platform(['proj1'], 'projects') },
    },
  },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: ['exacc-platform@example.com'],
            db_workloads: ['exacc-db@example.com'],
            infra_workloads: ['exacc-infra@example.com'],
          },
        },
      },
    },
  },
});

std.manifestJsonEx({
  iam_keys: std.objectFields(result.iam.compartments_configuration.compartments)
    + std.objectFields(result.iam.identity_domain_groups_configuration.groups)
    + std.objectFields(result.iam.policies_configuration.supplied_policies),
  obs_keys: std.objectFields(result.observability_cis1.notifications_configuration.topics)
    + std.objectFields(result.observability_cis1.events_configuration.event_rules)
    + std.objectFields(result.observability_cis1.alarms_configuration.alarms),
  topic_emails: {
    db: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-EXACC-DB-WORKLOADS-KEY'].subscriptions[0].values,
    infra: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-EXACC-SHARED-INFRA-WORKLOADS-KEY'].subscriptions[0].values,
    prod_projects: result.observability_cis1.notifications_configuration.topics['NOTT-LZ-PROD-EXACC-PROJECTS-KEY'].subscriptions[0].values,
  },
}, '  ')
```

- [ ] **Step 2: Add config-mode pass fixture**

```jsonnet
// config-mode ExaCC use case 1 renders common landing-zone files with ExaCC IAM and observability merged in
local exacc_platform(projects=[]) = {
  extension: {
    type: 'exacc',
    params: {
      project_db_compartments: projects,
      notification_emails: {
        default: ['exacc-platform@example.com'],
        projects: ['exacc-projects@example.com'],
      },
    },
  },
};

{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
      platforms: { exacc: exacc_platform(['proj1']) },
    },
    preprod: {
      shared_project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
      platforms: { exacc: exacc_platform(['proj1']) },
    },
  },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: ['exacc-platform@example.com'],
            db_workloads: ['exacc-db@example.com'],
            infra_workloads: ['exacc-infra@example.com'],
          },
        },
      },
    },
  },
}
```

- [ ] **Step 3: Add validation fail fixtures**

Create `tests/gen/testdata/configs/fail/exacc_notification_emails_missing_default.jsonnet`:

```jsonnet
// ExaCC notification email config requires default fallback recipients
// error_contains: exacc notification_emails.default is required
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            db_workloads: ['exacc-db@example.com'],
          },
        },
      },
    },
  },
}
```

Create `tests/gen/testdata/configs/fail/exacc_notification_emails_empty_default.jsonnet`:

```jsonnet
// ExaCC notification default email list must not be empty
// error_contains: exacc notification_emails.default must contain at least one value
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: [],
          },
        },
      },
    },
  },
}
```

Create `tests/gen/testdata/configs/fail/exacc_notification_emails_unknown_key.jsonnet`:

```jsonnet
// ExaCC notification email config rejects unsupported topic keys to catch typos
// error_contains: exacc notification_emails contains unsupported keys: operators
{
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
  shared_platforms: {
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          notification_emails: {
            default: ['exacc-platform@example.com'],
            operators: ['operators@example.com'],
          },
        },
      },
    },
  },
}
```

- [ ] **Step 4: Run failing tests**

Run:

```bash
python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases tests.gen.test_fixture_cases.FixtureCaseTests.test_config_pass_cases tests.gen.test_fixture_cases.FixtureCaseTests.test_config_fail_cases
```

Expected: fail with unknown extension type `exacc`.

## Task 4: Implement ExaCC Extension Builder

**Files:**

- Create: `gen/workload-extensions/exacc/exacc.libsonnet`
- Create: `gen/workload-extensions/exacc/exacc_builder.libsonnet`
- Modify: `gen/landing_zone.libsonnet`

- [ ] **Step 1: Add thin wrapper**

Create `gen/workload-extensions/exacc/exacc.libsonnet`:

```jsonnet
local builder = import './exacc_builder.libsonnet';

{
  metadata(params):: builder.metadata(params),

  render(params)::
    local rendered = builder.render(params);
    rendered.contributions,
}
```

- [ ] **Step 2: Add builder metadata and parameter validation**

Create `gen/workload-extensions/exacc/exacc_builder.libsonnet` with this top-level contract:

```jsonnet
// gen/workload-extensions/exacc/exacc_builder.libsonnet
// Config-driven ExaDB-C@C workload extension.
//
// Contract:
//   metadata(params):: { requires_network: false }
//   render(params):: { contributions }
//   params.config_params.project_db_compartments? - array of project names for environment-scoped platform entries
//   params.config_params.notification_emails.default - required default email list for all ExaCC notification topics
//   params.config_params.notification_emails.db_workloads? - optional shared DB workload topic email list
//   params.config_params.notification_emails.infra_workloads? - optional shared infra workload topic email list
//   params.config_params.notification_emails.projects? - optional environment project topic email list
//   params.naming - naming object
//   params.topology - platform scope semantics from topology.libsonnet

{
  metadata(params):: {
    requires_network: false,
  },

  render(params)::
    assert std.objectHas(params, 'topology') : 'exacc requires topology scope semantics';
    assert std.objectHas(params, 'config_params') : 'exacc requires config_params';
    local n = params.naming;
    local scope = params.topology;
    local cfg = params.config_params;
    assert std.objectHas(cfg, 'notification_emails') && cfg.notification_emails != null :
      'exacc notification_emails is required';
    assert std.type(cfg.notification_emails) == 'object' :
      'exacc notification_emails must be an object';
    assert std.objectHas(cfg.notification_emails, 'default') :
      'exacc notification_emails.default is required';
    assert std.type(cfg.notification_emails.default) == 'array' :
      'exacc notification_emails.default must be an array';
    assert std.length(cfg.notification_emails.default) > 0 :
      'exacc notification_emails.default must contain at least one value';
    local supported_notification_keys = ['default', 'db_workloads', 'infra_workloads', 'projects'];
    assert std.all([
      std.member(supported_notification_keys, key)
      for key in std.objectFields(cfg.notification_emails)
    ]) : 'exacc notification_emails contains unsupported keys: %s' % std.join(', ', [
      key
      for key in std.objectFields(cfg.notification_emails)
      if !std.member(supported_notification_keys, key)
    ]);
    local notification_emails = {
      [key]:
        assert std.type(cfg.notification_emails[key]) == 'array' :
          'exacc notification_emails.%s must be an array' % key;
        assert std.length(cfg.notification_emails[key]) > 0 :
          'exacc notification_emails.%s must contain at least one value' % key;
        cfg.notification_emails[key]
      for key in std.objectFields(cfg.notification_emails)
    };
    local topic_emails(key) =
      if std.objectHas(notification_emails, key) then notification_emails[key]
      else notification_emails['default'];
    local project_db_compartments =
      if std.objectHas(cfg, 'project_db_compartments') && cfg.project_db_compartments != null then
        assert scope.scope_type == 'environment' :
          'exacc project_db_compartments can only be set on environment platforms';
        assert std.type(cfg.project_db_compartments) == 'array' :
          'exacc project_db_compartments must be an array';
        cfg.project_db_compartments
      else [];

    local domain_display = 'id_lz_common';
    local domain_grp(grp_name) = "'%s'/'%s'" % [domain_display, grp_name];
    local tag_key = 'tagns-lz-role.tag-lz-role';
    local tag_exacc = 'lz-exacc-admin';
    local tag_exacc_db = 'lz-exacc-db-admin';
    local tag_exacc_infra = 'lz-exacc-infra-admin';
    local platform_key = scope.compartment_key;
    local platform_path = scope.compartment_path;
    local platform_name = scope.compartment_name;
    local platform_desc = '%s ExaDB-C@C platform.' % std.asciiLower(scope.scope_name);
    local db_key = n.key_global('CMP', [scope.scope_name, 'EXACC', 'DB']);
    local infra_key = n.key_global('CMP', [scope.scope_name, 'EXACC', 'INFRA']);
    local project_db_key(project_name) = n.key_global('CMP', [scope.scope_name, project_name, 'DB']);
    local project_db_name(project_name) =
      'cmp-lz-%s-%s-db' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)];
    local project_db_path(project_name) =
      n.compartment_path([scope.scope_name, project_name, 'db']);

    local platform_compartment = {
      [platform_key]: {
        name: platform_name,
        description: platform_desc,
        parent_id: scope.parent_compartment_key,
        children: {
          [db_key]: {
            name: '%s-db' % platform_name,
            description: '%s ExaDB-C@C platform, db compartment.' % std.asciiLower(scope.scope_name),
            defined_tags: { [tag_key]: tag_exacc_db },
          },
          [infra_key]: {
            name: '%s-infra' % platform_name,
            description: '%s ExaDB-C@C platform, infra compartment.' % std.asciiLower(scope.scope_name),
            defined_tags: { [tag_key]: tag_exacc_infra },
          },
        },
        defined_tags: { [tag_key]: tag_exacc },
      },
    };

    local project_db_compartments_object = {
      [project_db_key(project_name)]: {
        name: project_db_name(project_name),
        description: '%s ExaDB-C@C env database layer.' % std.asciiLower(scope.scope_name),
        parent_id: n.key_global('CMP', [scope.scope_name, project_name]),
        defined_tags: { [tag_key]: tag_exacc_db },
      }
      for project_name in project_db_compartments
    };

    local global_groups = {
      [n.key_global('GRP', ['GLOBAL', 'DB', 'ADMIN'])]: {
        name: 'grp-lz-global-exacc-db-admin',
        description: 'Global DBA team admin group.',
      },
      [n.key_global('GRP', ['GLOBAL', 'INFRA', 'ADMIN'])]: {
        name: 'grp-lz-global-exacc-infra-admin',
        description: 'Global Infra Team admin group.',
      },
    };

    local project_groups = {
      [n.key_global('GRP', [scope.scope_name, 'EXACC', project_name, 'ADMIN'])]: {
        name: 'grp-lz-%s-%s-exacc-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)],
        description: 'Dedicated team to manage ExaDB-C@C db layer in %s, %s environment.' % [
          project_name,
          std.asciiLower(scope.scope_name),
        ],
      }
      for project_name in project_db_compartments
    };

    local exacc_tag_allow(grp_name, verb, resource, tag_value) =
      "allow group %s to %s %s in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [
        domain_grp(grp_name),
        verb,
        resource,
        tag_key,
        tag_value,
      ];

    local global_infra_policy = {
      [n.key_global('PCY', ['GLOBAL', 'EXACC', 'INFRA', 'ADMIN'])]: {
        name: 'pcy-lz-global-exacc-infra-admin',
        description: 'Policy which allows the grp-lz-global-exacc-infra-admin group users to manage the ExaDB-C@C infra in all ExaDB-C@C infra compartments.',
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = 'grp-lz-global-exacc-infra-admin',
        statements: [
          exacc_tag_allow(grp, 'manage', 'exadata-infrastructures', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'scheduling-policies', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'scheduling-windows', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'execution-windows', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'orm-stacks', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'orm-jobs', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'orm-config-source-providers', tag_exacc_infra),
          "allow group %s to manage vmclusters in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.permission !='VM_CLUSTER_UPDATE_GI_SOFTWARE', request.permission !='VM_CLUSTER_UPDATE_EXADATA_STORAGE'}" % [domain_grp(grp), tag_key, tag_exacc_db],
          exacc_tag_allow(grp, 'use', 'dbServers', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'dbnode-console-connection', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'dbnode-console-history', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-vmclusters', tag_exacc_db),
          exacc_tag_allow(grp, 'use', 'subnets', 'lz-network-admin'),
          exacc_tag_allow(grp, 'use', 'vnics', 'lz-network-admin'),
          exacc_tag_allow(grp, 'use', 'dns', 'lz-network-admin'),
          exacc_tag_allow(grp, 'manage', 'db-nodes', tag_exacc_db),
        ],
      },
    };

    local global_db_policy = {
      [n.key_global('PCY', ['GLOBAL', 'EXACC', 'DB', 'ADMIN'])]: {
        name: 'pcy-lz-global-exacc-db-admin',
        description: 'Policy which allows the group grp-lz-global-exacc-db-admin to manage databases in all ExaDB-C@C db compartments.',
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = 'grp-lz-global-exacc-db-admin',
        statements: [
          exacc_tag_allow(grp, 'manage', 'orm-stacks', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'orm-jobs', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'data-safe-family', tag_exacc_db),
          "allow group %s to use exadata-infrastructures in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.operation !='ValidateVmClusterNetwork', request.operation !='ActivateExadataInfrastructure', request.operation !='ChangeExadataInfrastructureCompartment', request.operation !='AddStorageCapacityExadataInfrastructure', request.operation !='CreateVmClusterNetwork', request.operation !='UpdateVmClusterNetwork', request.operation !='DeleteVmClusterNetwork'}" % [domain_grp(grp), tag_key, tag_exacc_db],
          "allow group %s to use vmclusters in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.permission !='VM_CLUSTER_UPDATE_SSH_KEY', request.permission !='VM_CLUSTER_UPDATE_CPU', request.permission !='VM_CLUSTER_UPDATE_MEMORY', request.permission !='VM_CLUSTER_UPDATE_LOCAL_STORAGE', request.permission !='VM_CLUSTER_UPDATE_FILE_SYSTEM'}" % [domain_grp(grp), tag_key, tag_exacc_db],
          exacc_tag_allow(grp, 'manage', 'backups', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'database-software-image', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'db-homes', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'databases', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'pluggable-databases', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-databases', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-backups', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-container-databases', tag_exacc_db),
          exacc_tag_allow(grp, 'read', 'virtual-network-family', 'lz-network-admin'),
        ],
      },
    };

    local global_generic_policy = {
      [n.key_global('PCY', ['GLOBAL', 'EXACC', 'GENERIC', 'ADMIN'])]: {
        name: 'pcy-lz-global-exacc-generic',
        description: 'Policy which allows the groups grp-lz-global-exacc-infra-admin and grp-lz-global-exacc-db-admin to have shared privileges in all ExaDB-C@C compartments.',
        compartment_id: 'TENANCY-ROOT',
        local infra = domain_grp('grp-lz-global-exacc-infra-admin');
        local db = domain_grp('grp-lz-global-exacc-db-admin');
        local groups = '%s,%s' % [infra, db];
        statements: [
          'allow group %s to use cloud-shell in tenancy' % groups,
          'allow group %s to read compartments in tenancy' % groups,
          "allow group %s to read all-resources in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage alarms in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage metrics in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to read audit-events in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to read work-requests in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage cloudevents-rules in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage ons-family in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
        ],
      },
    };

    local project_policies = {
      [n.key_global('PCY', [scope.scope_name, 'EXACC', project_name, 'ADMIN'])]: {
        name: 'pcy-lz-%s-exacc-%s-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)],
        description: 'Policy which allows the grp-lz-%s-%s-exacc-admin group users to manage the autonomous database layer in %s.' % [
          std.asciiLower(scope.scope_name),
          std.asciiLower(project_name),
          project_name,
        ],
        compartment_id: project_db_key(project_name),
        local grp_name = 'grp-lz-%s-%s-exacc-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)];
        local cmp_path = project_db_path(project_name);
        statements: [
          'allow group %s to read all-resources in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage alarms in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage metrics in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to read audit-events in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to read work-requests in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage cloudevents-rules in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage ons-family in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage autonomous-databases in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage autonomous-backups in compartment %s' % [domain_grp(grp_name), cmp_path],
          'allow group %s to manage autonomous-container-databases in compartment %s' % [domain_grp(grp_name), cmp_path],
        ],
      }
      for project_name in project_db_compartments
    };

    local subscriptions(topic_key) = [{ protocol: 'EMAIL', values: topic_emails(topic_key) }];
    local shared_topic_key = n.key_global('NOTT', ['EXACC', 'SHARED', 'INFRA', 'WORKLOADS']);
    local db_topic_key = n.key_global('NOTT', ['EXACC', 'DB', 'WORKLOADS']);
    local env_topic_key = n.key_global('NOTT', [scope.scope_name, 'EXACC', 'PROJECTS']);
    local is_shared = scope.scope_type == 'shared';

    local topics =
      if is_shared then {
        [db_topic_key]: {
          name: n.display_global('nott', ['exacc', 'db', 'workloads']),
          description: 'Topic for shared ExaDB-C@C db workloads notifications.',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('db_workloads'),
        },
        [shared_topic_key]: {
          name: n.display_global('nott', ['exacc', 'infra', 'workloads']),
          description: 'Topic for shared ExaDB-C@C infra workloads notifications.',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('infra_workloads'),
        },
      } else {
        [env_topic_key]: {
          name: n.display_global('nott', [scope.scope_name, 'exacc', 'projects']),
          description: 'Topic for %s platform notifications.' % std.asciiLower(scope.scope_name),
          compartment_id: n.key_global('CMP', [scope.scope_name, 'SECURITY']),
          subscriptions: subscriptions('projects'),
        },
      };

    local exacc_vmc_events = [
      'com.oraclecloud.databaseservice.deletevmclusternetwork.begin',
      'com.oraclecloud.databaseservice.deletevmclusternetwork.end',
      'com.oraclecloud.databaseservice.changevmclustercompartment',
      'com.oraclecloud.databaseservice.deletevmcluster.begin',
      'com.oraclecloud.databaseservice.deletevmcluster.end',
      'com.oraclecloud.databaseservice.updatevmcluster.begin',
      'com.oraclecloud.databaseservice.updatevmcluster.end',
      'com.oraclecloud.databaseservice.patchvmcluster.begin',
      'com.oraclecloud.databaseservice.patchvmcluster.end',
      'com.oraclecloud.databaseservice.changeautonomousvmclustercompartment',
      'com.oraclecloud.databaseservice.deleteautonomousvmcluster.begin',
      'com.oraclecloud.databaseservice.deleteautonomousvmcluster.end',
      'com.oraclecloud.databaseservice.updateautonomousvmcluster.begin',
      'com.oraclecloud.databaseservice.updateautonomousvmcluster.end',
    ];

    local event_rules =
      if is_shared then {
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', 'EXACC', 'VMC'])]: {
          compartment_id: db_key,
          destination_topic_ids: [shared_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-exacc-vmc-events']),
          supplied_events: exacc_vmc_events,
        },
      } else {
        [n.key_global('RUL', [scope.scope_name, 'NOTIFICATION', 'PROJECTS'])]: {
          compartment_id: n.key_global('CMP', [scope.scope_name, 'SECURITY']),
          destination_topic_ids: [env_topic_key],
          event_display_name: n.display_global('rul', [scope.scope_name, 'notify-on-notifications-projects']),
          supplied_events: exacc_vmc_events,
        },
      };

    local alarms =
      if is_shared then {
        [n.key_global('AL', ['DB', 'CLUSTER', 'CPUUTIL'])]: {
          display_name: n.display_global('al', ['vmc', 'cpuutil']),
          compartment_id: db_key,
          destination_topic_ids: [shared_topic_key],
          is_enabled: 'false',
          supplied_alarm: {
            message_format: 'PRETTY_JSON',
            namespace: 'oci_database_cluster',
            pending_duration: 'PT5M',
            query: 'CpuUtilization[1m].mean() >= 90',
            severity: 'CRITICAL',
          },
        },
      } else {};

    local observability = {
      alarms_configuration+: { alarms+: alarms },
      events_configuration+: { event_rules+: event_rules },
      notifications_configuration+: { topics+: topics },
    };

    {
      contributions: {
        iam: {
          compartments_configuration+: {
            compartments+: platform_compartment + project_db_compartments_object,
          },
          identity_domain_groups_configuration+: {
            groups+: global_groups + project_groups,
          },
          policies_configuration+: {
            supplied_policies+: global_infra_policy + global_db_policy + global_generic_policy + project_policies,
          },
        },
        observability_cis1: observability,
        observability_cis2: observability,
      },
    },
}
```

After implementation, compare generated policy, event, topic, and alarm keys against `we_exacc_update` snapshots and add missing ExaCC resources before moving on. The snippet above is the minimum structure; the final builder must include the full branch resource set for use case 1.

- [ ] **Step 3: Register extension**

In `gen/landing_zone.libsonnet`:

```jsonnet
local extension_registry = {
  oke_simple: import 'workload-extensions/oke/simple/oke_simple.libsonnet',
  exacc: import 'workload-extensions/exacc/exacc.libsonnet',
};
```

- [ ] **Step 4: Run ExaCC fixtures**

Run:

```bash
python3 -m unittest tests.gen.test_fixture_cases.FixtureCaseTests.test_direct_pass_cases tests.gen.test_fixture_cases.FixtureCaseTests.test_config_pass_cases tests.gen.test_fixture_cases.FixtureCaseTests.test_config_fail_cases
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add gen/workload-extensions/exacc/exacc.libsonnet gen/workload-extensions/exacc/exacc_builder.libsonnet gen/landing_zone.libsonnet tests/gen/testdata/direct/pass/exacc_builder_uc1_surface.jsonnet tests/gen/testdata/configs/pass/prod_preprod_exacc_uc1.jsonnet tests/gen/testdata/configs/fail/exacc_notification_emails_missing_default.jsonnet tests/gen/testdata/configs/fail/exacc_notification_emails_empty_default.jsonnet tests/gen/testdata/configs/fail/exacc_notification_emails_unknown_key.jsonnet
git commit -m "feat: add exacc config extension"
```

## Task 5: Add Published ExaCC Jsonnet Entrypoints

**Files:**

- Create: `gen/workload-extensions/exacc/profiles.libsonnet`
- Create: `gen/workload-extensions/exacc/single-stack/*.jsonnet`
- Create: `gen/workload-extensions/exacc/multi-stack/published.libsonnet`
- Create: `gen/workload-extensions/exacc/multi-stack/*.jsonnet`
- Modify: `tests/gen/test_direct_entrypoints.py`
- Create: `tests/gen/test_exacc_publication_boundaries.py`

- [ ] **Step 1: Add published profile**

`gen/workload-extensions/exacc/profiles.libsonnet` should build the same use-case 1 config used in tests:

```jsonnet
local defaults = import '../../defaults.libsonnet';

local shared_exacc_platform = {
  extension: {
    type: 'exacc',
    params: {
      notification_emails: {
        default: ['exacc-platform@example.com'],
        db_workloads: ['exacc-db@example.com'],
        infra_workloads: ['exacc-infra@example.com'],
      },
    },
  },
};

local env_exacc_platform(env_name, projects=[]) = {
  extension: {
    type: 'exacc',
    params: {
      project_db_compartments: projects,
      notification_emails: {
        default: ['exacc-platform@example.com'],
        projects: ['%s-exacc-projects@example.com' % std.asciiLower(env_name)],
      },
    },
  },
};

{
  uc1_config: defaults.hub_e {
    environments+: {
      prod+: {
        platforms+: { exacc: env_exacc_platform('prod', ['proj1']) },
      },
      preprod+: {
        platforms+: { exacc: env_exacc_platform('preprod', ['proj1']) },
      },
    },
    shared_platforms+: {
      exacc: shared_exacc_platform,
    },
  },
}
```

- [ ] **Step 2: Add single-stack entrypoints**

Each file imports `../profiles.libsonnet` and `../../../landing_zone.libsonnet`, then selects one result field:

```jsonnet
local profiles = import '../profiles.libsonnet';
local lz = import '../../../landing_zone.libsonnet';
lz(profiles.uc1_config).iam
```

Create these selector files:

- `gen/workload-extensions/exacc/single-stack/exacc_identity_uc1.jsonnet`
- `gen/workload-extensions/exacc/single-stack/exacc_governance_uc1.jsonnet`
- `gen/workload-extensions/exacc/single-stack/exacc_security_cis1_uc1.jsonnet`
- `gen/workload-extensions/exacc/single-stack/exacc_security_cis2_uc1.jsonnet`
- `gen/workload-extensions/exacc/single-stack/exacc_observability_cis1_uc1.jsonnet`
- `gen/workload-extensions/exacc/single-stack/exacc_observability_cis2_uc1.jsonnet`

Use `.governance`, `.security_cis1`, `.security_cis2`, `.observability_cis1`, and `.observability_cis2` for the corresponding selectors.

- [ ] **Step 3: Add multi-stack publication adapter**

Create `gen/workload-extensions/exacc/multi-stack/published.libsonnet`.

Purpose: render extension-only IAM and observability, without base One-OE resources, matching branch multi-stack deployment intent.

Adapter shape:

```jsonnet
local cfg_lib = import '../../../config.libsonnet';
local extensions = import '../../../extensions.libsonnet';
local naming = import '../../../naming.libsonnet';
local platforms = import '../../../platforms.libsonnet';
local topology = import '../../../topology.libsonnet';
local exacc = import '../exacc.libsonnet';

{
  render(config)::
    local normalized = cfg_lib.normalize(config);
    local n = naming(normalized.region_short_name);
    local topo = topology(normalized, n);
    local platform_state = platforms.collect_entries(normalized, topo);
    local state = extensions.resolve({
      extension_registry: { exacc: exacc },
      extension_entries: [
        pe for pe in platform_state.extension_entries
        if pe.platform_config.extension.type == 'exacc'
      ],
      naming: n,
      hub_vcn_cidr: normalized.hub.network.vcn,
      routed_vcn_entries: [],
      hub_has_spoke_natgw: true,
    });
    {
      identity: state.iam,
      observability: state.observability_cis1,
    },
}
```

- [ ] **Step 4: Add multi-stack entrypoints**

Create:

- `gen/workload-extensions/exacc/multi-stack/exacc_identity_uc1.jsonnet`
- `gen/workload-extensions/exacc/multi-stack/exacc_observability_uc1.jsonnet`

Example:

```jsonnet
local profiles = import '../profiles.libsonnet';
local published = import './published.libsonnet';
published.render(profiles.uc1_config).identity
```

- [ ] **Step 5: Add direct-entrypoint parity directories**

Modify `tests/gen/test_direct_entrypoints.py`:

```python
PARITY_CASE_DIRS = (
    (Path("gen/blueprints/one-oe/runtime/one-stack"), Path("blueprints/one-oe/runtime/one-stack")),
    (
        Path("gen/workload-extensions/oke/simple/single-stack"),
        Path("workload-extensions/oke/simple/single-stack"),
    ),
    (
        Path("gen/workload-extensions/oke/simple/multi-stack"),
        Path("workload-extensions/oke/simple/multi-stack"),
    ),
    (
        Path("gen/workload-extensions/exacc/single-stack"),
        Path("workload-extensions/exacc/single-stack"),
    ),
    (
        Path("gen/workload-extensions/exacc/multi-stack"),
        Path("workload-extensions/exacc/multi-stack"),
    ),
) + ADDON_PARITY_CASE_DIRS
```

- [ ] **Step 6: Add ExaCC publication boundary tests**

Create `tests/gen/test_exacc_publication_boundaries.py`:

```python
from __future__ import annotations

import unittest

from tests.gen.helpers import REPO_ROOT


class ExaccPublicationBoundaryTests(unittest.TestCase):
    def test_exacc_publication_adapter_is_multistack_local(self) -> None:
        self.assertTrue(
            (REPO_ROOT / "gen/workload-extensions/exacc/multi-stack/published.libsonnet").exists()
        )
        self.assertFalse(
            (REPO_ROOT / "gen/workload-extensions/exacc/published.libsonnet").exists()
        )

    def test_config_mode_does_not_emit_split_exacc_files(self) -> None:
        text = (REPO_ROOT / "gen/landing_zone_multi.jsonnet").read_text(encoding="utf-8")
        self.assertNotIn("exacc_identity_uc1.json", text)
        self.assertNotIn("exacc_observability_uc1.json", text)

    def test_exacc_readmes_do_not_reference_branch_raw_urls(self) -> None:
        for relpath in (
            "workload-extensions/exacc/readme.md",
            "workload-extensions/exacc/single-stack/readme.md",
            "workload-extensions/exacc/multi-stack/readme.md",
        ):
            with self.subTest(path=relpath):
                text = (REPO_ROOT / relpath).read_text(encoding="utf-8")
                self.assertNotIn("refs/heads/we_exacc_update", text)
```

- [ ] **Step 7: Run expected failures**

Run:

```bash
python3 -m unittest tests.gen.test_direct_entrypoints.DirectEntrypointParityTests tests.gen.test_exacc_publication_boundaries.ExaccPublicationBoundaryTests
```

Expected: parity fails until published JSON files and readmes are copied/regenerated.

## Task 6: Copy And Rewrite ExaCC Published Docs From Branch

**Files:**

- Modify/create under: `workload-extensions/exacc/**`

- [ ] **Step 1: Restore branch docs and current images, excluding generated JSON and `content/OLD`**

Run:

```bash
git restore --source we_exacc_update -- workload-extensions/exacc/readme.md workload-extensions/exacc/exacc_use_cases workload-extensions/exacc/content workload-extensions/exacc/single-stack/readme.md workload-extensions/exacc/multi-stack/readme.md
```

Then remove `workload-extensions/exacc/content/OLD` only if it was restored.

- [ ] **Step 2: Rewrite docs**

Update docs so:

- links point to current repo paths, not `oracle-quickstart/terraform-oci-open-lz`
- deploy links do not reference `refs/heads/we_exacc_update`
- generated JSON file lists match files produced from `gen/workload-extensions/exacc/**`
- multi-stack docs say base One-OE must already exist and outputs/dependencies are required
- single-stack docs say it is repo-published reference output, not the customer default secure deployment path

- [ ] **Step 3: Keep old generated snapshot files out until generation**

Do not copy `workload-extensions/exacc/single-stack/*.json` or `workload-extensions/exacc/multi-stack/*.json` directly from the branch. They will be created by `bash gen/generate.sh`.

- [ ] **Step 4: Commit docs**

```bash
git add workload-extensions/exacc
git commit -m "docs: refresh exacc workload extension layout"
```

## Task 7: Generate ExaCC Published JSON Snapshots

**Files:**

- Create generated JSON under `workload-extensions/exacc/single-stack/`
- Create generated JSON under `workload-extensions/exacc/multi-stack/`

- [ ] **Step 1: Run default generator**

Run:

```bash
bash gen/generate.sh
```

Expected: new ExaCC JSON files appear under `workload-extensions/exacc/single-stack/` and `workload-extensions/exacc/multi-stack/`.

- [ ] **Step 2: Inspect generated key surfaces against branch snapshots**

Run:

```bash
jq 'keys' workload-extensions/exacc/single-stack/exacc_identity_uc1.json
jq 'keys' workload-extensions/exacc/single-stack/exacc_observability_cis1_uc1.json
jq 'keys' workload-extensions/exacc/multi-stack/exacc_identity_uc1.json
jq 'keys' workload-extensions/exacc/multi-stack/exacc_observability_uc1.json
jq '.notifications_configuration.topics | with_entries(.value = .value.subscriptions[0].values)' workload-extensions/exacc/multi-stack/exacc_observability_uc1.json
```

Expected:

- single-stack identity has base LZ plus ExaCC IAM
- single-stack observability has base LZ plus ExaCC observability
- multi-stack identity has extension-only compartments/groups/policies
- multi-stack observability has extension-only alarms/events/topics
- ExaCC DB, infra, and project notification topics can show distinct subscription email lists, falling back to `default` only when a topic-specific list is omitted

- [ ] **Step 3: Diff against branch snapshots for intentional differences**

Run:

```bash
git show we_exacc_update:workload-extensions/exacc/multi-stack/exacc_identity_uc1.json > /tmp/we_exacc_identity.json
git show we_exacc_update:workload-extensions/exacc/multi-stack/exacc_observability_uc1.json > /tmp/we_exacc_observability.json
diff -u /tmp/we_exacc_identity.json workload-extensions/exacc/multi-stack/exacc_identity_uc1.json
diff -u /tmp/we_exacc_observability.json workload-extensions/exacc/multi-stack/exacc_observability_uc1.json
```

Expected differences allowed:

- `LZP` legacy key patterns become current `LZ` key patterns only if config generator naming requires it.
- docs URLs and formatting can differ.
- missing ExaCC resources are not allowed; add them to `exacc_builder.libsonnet`.

- [ ] **Step 4: Commit generated snapshots**

```bash
git add workload-extensions/exacc/*.md workload-extensions/exacc/single-stack workload-extensions/exacc/multi-stack workload-extensions/exacc/exacc_use_cases workload-extensions/exacc/content
git commit -m "chore: generate exacc published artifacts"
```

## Task 8: Update Generator Documentation

**Files:**

- Modify: `gen/AGENTS.md`
- Modify: `gen/README.md`
- Modify: `gen/JSONNET_COMPOSITION.md`

- [ ] **Step 1: Document extension contract**

Add to `gen/AGENTS.md`:

```markdown
### Extension Contract

Extensions expose `metadata(params)` and `render(params)`.

- Networked extensions omit `metadata.requires_network` or set it to `true`; they must receive `platform.network.vcn`, may define `default_subnets`, and must contribute `network_pre`.
- Networkless extensions set `metadata.requires_network: false`; they may omit `platform.network`, receive `network: null`, and must not contribute routed VCN resources.
- Extensions may contribute `iam`, `security_cis1`, `security_cis2`, `observability_cis1`, and `observability_cis2`.
- Other contribution keys become config-mode extra output files.
- ExaCC notification config requires `notification_emails.default`; `db_workloads`, `infra_workloads`, and `projects` can override recipients for individual notification topics.
```

- [ ] **Step 2: Add ExaCC example to `gen/README.md`**

Add a short config snippet showing `shared_platforms.exacc` and `environments.prod.platforms.exacc` with `extension.type: 'exacc'` and the `notification_emails` object:

```jsonnet
notification_emails: {
  default: ['exacc-platform@example.com'],
  projects: ['prod-exacc-projects@example.com'],
}
```

- [ ] **Step 3: Add composition note**

In `gen/JSONNET_COMPOSITION.md`, extend "Standard Outputs And Extension `extra` Outputs Are Different Channels" to mention observability extension merge channels and networkless extension handling.

- [ ] **Step 4: Commit docs**

```bash
git add gen/AGENTS.md gen/README.md gen/JSONNET_COMPOSITION.md
git commit -m "docs: document exacc config extension contract"
```

## Task 9: Full Verification

**Files:**

- No planned edits.

- [ ] **Step 1: Run generator test suite**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

Expected: all tests pass.

- [ ] **Step 2: Run default generation idempotence check**

Run:

```bash
bash gen/generate.sh
git status --short
```

Expected: no changes after generation if snapshots were already committed.

- [ ] **Step 3: Run config-mode smoke render**

Run:

```bash
bash gen/generate.sh --config tests/gen/testdata/configs/pass/prod_preprod_exacc_uc1.jsonnet /tmp/exacc-config-out
ls /tmp/exacc-config-out
```

Expected output files include:

```text
governance.json
iam.json
network.json
observability_cis1.json
observability_cis1_pre.json
observability_cis2.json
observability_cis2_pre.json
security_cis1.json
security_cis1_pre.json
security_cis2.json
security_cis2_pre.json
```

Expected output files do not include `exacc_identity_uc1.json` or `exacc_observability_uc1.json`; those are published snapshot names only.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat
git diff --check
```

Expected: no whitespace errors; diff limited to planned generator, tests, docs, and `workload-extensions/exacc`.

## Open Risks

- The branch uses orchestrator tag `v2.1.0`; verify current orchestrator accepts all emitted fields before final publication.
- ExaCC IAM policy resource names and permission filters should be reviewed by ExaCC subject-matter owners before release.
- Config generator naming uses current `LZ` patterns; branch snapshots may use legacy or prior naming in places. Treat exact snapshot parity as secondary to generator naming consistency unless release owners require legacy key parity.
- Observability CIS2 KMS dependencies must remain consistent with security CIS2 output. If ExaCC observability needs CIS2-specific KMS references, keep them in `observability_cis2` only.

## Self-Review

- Spec coverage: plan covers branch analysis, OKE-derived extension pattern, config contract changes, ExaCC builder, published single/multi-stack artifacts, docs, and tests.
- Placeholder scan: no empty implementation markers remain. The only intentionally broad area is "full branch resource set"; implementation must compare against branch snapshots before completion.
- Type consistency: extension type is consistently `exacc`; networkless metadata is `requires_network: false`; observability channels are `observability_cis1` and `observability_cis2`; notification recipients use `notification_emails.default` plus optional per-topic keys.
