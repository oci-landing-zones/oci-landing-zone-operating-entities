// gen/naming.libsonnet
// Naming helpers for OCI Landing Zone resources.
// Distinguishes regional names, landing-zone-global names, and raw tenancy names.
//
// Naming patterns:
//   Regional keys:  {TYPE}-{REGION}-LZ-{...SEGMENTS}-KEY
//   LZ-global keys: {TYPE}-LZ-{...SEGMENTS}-KEY
//   Tenancy keys:   {TYPE}-{...SEGMENTS}-KEY

function(region_short_name) {
  local region = std.asciiUpper(region_short_name),
  local region_lower = std.asciiLower(region_short_name),

  // Expose region for dns_label construction and internal identifiers.
  region:: region_lower,

  // Regional key: VCN-FRA-LZ-HUB-KEY
  key(type, segments=[])::
    std.join('-', [std.asciiUpper(type), region, 'LZ'] + [std.asciiUpper(s) for s in segments] + ['KEY']),

  // Landing-zone-global key (no region): CMP-LZ-PROD-KEY
  key_global(type, segments=[])::
    std.join('-', [std.asciiUpper(type), 'LZ'] + [std.asciiUpper(s) for s in segments] + ['KEY']),

  // Regional display name (lowercase): vcn-fra-lz-hub
  display(type, segments=[])::
    std.join('-', [std.asciiLower(type), region_lower, 'lz'] + [std.asciiLower(s) for s in segments]),

  // Landing-zone-global display name (lowercase, no region): cmp-lz-prod
  display_global(type, segments=[])::
    std.join('-', [std.asciiLower(type), 'lz'] + [std.asciiLower(s) for s in segments]),

  // Tenancy key (no region, no lz): GRP-AUDITORS-ADMIN-KEY
  key_tenancy(type, segments=[])::
    std.join('-', [std.asciiUpper(type)] + [std.asciiUpper(s) for s in segments] + ['KEY']),

  // Tenancy display name (lowercase, no region, no lz): grp-auditors-admin
  display_tenancy(type, segments=[])::
    std.join('-', [std.asciiLower(type)] + [std.asciiLower(s) for s in segments]),

  // Internal lowercase identifiers without regional LZ suffixes.
  // Route rules use this shape and intentionally do not end in -KEY.
  route_rule(segments=[])::
    std.join('-', ['rr'] + [std.asciiLower(s) for s in segments]),

  // OCI compartment path: cmp-landingzone:cmp-lz-{seg1}:cmp-lz-{seg1}-{seg2}:...
  // Usage: n.compartment_path(['prod', 'platform', 'oke'])
  //   → 'cmp-landingzone:cmp-lz-prod:cmp-lz-prod-platform:cmp-lz-prod-platform-oke'
  compartment_path(segments)::
    local lo = [std.asciiLower(s) for s in segments];
    std.join(':', ['cmp-landingzone'] + [
      'cmp-lz-' + std.join('-', lo[0:i+1])
      for i in std.range(0, std.length(lo) - 1)
    ]),

  // Join parts into a DNS label, assert <= 15 chars
  dns_label(parts)::
    local joined = std.join('', parts);
    assert std.length(joined) <= 15 : 'dns_label exceeds 15 chars: %s (%d)' % [joined, std.length(joined)];
    joined,
}
