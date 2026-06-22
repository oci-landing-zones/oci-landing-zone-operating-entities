// Multi-OE generic multi-stack publication exposes OP01, OP02, and OP03 surfaces.
local profiles = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/profiles.libsonnet';
local published = import 'gen/blueprints/multi-oe/generic/runtime/multi-stack/published.libsonnet';
local rendered = published.render(profiles.hub_e.config);

{
  top_level_ops: std.objectFields(rendered),
  op01_keys: std.objectFields(rendered.op01),
  op02_oes: std.objectFields(rendered.op02),
  op02_alpha_keys: std.objectFields(rendered.op02.oe_alpha),
  op03_alpha_envs: std.objectFields(rendered.op03.oe_alpha),
  op03_alpha_preprod_projects: std.objectFields(rendered.op03.oe_alpha.preprod),
  op03_alpha_prod_projects: std.objectFields(rendered.op03.oe_alpha.prod),
  op03_alpha_proj1_keys: std.objectFields(rendered.op03.oe_alpha.prod.proj1),
}
