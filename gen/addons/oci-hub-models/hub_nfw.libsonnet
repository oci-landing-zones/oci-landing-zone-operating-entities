// hub_nfw.libsonnet — OCI Network Firewall policy components for hubs A and B.
//
// Exports:
//   _nfw_services                   — TCP service definitions (HTTP/HTTPS)
//   _nfw_service_lists              — Service list grouping HTTP + HTTPS
//   _nfw_applications               — ICMP Echo application definition
//   _nfw_application_lists          — Application list for ICMP
//   _nfw_url_lists                  — URL filter lists (oracle.com, google.com)
//   _nfw_address_lists              — Address lists for prod/preprod/public/all-spokes
//   _nfw_security_rules             — Base security rules (internal, used by _nfw_rules)
//   _nfw_rules(extras=null)         — Default rules with optional insertion + auto-renumber
//   _nfw_firewall_policy(name, extra_rules=null, extra_address_lists=null) — NFW policy bundle (key auto-derived from name)
//
// Architecture notes:
//   Hub A uses _nfw_firewall_policy directly for its INT firewall.
//   Hub A also has a separate DMZ policy built inline (not shared, ingress-specific).
//   Hub B extends _nfw_firewall_policy with extra lb address lists and lb2spokes rules.
//   The _nfw_rules function inserts extra rules after east-west and auto-renumbers all keys.
local ip = import 'subnetting.libsonnet';

{
  _nfw_services:: {
    'NFW-FRA-LZ-SERVICE-01-KEY': {
      name: 'nfw-fra-lz-service-01',
      type: 'TCP_SERVICE',
      minimum_port: '80',
      maximum_port: '80',
    },

    'NFW-FRA-LZ-SERVICE-02-KEY': {
      name: 'nfw-fra-lz-service-02',
      type: 'TCP_SERVICE',
      minimum_port: '443',
      maximum_port: '443',
    },
  },

  _nfw_service_lists:: {
    'NFW-FRA-LZ-SERLIST-01-KEY': {
      name: 'nfw-fra-lz-servicelist-01',
      services: ['NFW-FRA-LZ-SERVICE-01-KEY', 'NFW-FRA-LZ-SERVICE-02-KEY'],
    },
  },

  _nfw_applications:: {
    'NFW-FRA-LZ-APPLICATION-01-KEY': {
      name: 'nfw-fra-lz-application-01',
      type: 'ICMP',
      icmp_type: 8,
      icmp_code: 0,
    },
  },

  _nfw_application_lists:: {
    'NFW-FRA-LZ-APPLIST-01-KEY': {
      name: 'nfw-fra-lz-applist-01',
      applications: ['NFW-FRA-LZ-APPLICATION-01-KEY'],
    },
  },

  _nfw_url_lists:: {
    'NFW-FRA-LZ-URL-LIST-01-KEY': {
      name: 'nfw-fra-lz-url-list-01',
      type: 'SIMPLE',
      pattern: '*.oracle.com',
    },

    'NFW-FRA-LZ-URL-LIST-02-KEY': {
      name: 'nfw-fra-lz-url-list-02',
      type: 'SIMPLE',
      pattern: '*.google.com',
    },
  },

  // Shared address lists used by the NFW policies.
  _nfw_address_lists:: {
    'NFW-FRA-LZ-ADDRLIST-PREPROD-KEY': {
      name: 'nfw-fra-lz-addrlist-preprod',
      type: 'IP',
      addresses: [ip.preprod_vcn],
    },

    'NFW-FRA-LZ-ADDRLIST-PROD-KEY': {
      name: 'nfw-fra-lz-addrlist-prod',
      type: 'IP',
      addresses: [ip.prod_vcn],
    },

    'NFW-FRA-LZ-ADDRLIST-PUB-KEY': {
      name: 'nfw-fra-lz-addrlist-public',
      type: 'IP',
      addresses: ['0.0.0.0/0'],
    },

    'NFW-FRA-LZ-ADDRLIST-SPOKES-KEY': {
      name: 'nfw-fra-lz-addrlist-spokes',
      type: 'IP',
      addresses: [ip.prod_vcn, ip.preprod_vcn],
    },
  },

  // Base security rules for the shared NFW policy set (east-west + south-north).
  _nfw_security_rules:: {
    'NFW-FRA-LZ-SEC-RULE-01-KEY': {
      name: 'secrule-allow-eastwest',
      action: 'ALLOW',
      destination_address_lists: ['NFW-FRA-LZ-ADDRLIST-SPOKES-KEY'],
      source_address_lists: ['NFW-FRA-LZ-ADDRLIST-SPOKES-KEY'],
    },

    'NFW-FRA-LZ-SEC-RULE-02-KEY': {
      name: 'secrule-allow-spokes2internet-url',
      action: 'ALLOW',
      service_lists: ['NFW-FRA-LZ-SERLIST-01-KEY'],
      source_address_lists: ['NFW-FRA-LZ-ADDRLIST-PROD-KEY', 'NFW-FRA-LZ-ADDRLIST-PREPROD-KEY'],
      url_lists: ['NFW-FRA-LZ-URL-LIST-01-KEY', 'NFW-FRA-LZ-URL-LIST-02-KEY'],
    },

    'NFW-FRA-LZ-SEC-RULE-03-KEY': {
      name: 'secrule-allow-spokes2internet-icmp',
      action: 'ALLOW',
      application_lists: ['NFW-FRA-LZ-APPLIST-01-KEY'],
      destination_address_lists: ['NFW-FRA-LZ-ADDRLIST-PUB-KEY'],
      source_address_lists: ['NFW-FRA-LZ-ADDRLIST-PROD-KEY', 'NFW-FRA-LZ-ADDRLIST-PREPROD-KEY'],
    },
  },

  // Shared NFW security rules with optional extras rules.
  //   extras: null (default) = base rules only (east-west, url-filter, icmp).
  //     When provided, extras rules are inserted after the east-west rule
  //     and all keys are auto-renumbered sequentially.
  //   Returns: { 'NFW-FRA-LZ-SEC-RULE-NN-KEY': {...}, ... }
  _nfw_rules(extras=null)::
    local base_keys = std.objectFields($._nfw_security_rules);
    local base_vals = [
      $._nfw_security_rules[base_keys[i]]
      for i in std.range(0, std.length(base_keys) - 1)
    ];
    local all =
      if extras != null
      then [base_vals[0]] + extras + base_vals[1:]
      else base_vals;
    {
      ['NFW-FRA-LZ-SEC-RULE-%02d-KEY' % (i + 1)]: all[i]
      for i in std.range(0, std.length(all) - 1)
    },

  // Complete shared NFW firewall policy bundle (address lists, rules, services, URL lists).
  // Hub A uses the defaults directly. Hub B passes extra address lists and rules.
  _nfw_firewall_policy(name, extra_rules=null, extra_address_lists=null):: {
    [std.asciiUpper(name) + '-KEY']: {
      display_name: name,
      address_lists:
        $._nfw_address_lists
        + if extra_address_lists != null then extra_address_lists else {},
      application_lists: $._nfw_application_lists,
      applications: $._nfw_applications,
      security_rules: $._nfw_rules(extra_rules),
      service_lists: $._nfw_service_lists,
      services: $._nfw_services,
      url_lists: $._nfw_url_lists,
    },
  },
}
