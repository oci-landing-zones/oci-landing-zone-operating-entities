{
  fromBuilder(builder):: {
    metadata(params):: builder.metadata(params),

    render(params):: builder.render(params).contributions,
  },
}
