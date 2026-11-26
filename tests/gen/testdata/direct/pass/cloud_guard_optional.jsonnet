// Cloud Guard defaults on; excluding it retains Security Zones, scanning and other notifications.
// contains: "verified": true
local render = import 'gen/landing_zone_multi.jsonnet';
local normalize = (import 'gen/config.libsonnet').normalize;
local base = { hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } } };
assert normalize(base).enable_cloud_guard;
assert std.all([
  local enabled = render(base + { cis_level: cis });
  local disabled = render(base + { cis_level: cis, enable_cloud_guard: false });
  local security = 'security_cis%d.json' % cis;
  local pre = 'security_cis%d_pre.json' % cis;
  local obs = 'observability_cis%d.json' % cis;
  std.objectHas(enabled[security], 'cloud_guard_configuration')
  && !std.objectHas(disabled[security], 'cloud_guard_configuration')
  && !std.objectHas(disabled[pre], 'cloud_guard_configuration')
  && std.objectHas(disabled[security], 'security_zones_configuration')
  && std.objectHas(disabled[security], 'scanning_configuration')
  && !std.objectHas(disabled[obs].notifications_configuration.topics, 'NOTT-LZ-CLOUDGUARD-KEY')
  && std.objectHas(disabled[obs].notifications_configuration.topics, 'NOTT-LZ-IAM-KEY')
  && !std.objectHas(disabled[obs].home_region_events_configuration.event_rules, 'RUL-LZ-CLOUDGUARD-KEY')
  && !std.objectHas(render(base + { cis_level: cis, stack_scope: 'regional' })[security], 'cloud_guard_configuration')
  for cis in [1, 2]
]);
{ verified: true }
