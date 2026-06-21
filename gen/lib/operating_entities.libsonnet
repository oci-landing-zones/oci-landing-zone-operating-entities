local validation = import 'validation.libsonnet';

{
  local alphabet = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
    'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
    's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  ],
  local digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],

  local chars(s) =
    if std.length(s) == 0 then []
    else [std.substr(s, i, 1) for i in std.range(0, std.length(s) - 1)],

  local is_letter(c) = std.member(alphabet, c),
  local is_digit(c) = std.member(digits, c),
  local is_alnum(c) = is_letter(c) || is_digit(c),

  local unique(values) =
    std.foldl(
      function(acc, value)
        if std.member(acc, value) then acc else acc + [value],
      values,
      []
    ),

  local values(obj) = [obj[key] for key in std.objectFields(obj)],

  local letters(source) = [
    c
    for c in chars(std.asciiLower(source))
    if is_letter(c)
  ],

  local word_initials(source) =
    local cs = chars(std.asciiLower(source));
    if std.length(cs) == 0 then []
    else [
      local c = cs[i];
      c
      for i in std.range(0, std.length(cs) - 1)
      if is_letter(c) && (i == 0 || !is_alnum(cs[i - 1]))
    ],

  local dns_candidates(source, label) =
    local ls = letters(source);
    assert std.length(ls) >= 2 :
      '%s must contain at least two letters or set %s.dns explicitly' % [label, label];
    local initials = word_initials(source);
    local preferred =
      if std.length(initials) >= 2 then initials[0] + initials[1]
      else ls[0] + ls[1];
    unique([preferred] + [
      ls[0] + ls[i]
      for i in std.range(1, std.length(ls) - 1)
    ]),

  validate_dns(dns, label)::
    local cs = chars(dns);
    assert std.type(dns) == 'string' && std.length(cs) == 2 && is_letter(cs[0]) && is_letter(cs[1]) && dns == std.asciiLower(dns) :
      '%s must be exactly two lowercase letters' % label;
    dns,

  assign_dns(raw_oes)::
    local names = std.objectFields(raw_oes);
    local explicit = {
      [name]: self.validate_dns(raw_oes[name].dns, 'operating_entities.%s.dns' % name)
      for name in names
      if std.objectHas(raw_oes[name], 'dns') && raw_oes[name].dns != null
    };
    assert std.length(values(explicit)) == std.length(unique(values(explicit))) :
      'operating_entities dns labels must be unique';
    std.foldl(
      function(acc, name)
        if std.objectHas(acc, name) then acc
        else
          local candidates = [
            candidate
            for candidate in dns_candidates(name, 'operating_entities.%s' % name)
            if !std.member(values(acc), candidate)
          ];
          assert std.length(candidates) > 0 :
            'operating_entities.%s.dns could not be generated uniquely; set operating_entities.%s.dns explicitly' % [name, name];
          acc + { [name]: candidates[0] },
      names,
      explicit
    ),

  normalize(raw_oes)::
    local oes = validation.object(raw_oes, 'config.operating_entities');
    local names = std.objectFields(oes);
    assert std.length(names) > 0 : 'config.operating_entities must have at least one operating entity';
    local dns_by_name = self.assign_dns(oes);
    local oe_envs(name) =
      local envs = validation.required_object(
        oes[name],
        'environments',
        'operating_entities.%s.environments' % name
      );
      assert std.length(std.objectFields(envs)) > 0 :
        'operating_entities.%s.environments must have at least one environment' % name;
      envs;
    {
      [name]: validation.object(oes[name], 'operating_entities.%s' % name) {
        display_name:
          if std.objectHas(oes[name], 'display_name') && oes[name].display_name != null then
            oes[name].display_name
          else name,
        dns: dns_by_name[name],
        environments: oe_envs(name),
      }
      for name in names
    },
}
