// Shared semantic labels and compact identifiers for known environment names.
// Unknown customer-defined names remain unchanged except for presentation casing.

local labels = import '../labels.libsonnet';

local known = {
  production: { short: 'Prod', long: 'Production', network: 'Prod', dns: 'p' },
  prod: { short: 'Prod', long: 'Production', network: 'Prod', dns: 'p' },
  'pre-production': { short: 'PreProd', long: 'Pre-Production', network: 'Pre-Production', dns: 'pp' },
  preproduction: { short: 'PreProd', long: 'Pre-Production', network: 'Pre-Production', dns: 'pp' },
  preprod: { short: 'PreProd', long: 'Pre-Production', network: 'Pre-Production', dns: 'pp' },
  development: { short: 'Dev', long: 'Development', network: 'Dev', dns: 'd' },
  dev: { short: 'Dev', long: 'Dev', network: 'Dev', dns: 'd' },
  staging: { short: 'Staging', long: 'Staging', network: 'Staging', dns: 'st' },
  'user-acceptance-testing': { short: 'UAT', long: 'User Acceptance Testing', network: 'UAT', dns: 'ua' },
  uat: { short: 'UAT', long: 'UAT', network: 'UAT', dns: 'ua' },
  testing: { short: 'Test', long: 'Testing', network: 'Test', dns: 't' },
  test: { short: 'Test', long: 'Test', network: 'Test', dns: 't' },
};

// Longest aliases first so a shorter alias cannot consume their prefix.
local aliases = [
  'user-acceptance-testing',
  'pre-production',
  'preproduction',
  'production',
  'development',
  'testing',
  'preprod',
  'staging',
  'prod',
  'uat',
  'test',
  'dev',
];

{
  label(name)::
    if std.objectHas(known, name) then known[name]
    else {
      short: labels.title_case(name),
      long: labels.title_case(name),
      network: labels.title_case(name),
      dns: name[0:2],
    },

  // Compact only a recognized environment prefix. Never truncate a custom name.
  compact_prefix(name)::
    local matches = [
      alias
      for alias in aliases
      if name == alias || std.startsWith(name, alias + '-')
    ];
    if std.length(matches) == 0 then name
    else
      local match = matches[0];
      known[match].dns + name[std.length(match):],
}
