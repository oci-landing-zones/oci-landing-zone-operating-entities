local cidrs = import 'cidrs.libsonnet';
local collections = import 'collections.libsonnet';
local validation = import 'validation.libsonnet';

{
  local validate_subnet_object(subnets, label) =
    validation.object(subnets, label),

  local validate_subnet_keys(subnets, required_keys, label) =
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
    subnets,

  local validate_subnet_values(subnets, keys, label, parent_cidr=null) =
    assert collections.all([
      subnets[k] != null && std.type(subnets[k]) == 'string'
      for k in keys
    ]) :
      '%s values must be non-null strings' % label;
    local entries = [
      {
        label: '%s.%s' % [label, k],
        cidr: cidrs.validate('%s.%s' % [label, k], subnets[k]),
      }
      for k in keys
    ];
    assert cidrs.assert_non_overlapping(entries, label);
    if parent_cidr != null then
      assert collections.all([
        cidrs.contains(parent_cidr, subnets[k])
        for k in keys
      ]) :
        '%s must be contained by %s' % [label, parent_cidr];
      subnets
    else subnets,

  block_size_for_prefix(size)::
    local prefix = std.parseInt(std.stripChars(size, '/'));
    assert prefix >= 21 && prefix <= 28 :
      'Unsupported subnet prefix /%d. Supported: /21 through /28' % prefix;
    cidrs.block_size(prefix),

  auto_subnets(vcn_cidr, subnet_defs)::
    local base = cidrs.parse('VCN %s' % vcn_cidr, vcn_cidr);
    local vcn_limit = base.base_int + base.block_size;
    local allocated = std.foldl(
      function(acc, def)
        local prefix = std.parseInt(std.stripChars(def.size, '/'));
        local block_size = self.block_size_for_prefix(def.size);
        local raw_offset = acc.offset;
        local aligned_offset =
          if raw_offset % block_size == 0 then raw_offset
          else (std.floor(raw_offset / block_size) + 1) * block_size;
        local subnet_base = base.base_int + aligned_offset;
        assert subnet_base + block_size <= vcn_limit :
          'Subnet allocation exceeds VCN %s while allocating %s (%s)' % [vcn_cidr, def.name, def.size];
        acc {
          offset: aligned_offset + block_size,
          result+: { [def.name]: cidrs.format_cidr(subnet_base, prefix) },
        },
      subnet_defs,
      { offset: 0, result: {} }
    );
    allocated.result,

  auto_subnets_24(vcn_cidr, names)::
    self.auto_subnets(vcn_cidr, [{ name: n, size: '/24' } for n in names]),

  validate_subnet_map(subnets, required_keys, label, parent_cidr=null)::
    local checked_subnets = validate_subnet_keys(
      validate_subnet_object(subnets, label),
      required_keys,
      label
    );
    validate_subnet_values(checked_subnets, required_keys, label, parent_cidr),

  validate_named_subnets(subnets, label, parent_cidr=null)::
    local checked_subnets = validate_subnet_object(subnets, label);
    local keys = std.objectFields(checked_subnets);
    assert std.length(keys) > 0 :
      '%s must contain at least one subnet' % label;
    validate_subnet_values(checked_subnets, keys, label, parent_cidr),
}
