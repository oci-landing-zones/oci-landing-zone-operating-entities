// A firewall hub cannot opt into extension-local spoke NAT gateways.
// error_contains: Spoke NAT gateways are supported only with Hub E
local context = import 'gen/render_context.libsonnet';
context.from_raw_config({
  hub: { kind: 'hub_a', network: { vcn: '10.0.0.0/21' } },
}).extension_routing_context(true)
