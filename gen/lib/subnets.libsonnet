{
  prefix_block_sizes: {
    '21': 2048,
    '22': 1024,
    '23': 512,
    '24': 256,
    '25': 128,
    '26': 64,
    '27': 32,
    '28': 16,
  },

  block_size_for_prefix(size)::
    local prefix = std.toString(std.parseInt(std.stripChars(size, '/')));
    assert std.objectHas(self.prefix_block_sizes, prefix) :
      'Unsupported subnet prefix /%d. Supported: /21 through /28' % std.parseInt(prefix);
    self.prefix_block_sizes[prefix],

  validate_subnet_map(subnets, required_keys, label)::
    assert subnets != null && std.type(subnets) == 'object' :
      '%s must be an object' % label;
    local missing = [k for k in required_keys if !std.objectHas(subnets, k)];
    local extra = [k for k in std.objectFields(subnets) if !std.member(required_keys, k)];
    assert std.length(missing) == 0 :
      '%s missing required keys: %s' % [label, std.join(', ', missing)];
    assert std.length(extra) == 0 :
      '%s has unsupported keys: %s. Allowed: %s' % [
        label,
        std.join(', ', extra),
        std.join(', ', required_keys),
      ];
    assert std.all([
      subnets[k] != null && std.type(subnets[k]) == 'string'
      for k in required_keys
    ]) :
      '%s values must be non-null strings' % label;
    subnets,
}
