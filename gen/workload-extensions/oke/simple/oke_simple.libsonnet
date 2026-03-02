local builder = import './oke_builder.libsonnet';

function(params)
  local rendered = builder.render(params);
  {
    metadata: rendered.metadata,
    contributions: rendered.contributions,
  }
