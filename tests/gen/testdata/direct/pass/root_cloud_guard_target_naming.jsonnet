// root cloud guard target keeps the non-landing-zone root name
local summarize(payload) =
  local targets = payload.cloud_guard_configuration.targets;
  {
    has_root_key: std.objectHas(targets, 'CG-TGT-ROOT-KEY'),
    has_lz_root_key: std.objectHas(targets, 'CG-TGT-LZ-ROOT-KEY'),
    root_name: targets['CG-TGT-ROOT-KEY'].name,
    bad_target_names: [
      targets[target_key].name
      for target_key in std.objectFields(targets)
      if std.objectHas(targets[target_key], 'name') &&
         targets[target_key].name == 'cg-tgt-lz-root'
    ],
  };
{
  oneoe:
    summarize(import 'gen/blueprints/one-oe/runtime/one-stack/oneoe_security_cis1.jsonnet'),
  oke_single_stack:
    summarize(import 'gen/workload-extensions/oke/simple/single-stack/oke_security_cis1.jsonnet'),
}
