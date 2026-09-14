// A valid DR pair preserves separate regions, matching hubs, and exact advertised VCNs.
// contains: "home_region": "eu-frankfurt-1"
// contains: "dr_region": "uk-london-1"
// contains: "hub_models_match": true
local pair = (import 'gen/dr_pair.libsonnet')(
  import 'tests/gen/testdata/dr/home_hub_b.jsonnet',
  import 'tests/gen/testdata/dr/dr_hub_b.jsonnet'
);

{
  home_region: pair.home.ctx.config.region,
  dr_region: pair.dr.ctx.config.region,
  hub_models_match:
    pair.home.ctx.config.hub.kind == 'hub_b' &&
    pair.dr.ctx.config.hub.kind == 'hub_b',
  home_advertised_cidrs: pair.home.advertised_cidrs,
  dr_advertised_cidrs: pair.dr.advertised_cidrs,
}
