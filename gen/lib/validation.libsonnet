{
  required(parent, key, label)::
    assert std.objectHas(parent, key) && parent[key] != null :
           '%s is required' % label;
    parent[key],

  object(value, label, return_contract=false)::
    assert std.type(value) == 'object' :
           if return_contract then '%s must return an object' % label
           else '%s must be an object' % label;
    value,

  required_object(parent, key, label)::
    self.object(self.required(parent, key, label), label),

  array(value, label, require_non_empty=false)::
    assert std.type(value) == 'array' :
           '%s must be an array' % label;
    assert !require_non_empty || std.length(value) > 0 :
           '%s must contain at least one value' % label;
    value,

  required_array(parent, key, label, require_non_empty=false)::
    self.array(self.required(parent, key, label), label, require_non_empty),

  allowed_keys(values, label, supported_keys)::
    local extra = [
      key
      for key in std.objectFields(values)
      if !std.member(supported_keys, key)
    ];
    assert std.length(extra) == 0 :
           '%s contains unsupported keys: %s' % [
      label,
      std.join(', ', extra),
    ];
    values,

  string_array_map(values, label, require_non_empty_arrays=false)::
    local keys = std.objectFields(values);
    local non_array_keys = [
      key
      for key in keys
      if std.type(values[key]) != 'array'
    ];
    assert std.length(non_array_keys) == 0 :
           '%s.%s must be an array' % [label, non_array_keys[0]];
    local empty_array_keys =
      if require_non_empty_arrays then [
        key
        for key in keys
        if std.length(values[key]) == 0
      ] else [];
    assert std.length(empty_array_keys) == 0 :
           '%s.%s must contain at least one value' % [label, empty_array_keys[0]];
    local invalid_values = std.flattenArrays([
      [
        '%s[%d]' % [key, i]
        for i in std.range(0, std.length(values[key]) - 1)
        if std.type(values[key][i]) != 'string' || values[key][i] == ''
      ]
      for key in keys
    ]);
    assert std.length(invalid_values) == 0 :
           '%s.%s must be a non-empty string' % [label, invalid_values[0]];
    values,
}
