{
  'NFWPCY-FRA-LZP-HUB-DMZ-POL1-KEY': {
    display_name: 'nfwpcy-fra-lzp-hub-dmz-pol1',
    services: {
      'NFW-SV-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-sv-fra-lzp-dmz-hub-1',
        type: 'TCP_SERVICE',
        minimum_port: '80',
        maximum_port: '8080',
      },
    },
    service_lists: {
      'NFW-SVL-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-svl-fra-lzp-hub-dmz-1',
        services: ['NFW-SV-FRA-LZP-HUB-DMZ-1-KEY'],
      },
    },
    address_lists: {
      'NFW-IL-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-il-fra-lzp-hub-dmz-1',
        type: 'IP',
        addresses: [
          '10.0.64.0/24',
          '10.0.128.0/24',
        ],
      },
    },
    url_lists: {
      'NFW-UL-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-ul-fra-lzp-hub-dmz-1',
        type: 'SIMPLE',
        pattern: 'testapp1.example.com',
      },
      'NFW-UL-FRA-LZP-HUB-DMZ-2-KEY': {
        name: 'nfw-ul-fra-lzp-hub-dmz-2',
        type: 'SIMPLE',
        pattern: 'www.google.com',
      },
    },
    security_rules: {
      'SECURITY-RULE-INETAPPS-KEY': {
        action: 'ALLOW',
        name: 'SecurityRuleInetApps',
        service_list: ['NFW-SVL-FRA-LZP-HUB-DMZ-1-KEY'],
      },
      'SECURITY-RULE-INTRUSION-KEY': {
        action: 'INSPECT',
        inspection: 'INTRUSION_DETECTION',
        name: 'SecurityRuleIntrusion',
        service_lists: ['NFW-SVL-FRA-LZP-HUB-DMZ-1-KEY'],
        source_address_lists: ['NFW-IL-FRA-LZP-HUB-DMZ-1-KEY'],
        url_lists: ['NFW-UL-FRA-LZP-HUB-DMZ-1-KEY'],
      },
    },
  },
  'NFWPCY-FRA-LZP-HUB-DMZ-POL2-KEY': {
    display_name: 'nfwpcy-fra-lzp-hub-dmz-pol2',
    services: {
      'NFW-SV-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-sv-fra-lzp-dmz-hub-1',
        type: 'TCP_SERVICE',
        minimum_port: '80',
        maximum_port: '8080',
      },
    },
    service_lists: {
      'NFW-SVL-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-svl-fra-lzp-hub-dmz-1',
        services: ['NFW-SV-FRA-LZP-HUB-DMZ-1-KEY'],
      },
    },
    address_lists: {
      'NFW-IL-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-il-fra-lzp-hub-dmz-1',
        type: 'IP',
        addresses: [
          '10.0.64.0/24',
          '10.0.128.0/24',
        ],
      },
    },
    url_lists: {
      'NFW-UL-FRA-LZP-HUB-DMZ-1-KEY': {
        name: 'nfw-ul-fra-lzp-hub-dmz-1',
        type: 'SIMPLE',
        pattern: 'testapp1.example.com',
      },
      'NFW-UL-FRA-LZP-HUB-DMZ-2-KEY': {
        name: 'nfw-ul-fra-lzp-hub-dmz-2',
        type: 'SIMPLE',
        pattern: 'www.google.com',
      },
    },
    security_rules: {
      'SECURITY-RULE-INETAPPS-KEY': {
        action: 'ALLOW',
        name: 'SecurityRuleInetApps',
        service_list: ['NFW-SVL-FRA-LZP-HUB-DMZ-1-KEY'],
      },
      'SECURITY-RULE-INTRUSION-KEY': {
        action: 'INSPECT',
        inspection: 'INTRUSION_DETECTION',
        name: 'SecurityRuleIntrusion',
        service_lists: ['NFW-SVL-FRA-LZP-HUB-DMZ-1-KEY'],
        source_address_lists: ['NFW-IL-FRA-LZP-HUB-DMZ-1-KEY'],
        url_lists: ['NFW-UL-FRA-LZP-HUB-DMZ-1-KEY'],
      },
    },
  },
  'NFWPCY-FRA-LZP-HUB-INT-POL1-KEY': {
    display_name: 'nfwpcy-fra-lzp-hub-int-pol1',
    services: {
      'NFW-SV-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-sv-fra-lzp-hub-int-1',
        type: 'TCP_SERVICE',
        minimum_port: '80',
        maximum_port: '8080',
      },
    },
    service_lists: {
      'NFW-SVL-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-svl-fra-lzp-hub-int-1',
        services: ['NFW-SV-FRA-LZP-HUB-INT-1-KEY'],
      },
    },
    address_lists: {
      'NFW-IL-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-il-fra-lzp-hub-int-1',
        type: 'IP',
        addresses: [
          '10.0.64.0/24',
          '10.0.128.0/24',
        ],
      },
    },
    url_lists: {
      'NFW-UL-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-ul-fra-lzp-hub-int-1',
        type: 'SIMPLE',
        pattern: 'testapp1.example.com',
      },
      'NFW-UL-FRA-LZP-HUB-INT-2-KEY': {
        name: 'nfw-ul-fra-lzp-hub-int-2',
        type: 'SIMPLE',
        pattern: 'www.google.com',
      },
    },
    security_rules: {
      'SECURITY-RULE-INETAPPS-KEY': {
        action: 'ALLOW',
        name: 'SecurityRuleIntApps',
        service_list: ['NFW-SVL-FRA-LZP-HUB-INT-1-KEY'],
      },
      'SECURITY-RULE-INTRUSION-KEY': {
        action: 'INSPECT',
        inspection: 'INTRUSION_DETECTION',
        name: 'SecurityRuleIntrusion',
        service_lists: ['NFW-SVL-FRA-LZP-HUB-INT-1-KEY'],
        source_address_lists: ['NFW-IL-FRA-LZP-HUB-INT-1-KEY'],
        url_lists: ['NFW-UL-FRA-LZP-HUB-INT-1-KEY'],
      },
      'SECURITY-RULE-NAT-KEY': {
        action: 'ALLOW',
        name: 'SecurityRuleNAT',
        source_address_lists: ['NFW-IL-FRA-LZP-HUB-INT-1-KEY'],
        url_lists: ['NFW-UL-FRA-LZP-HUB-INT-2-KEY'],
      },
    },
  },
  'NFWPCY-FRA-LZP-HUB-INT-POL2-KEY': {
    display_name: 'nfwpcy-fra-lzp-hub-int-pol2',
    services: {
      'NFW-SV-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-sv-fra-lzp-hub-int-1',
        type: 'TCP_SERVICE',
        minimum_port: '80',
        maximum_port: '8080',
      },
    },
    service_lists: {
      'NFW-SVL-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-svl-fra-lzp-hub-int-1',
        services: ['NFW-SV-FRA-LZP-HUB-INT-1-KEY'],
      },
    },
    address_lists: {
      'NFW-IL-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-il-fra-lzp-hub-int-1',
        type: 'IP',
        addresses: [
          '10.0.64.0/24',
          '10.0.128.0/24',
        ],
      },
    },
    url_lists: {
      'NFW-UL-FRA-LZP-HUB-INT-1-KEY': {
        name: 'nfw-ul-fra-lzp-hub-int-1',
        type: 'SIMPLE',
        pattern: 'testapp1.example.com',
      },
      'NFW-UL-FRA-LZP-HUB-INT-2-KEY': {
        name: 'nfw-ul-fra-lzp-hub-int-2',
        type: 'SIMPLE',
        pattern: 'www.google.com',
      },
    },
    security_rules: {
      'SECURITY-RULE-INETAPPS-KEY': {
        action: 'ALLOW',
        name: 'SecurityRuleIntApps',
        service_list: ['NFW-SVL-FRA-LZP-HUB-INT-1-KEY'],
      },
      'SECURITY-RULE-INTRUSION-KEY': {
        action: 'INSPECT',
        inspection: 'INTRUSION_DETECTION',
        name: 'SecurityRuleIntrusion',
        service_lists: ['NFW-SVL-FRA-LZP-HUB-INT-1-KEY'],
        source_address_lists: ['NFW-IL-FRA-LZP-HUB-INT-1-KEY'],
        url_lists: ['NFW-UL-FRA-LZP-HUB-INT-1-KEY'],
      },
      'SECURITY-RULE-NAT-KEY': {
        action: 'ALLOW',
        name: 'SecurityRuleNAT',
        source_address_lists: ['NFW-IL-FRA-LZP-HUB-INT-1-KEY'],
        url_lists: ['NFW-UL-FRA-LZP-HUB-INT-2-KEY'],
      },
    },
  },
}
