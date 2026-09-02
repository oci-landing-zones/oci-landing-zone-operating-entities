// Compact identifiers for known generated network scopes.
// Unknown customer-defined names remain unchanged so callers can validate
// service-specific limits without silently truncating them.

local environment_names = import './environment_names.libsonnet';

{
  compact(name)::
    if std.startsWith(name, 'shared-platform-') then
      'sp-' + name[std.length('shared-platform-'):]
    else
      environment_names.compact_prefix(name),
}
