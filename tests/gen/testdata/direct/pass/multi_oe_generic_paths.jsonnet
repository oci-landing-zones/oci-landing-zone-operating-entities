// Multi-OE publication source must live under the unversioned generic path.
local profile = import 'gen/blueprints/multi-oe/generic/runtime/profiles.libsonnet';
{
  profile_hubs: std.objectFields(profile),
  alpha_envs: std.objectFields(profile.hub_e.config.operating_entities.oe_alpha.environments),
  beta_envs: std.objectFields(profile.hub_e.config.operating_entities.oe_beta.environments),
}
