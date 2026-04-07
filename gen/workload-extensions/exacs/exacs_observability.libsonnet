local shared_base = import 'exacs_observability_shared_base.libsonnet';
local logging = import 'exacs_observability_logging.libsonnet';

function(params={})
  local include_logging = std.get(params, 'include_logging', false);
  shared_base +
  (if include_logging then logging else {})
