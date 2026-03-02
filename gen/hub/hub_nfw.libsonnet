// hub_nfw.libsonnet — OCI Network Firewall policy components for hubs A and B.
//
// PURE FUNCTION LIBRARY — no module-level imports of config or subnetting.
// Every function accepts a naming object (n) and explicit values.
//
// Exports:
//   _nfw_services(n)                — TCP service definitions (HTTP/HTTPS)
//   _nfw_service_lists(n)           — Service list grouping HTTP + HTTPS
//   _nfw_applications(n)            — ICMP Echo application definition
//   _nfw_application_lists(n)       — Application list for ICMP
//   _nfw_url_lists(n)               — URL filter lists (oracle.com, google.com)
//   _nfw_address_lists(n, address_entries) — Address lists from dynamic [{name, cidr}] entries + aggregate SPOKES + public
//   _nfw_security_rules(n, address_entries) — Base security rules (east-west, url-filter, icmp)
//   _nfw_rules(n, address_entries, extras=null) — Default rules with optional insertion + auto-renumber
//   _nfw_firewall_policy(n, address_entries, extras=null, extra_address_lists=null) — NFW policy bundle
//
// Architecture notes:
//   Hub A uses _nfw_firewall_policy directly for its INT firewall.
//   Hub A also has a separate DMZ policy built inline (not shared, ingress-specific).
//   Hub B extends _nfw_firewall_policy with extra lb address lists and lb2spokes rules.
//   The _nfw_rules function inserts extra rules after east-west and auto-renumbers all keys.

