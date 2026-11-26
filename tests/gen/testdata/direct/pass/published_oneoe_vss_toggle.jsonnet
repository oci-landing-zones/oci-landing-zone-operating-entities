// Published One-OE retains security tag defaults when VSS and other optional controls are off.
// contains: "verified": true
local profiles = import 'gen/blueprints/one-oe/runtime/one-stack/profiles.libsonnet';
local build = import 'gen/blueprints/one-oe/runtime/one-stack/output_builder.libsonnet';
local check(tags_enabled) =
  local profile = profiles.hub_e + {
    config: profiles.hub_e.config + {
      enable_cloud_guard: false,
      enable_landing_zone_security_zone: false,
      enable_shared_network_security_zone: false,
      security_targets: [],
      cost_governance: {
        enable_tags: tags_enabled,
        owner_email: 'owner@customer.test',
        cost_center_assignments: { CCSEC: { platform: ['security'] } },
        cost_center_business_units: { CCSEC: 'SECURITY' },
      },
    },
  };
  local enabled = build(profile);
  local disabled = build(profile + { config+: { enable_vulnerability_scanning: false } });
  local variants = ['security_cis1', 'security_cis1_pre', 'security_cis2', 'security_cis2_pre'];
  assert std.all([
    !std.objectHas(disabled[key], 'scanning_configuration') &&
    disabled[key] == {
      [field]: enabled[key][field]
      for field in std.objectFields(enabled[key])
      if field != 'scanning_configuration'
    }
    for key in variants
  ]);
  assert !tags_enabled || std.all([
    local tags = disabled[key].security_zones_configuration.default_defined_tags;
    tags['tagns-lz-cost-governance.tag-lz-platform'] == 'security' &&
    tags['tagns-lz-cost-governance.tag-lz-owner'] == 'owner@customer.test' &&
    tags['tagns-lz-cost-governance.tag-lz-cost-center'] == 'CCSEC' &&
    tags['tagns-lz-cost-governance.tag-lz-business-unit'] == 'SECURITY'
    for key in variants
  ]);
  true;
assert std.all([check(enabled) for enabled in [true, false]]);
{ verified: true }
