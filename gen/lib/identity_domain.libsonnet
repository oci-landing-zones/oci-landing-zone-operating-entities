// Common identity-domain display name and qualified IAM group references.
{
  default_name: 'id_lz_common',
  name(config)::
    local value = if std.objectHas(config, 'identity_domain_name') then config.identity_domain_name else self.default_name;
    assert std.type(value) == 'string' : 'config.identity_domain_name must be a string';
    assert std.length(value) >= 1 && std.length(value) <= 100 :
           'config.identity_domain_name must contain between 1 and 100 characters';
    assert std.foldl(function(valid, char) valid && std.member(std.stringChars('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-'), char), std.stringChars(value), true) :
           'config.identity_domain_name may contain only letters, numbers, hyphens, periods, and underscores';
    value,
  group(domain, name):: "'%s'/'%s'" % [domain, name],
}
