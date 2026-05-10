local builder = import './exacs_builder.libsonnet';

{
  metadata(params):: builder.metadata(params),

  render(params)::
    local rendered = builder.render(params);
    rendered.contributions,
}