{
  // --- TCP Services ---

  _nfw_services(n):: {
    [n.key('NFW', ['SERVICE', '01'])]: {
      name: n.display('nfw', ['service', '01']),
      type: 'TCP_SERVICE',
      minimum_port: '80',
      maximum_port: '80',
    },

    [n.key('NFW', ['SERVICE', '02'])]: {
      name: n.display('nfw', ['service', '02']),
      type: 'TCP_SERVICE',
      minimum_port: '443',
      maximum_port: '443',
    },
  },

  // --- Service Lists ---

  _nfw_service_lists(n):: {
    [n.key('NFW', ['SERLIST', '01'])]: {
      name: n.display('nfw', ['serlist', '01']),
      services: [n.key('NFW', ['SERVICE', '01']), n.key('NFW', ['SERVICE', '02'])],
    },
  },

  // --- Applications ---

  _nfw_applications(n):: {
    [n.key('NFW', ['APPLICATION', '01'])]: {
      name: n.display('nfw', ['application', '01']),
      type: 'ICMP',
      icmp_type: 8,
      icmp_code: 0,
    },
  },

  // --- Application Lists ---

  _nfw_application_lists(n):: {
    [n.key('NFW', ['APPLIST', '01'])]: {
      name: n.display('nfw', ['applist', '01']),
      applications: [n.key('NFW', ['APPLICATION', '01'])],
    },
  },

  // --- URL Lists ---

  _nfw_url_lists(n):: {
    [n.key('NFW', ['URL', 'LIST', '01'])]: {
      name: n.display('nfw', ['url', 'list', '01']),
      type: 'SIMPLE',
      pattern: '*.oracle.com',
    },

    [n.key('NFW', ['URL', 'LIST', '02'])]: {
      name: n.display('nfw', ['url', 'list', '02']),
      type: 'SIMPLE',
      pattern: '*.google.com',
    },
  },

  // --- Address Lists ---
  // address_entries: [{name: 'prod', cidr: '10.0.64.0/21'}, {name: 'preprod', cidr: '10.0.128.0/21'}, ...]
  // Generates: one address list per entry + aggregate SPOKES list + public list

  _nfw_address_lists(n, address_entries)::
    // Per-entry address lists
    {
      [n.key('NFW', ['ADDRLIST', std.asciiUpper(entry.name)])]: {
        name: n.display('nfw', ['addrlist', entry.name]),
        type: 'IP',
        addresses: [entry.cidr],
      }
      for entry in address_entries
    }
    // Public address list
    + {
      [n.key('NFW', ['ADDRLIST', 'PUB'])]: {
        name: n.display('nfw', ['addrlist', 'public']),
        type: 'IP',
        addresses: ['0.0.0.0/0'],
      },
    }
    // Aggregate SPOKES list (all entry CIDRs)
    + {
      [n.key('NFW', ['ADDRLIST', 'SPOKES'])]: {
        name: n.display('nfw', ['addrlist', 'spokes']),
        type: 'IP',
        addresses: [entry.cidr for entry in address_entries],
      },
    },

  // --- Security Rules ---
  // Base security rules for the shared NFW policy set (east-west + south-north).

  _nfw_security_rules(n, address_entries):: {
    [n.key('NFW', ['SEC', 'RULE', '01'])]: {
      name: 'secrule-allow-eastwest',
      action: 'ALLOW',
      destination_address_lists: [n.key('NFW', ['ADDRLIST', 'SPOKES'])],
      source_address_lists: [n.key('NFW', ['ADDRLIST', 'SPOKES'])],
    },

    [n.key('NFW', ['SEC', 'RULE', '02'])]: {
      name: 'secrule-allow-spokes2internet-url',
      action: 'ALLOW',
      service_lists: [n.key('NFW', ['SERLIST', '01'])],
      source_address_lists: [
        n.key('NFW', ['ADDRLIST', std.asciiUpper(entry.name)])
        for entry in address_entries
      ],
      url_lists: [n.key('NFW', ['URL', 'LIST', '01']), n.key('NFW', ['URL', 'LIST', '02'])],
    },

    [n.key('NFW', ['SEC', 'RULE', '03'])]: {
      name: 'secrule-allow-spokes2internet-icmp',
      action: 'ALLOW',
      application_lists: [n.key('NFW', ['APPLIST', '01'])],
      destination_address_lists: [n.key('NFW', ['ADDRLIST', 'PUB'])],
      source_address_lists: [
        n.key('NFW', ['ADDRLIST', std.asciiUpper(entry.name)])
        for entry in address_entries
      ],
    },
  },

  // --- Rules with optional extras ---
  // Shared NFW security rules with optional extras rules.
  //   extras: null (default) = base rules only (east-west, url-filter, icmp).
  //     When provided, extras rules are inserted after the east-west rule
  //     and all keys are auto-renumbered sequentially.
  //   Returns: { 'NFW-{REGION}-LZ-SEC-RULE-NN-KEY': {...}, ... }

  _nfw_rules(n, address_entries, extras=null)::
    local base = $._nfw_security_rules(n, address_entries);
    local eastwest_key = n.key('NFW', ['SEC', 'RULE', '01']);
    local eastwest_val = base[eastwest_key];
    local rest_keys = [k for k in std.objectFields(base) if k != eastwest_key];
    local rest_vals = [base[k] for k in rest_keys];
    local all =
      if extras != null
      then [eastwest_val] + extras + rest_vals
      else [eastwest_val] + rest_vals;
    {
      [n.key('NFW', ['SEC', 'RULE', '%02d' % (i + 1)])]: all[i]
      for i in std.range(0, std.length(all) - 1)
    },

  // --- Complete Firewall Policy ---
  // Complete shared NFW firewall policy bundle (address lists, rules, services, URL lists).
  // policy_segments=[]      → key NFW-FRA-LZ-POLICY-01-KEY  (Hub B default)
  // policy_segments=['INT'] → key NFW-FRA-LZ-POLICY-INT-01-KEY  (Hub A internal)

  _nfw_firewall_policy(n, address_entries, extras=null, extra_address_lists=null, policy_segments=[])::
    local full_segments = ['POLICY'] + policy_segments + ['01'];
    {
    [n.key('NFW', full_segments)]: {
      display_name: n.display('nfw', [std.asciiLower(s) for s in full_segments]),
      address_lists:
        $._nfw_address_lists(n, address_entries)
        + (if extra_address_lists != null then extra_address_lists else {}),
      application_lists: $._nfw_application_lists(n),
      applications: $._nfw_applications(n),
      security_rules: $._nfw_rules(n, address_entries, extras),
      service_lists: $._nfw_service_lists(n),
      services: $._nfw_services(n),
      url_lists: $._nfw_url_lists(n),
    },
  },
}
