// Hub E declares the network targets common to all four published hubs.
// Firewall-specific subnets are covered by the VCN-level Flow Log.
local profiles = import './profiles.libsonnet';
local output = import './output_builder.libsonnet';
output(profiles.hub_e).observability_cis2_explicit
