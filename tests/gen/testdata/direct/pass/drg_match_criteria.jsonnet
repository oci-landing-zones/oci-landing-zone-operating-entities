// ID-based DRG imports omit attachment_type; hybrid type-based imports retain it.
// contains: "failures": []
local lz = import 'gen/landing_zone.libsonnet';
local profiles = import 'gen/addons/oci-hybrid-connectivity/profiles.libsonnet';
local render(kind) = lz(profiles.hub_b_vpn_bgp + {
  hub: { kind: kind, network: { vcn: '10.0.0.0/21' } },
  remote_peering_connections: {
    peer: {
      remote_cidrs: ['10.1.0.0/16'],
      peer_region_name: 'eu-amsterdam-1',
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-amsterdam-1.example',
    },
  },
});
local checks(kind) =
  local network = render(kind).network.network_configuration;
  local drg = network.network_configuration_categories['0-shared']
    .non_vcn_specific_gateways.dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY'];
  local criteria = std.flattenArrays([
    [s.match_criteria for s in std.objectValues(d.statements)]
    for d in std.objectValues(drg.drg_route_distributions)
  ]);
  local ids = [c for c in criteria if c.match_type == 'DRG_ATTACHMENT_ID'];
  local types = [c for c in criteria if c.match_type == 'DRG_ATTACHMENT_TYPE'];
  [
    {
      name: kind + ': ID matches must identify an attachment without attachment_type',
      ok: std.length(ids) > 0 && std.all([
        std.objectHas(c, 'drg_attachment_key') && !std.objectHas(c, 'attachment_type')
        for c in ids
      ]),
    },
    {
      name: kind + ': VPN type matches must retain IPSEC_TUNNEL',
      ok: std.length(types) > 0 && std.all([
        c.attachment_type == 'IPSEC_TUNNEL' for c in types
      ]),
    },
  ];
{
  failures: [
    check.name
    for kind in ['hub_a', 'hub_b', 'hub_c', 'hub_e']
    for check in checks(kind)
    if !check.ok
  ],
}
