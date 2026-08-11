// Amsterdam DR security contains only regional VSS.
// contains: "recipe_key": "VSS-RCPH-AMS-LZ-KEY"
// contains: "target_key": "VSS-TGTH-AMS-LZ-KEY"
local security = import 'gen/addons/oci-lz-dr/one-oe/runtime/oneoe_bcdr_security.jsonnet';
local scanning = security.scanning_configuration;
{
  recipe_key: std.objectFields(scanning.host_recipes)[0],
  target_key: std.objectFields(scanning.host_targets)[0],
  top_level_keys: std.objectFields(security),
}
