{
  unique(values)::
    std.foldl(
      function(acc, value)
        if std.member(acc, value) then acc
        else acc + [value],
      values,
      []
    ),
}
