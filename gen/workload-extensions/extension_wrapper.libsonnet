{
  fromBuilder(builder)::
    {
      metadata(params):: builder.metadata(params),

      render(params):: builder.render(params).contributions,
    } + (if std.objectHasAll(builder, 'aggregate') then {
      aggregate(results):: builder.aggregate(results),
    } else {}),
}
