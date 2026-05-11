local digit_map = {
  '0': true,
  '1': true,
  '2': true,
  '3': true,
  '4': true,
  '5': true,
  '6': true,
  '7': true,
  '8': true,
  '9': true,
};

{
  is_decimal_string(value)::
    std.type(value) == 'string'
    && std.length(value) > 0
    && std.all([std.objectHas(digit_map, c) for c in std.stringChars(value)]),

  is_canonical_decimal_string(value)::
    self.is_decimal_string(value)
    && (std.length(value) == 1 || std.substr(value, 0, 1) != '0'),

  parse_decimal(label, value)::
    assert self.is_decimal_string(value) : '%s must be numeric' % label;
    std.parseInt(value),

  ip_to_int(octets)::
    octets[0] * 16777216
    + octets[1] * 65536
    + octets[2] * 256
    + octets[3],

  block_size(prefix)::
    std.floor(std.pow(2, 32 - prefix)),

  int_to_octets(ip_int)::
    [
      std.floor(ip_int / 16777216) % 256,
      std.floor(ip_int / 65536) % 256,
      std.floor(ip_int / 256) % 256,
      ip_int % 256,
    ],

  format_ip(ip_int)::
    local octets = self.int_to_octets(ip_int);
    '%d.%d.%d.%d' % [
      octets[0],
      octets[1],
      octets[2],
      octets[3],
    ],

  format_cidr(base_int, prefix)::
    '%s/%d' % [self.format_ip(base_int), prefix],

  parse(label, cidr)::
    assert cidr != null && std.type(cidr) == 'string' :
      '%s must be a canonical IPv4 CIDR string' % label;
    local parts = std.split(cidr, '/');
    assert std.length(parts) == 2 :
      '%s must be a canonical IPv4 CIDR' % label;
    local ip_parts = std.split(parts[0], '.');
    assert std.length(ip_parts) == 4 :
      '%s must be a canonical IPv4 CIDR' % label;
    assert std.all([self.is_canonical_decimal_string(part) for part in ip_parts]) :
      '%s must be a canonical IPv4 CIDR' % label;
    assert self.is_canonical_decimal_string(parts[1]) :
      '%s must be a canonical IPv4 CIDR' % label;
    local octets = [
      local octet = self.parse_decimal('%s octet %d' % [label, i + 1], ip_parts[i]);
      assert octet >= 0 && octet <= 255 :
        '%s octet %d must be between 0 and 255' % [label, i + 1];
      octet
      for i in std.range(0, 3)
    ];
    local prefix = self.parse_decimal('%s prefix' % label, parts[1]);
    assert prefix >= 0 && prefix <= 32 :
      '%s prefix must be between 0 and 32' % label;
    local block_size = self.block_size(prefix);
    local base_int = self.ip_to_int(octets);
    assert base_int % block_size == 0 :
      '%s must be a canonical IPv4 CIDR' % label;
    {
      cidr: cidr,
      base_int: base_int,
      end_int: base_int + block_size - 1,
      prefix: prefix,
      block_size: block_size,
    },

  validate(label, cidr)::
    self.parse(label, cidr).cidr,

  contains(parent_cidr, child_cidr)::
    local parent = self.parse('parent CIDR', parent_cidr);
    local child = self.parse('child CIDR', child_cidr);
    child.base_int >= parent.base_int && child.end_int <= parent.end_int,

  overlaps(first_cidr, second_cidr)::
    local first = self.parse('first CIDR', first_cidr);
    local second = self.parse('second CIDR', second_cidr);
    first.base_int <= second.end_int && second.base_int <= first.end_int,

  assert_non_overlapping(entries, label)::
    local overlaps = if std.length(entries) < 2 then [] else [
      '%s (%s) overlaps %s (%s)' % [
        entries[i].label,
        entries[i].cidr,
        entries[j].label,
        entries[j].cidr,
      ]
      for i in std.range(0, std.length(entries) - 2)
      for j in std.range(i + 1, std.length(entries) - 1)
      if self.overlaps(entries[i].cidr, entries[j].cidr)
    ];
    assert std.length(overlaps) == 0 :
      '%s contains overlapping CIDRs: %s' % [label, std.join('; ', overlaps)];
    true,
}
