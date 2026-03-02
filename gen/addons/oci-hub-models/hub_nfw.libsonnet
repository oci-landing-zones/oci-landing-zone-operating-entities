// Shared OCI Network Firewall policy components.
// Used by hub models A and B.
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

  // Shared address lists for spoke-facing NFW policies.
  _nfw_spoke_address_lists:: {
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

  // Shared security rules for spoke-facing NFW policies (east-west + south-north).
  _nfw_spoke_security_rules:: {
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

  // Complete spoke-facing NFW policy body (without display_name).
  // Used directly by Hub A INT. Hub B merges in lb2spokes.
  _nfw_spoke_policy:: {
    address_lists: $._nfw_spoke_address_lists,
    application_lists: $._nfw_application_lists,
    applications: $._nfw_applications,
    security_rules: $._nfw_spoke_security_rules,
    service_lists: $._nfw_service_lists,
    services: $._nfw_services,
    url_lists: $._nfw_url_lists,
  },
}
