// gen/builders/observability.libsonnet
// Observability builder: alarms, events, notifications, service connectors, and logging.
//
// Generates the same structures as:
//   blueprints/one-oe/runtime/one-stack/oneoe_observability_cis1_pre.json
//   blueprints/one-oe/runtime/one-stack/oneoe_observability_cis1.json
//   blueprints/one-oe/runtime/one-stack/oneoe_observability_cis2_pre.json
//   blueprints/one-oe/runtime/one-stack/oneoe_observability_cis2.json
//
// function(config, n, realm_constants, topo) → { cis1_pre, cis1, cis2_pre, cis2 }

function(config, n, realm_constants, topo)
  local env_names = topo.ordered_env_names();

  // --- Event type constants ---
  local network_events = [
    'com.oraclecloud.virtualnetwork.createvcn',
    'com.oraclecloud.virtualnetwork.deletevcn',
    'com.oraclecloud.virtualnetwork.updatevcn',
    'com.oraclecloud.virtualnetwork.createroutetable',
    'com.oraclecloud.virtualnetwork.deleteroutetable',
    'com.oraclecloud.virtualnetwork.updateroutetable',
    'com.oraclecloud.virtualnetwork.changeroutetablecompartment',
    'com.oraclecloud.virtualnetwork.createsecuritylist',
    'com.oraclecloud.virtualnetwork.deletesecuritylist',
    'com.oraclecloud.virtualnetwork.updatesecuritylist',
    'com.oraclecloud.virtualnetwork.changesecuritylistcompartment',
    'com.oraclecloud.virtualnetwork.createnetworksecuritygroup',
    'com.oraclecloud.virtualnetwork.deletenetworksecuritygroup',
    'com.oraclecloud.virtualnetwork.updatenetworksecuritygroup',
    'com.oraclecloud.virtualnetwork.updatenetworksecuritygroupsecurityrules',
    'com.oraclecloud.virtualnetwork.changenetworksecuritygroupcompartment',
    'com.oraclecloud.virtualnetwork.createdrg',
    'com.oraclecloud.virtualnetwork.deletedrg',
    'com.oraclecloud.virtualnetwork.updatedrg',
    'com.oraclecloud.virtualnetwork.createdrgattachment',
    'com.oraclecloud.virtualnetwork.deletedrgattachment',
    'com.oraclecloud.virtualnetwork.updatedrgattachment',
    'com.oraclecloud.virtualnetwork.createinternetgateway',
    'com.oraclecloud.virtualnetwork.deleteinternetgateway',
    'com.oraclecloud.virtualnetwork.updateinternetgateway',
    'com.oraclecloud.virtualnetwork.changeinternetgatewaycompartment',
    'com.oraclecloud.virtualnetwork.createlocalpeeringgateway',
    'com.oraclecloud.virtualnetwork.deletelocalpeeringgateway.end',
    'com.oraclecloud.virtualnetwork.updatelocalpeeringgateway',
    'com.oraclecloud.virtualnetwork.changelocalpeeringgatewaycompartment',
    'com.oraclecloud.natgateway.createnatgateway',
    'com.oraclecloud.natgateway.deletenatgateway',
    'com.oraclecloud.natgateway.updatenatgateway',
    'com.oraclecloud.natgateway.changenatgatewaycompartment',
    'com.oraclecloud.servicegateway.createservicegateway',
    'com.oraclecloud.servicegateway.deleteservicegateway.end',
    'com.oraclecloud.servicegateway.attachserviceid',
    'com.oraclecloud.servicegateway.detachserviceid',
    'com.oraclecloud.servicegateway.updateservicegateway',
    'com.oraclecloud.servicegateway.changeservicegatewaycompartment',
    'com.oraclecloud.virtualnetwork.changepublicipcompartment',
    'com.oraclecloud.virtualnetwork.createpublicip',
    'com.oraclecloud.virtualnetwork.changedhcpoptionscompartment',
  ];

  local security_events = [
    'com.oraclecloud.notification.createsubscription',
    'com.oraclecloud.notification.deletesubscription',
    'com.oraclecloud.notification.getunsubscription',
    'com.oraclecloud.notification.movesubscription',
    'com.oraclecloud.notification.resendsubscriptionconfirmation',
    'com.oraclecloud.notification.updatesubscription',
  ];

  local cloudguard_events = [
    'com.oraclecloud.cloudguard.problemdetected',
    'com.oraclecloud.cloudguard.problemdismissed',
    'com.oraclecloud.cloudguard.problemremediated',
    'com.oraclecloud.cloudguard.announcements',
    'com.oraclecloud.cloudguard.status',
    'com.oraclecloud.cloudguard.problemthresholdreached',
  ];

  local iam_events = [
    'com.oraclecloud.identitycontrolplane.createidentityprovider',
    'com.oraclecloud.identitycontrolplane.deleteidentityprovider',
    'com.oraclecloud.identitycontrolplane.updateidentityprovider',
    'com.oraclecloud.identitycontrolplane.createidpgroupmapping',
    'com.oraclecloud.identitycontrolplane.deleteidpgroupmapping',
    'com.oraclecloud.identitycontrolplane.updateidpgroupmapping',
    'com.oraclecloud.identitycontrolplane.addusertogroup',
    'com.oraclecloud.identitycontrolplane.creategroup',
    'com.oraclecloud.identitycontrolplane.deletegroup',
    'com.oraclecloud.identitycontrolplane.removeuserfromgroup',
    'com.oraclecloud.identitycontrolplane.updategroup',
    'com.oraclecloud.identitycontrolplane.createpolicy',
    'com.oraclecloud.identitycontrolplane.deletepolicy',
    'com.oraclecloud.identitycontrolplane.updatepolicy',
    'com.oraclecloud.identitycontrolplane.createuser',
    'com.oraclecloud.identitycontrolplane.deleteuser',
    'com.oraclecloud.identitycontrolplane.updateuser',
    'com.oraclecloud.identitycontrolplane.updateusercapabilities',
    'com.oraclecloud.identitycontrolplane.updateuserstate',
    'com.oraclecloud.identityControlPlane.UpdateSwiftPassword',
    'com.oraclecloud.identityControlPlane.CreateOrResetPassword',
  ];

  local placeholder_email = 'email.address@example.com';

  // --- Per-env event rules ---
  // Each env gets a network notify rule and a security notify rule.
  local env_event_rules = std.foldl(
    function(acc, env_name)
      acc + {
        [n.key_global('RUL', [env_name, 'NOTIFY', 'NETWORK'])]: {
          compartment_id: n.key_global('CMP', [env_name, 'NETWORK']),
          destination_topic_ids: [n.key_global('NOTT', ['NETWORK'])],
          event_display_name: n.display_global('rul', [env_name, 'notify', 'network']),
          supplied_events: network_events,
        },
        [n.key_global('RUL', [env_name, 'NOTIFY', 'SECURITY'])]: {
          compartment_id: n.key_global('CMP', [env_name, 'SECURITY']),
          destination_topic_ids: [n.key_global('NOTT', ['SECURITY'])],
          event_display_name: n.display_global('rul', [env_name, 'notify', 'security']),
          supplied_events: security_events,
        },
      },
    env_names,
    {}
  );

  // --- Base observability (CIS1 pre / CIS1) ---
  local base = {
    alarms_configuration: {
      default_compartment_id: n.key_global('CMP', ['NETWORK']),

      alarms: {
        [n.key_global('AL', ['NETWORK', 'LB'])]: {
          display_name: n.display_global('al', ['network', 'lb']),
          destination_topic_ids: [n.key_global('NOTT', ['NETWORK'])],
          is_enabled: 'false',

          supplied_alarm: {
            message_format: 'PRETTY_JSON',
            namespace: 'oci_lbaas',
            pending_duration: 'PT5M',
            query: 'UnHealthyBackendServers[1m].mean() >= 0',
          },
        },
      },
    },

    events_configuration: {
      default_compartment_id: 'CMP-LANDINGZONE-KEY',

      event_rules: {
        [n.key_global('RUL', ['NOTIFY', 'NETWORK'])]: {
          compartment_id: n.key_global('CMP', ['NETWORK']),
          destination_topic_ids: [n.key_global('NOTT', ['NETWORK'])],
          event_display_name: n.display_global('rul', ['notify', 'network']),
          supplied_events: network_events,
        },

        [n.key_global('RUL', ['NOTIFY', 'SECURITY'])]: {
          compartment_id: n.key_global('CMP', ['SECURITY']),
          destination_topic_ids: [n.key_global('NOTT', ['SECURITY'])],
          event_display_name: n.display_global('rul', ['notify', 'security']),
          supplied_events: security_events,
        },
      } + env_event_rules,
    },

    home_region_events_configuration: {
      default_compartment_id: 'TENANCY-ROOT',

      event_rules: {
        [n.key_global('RUL', ['CLOUDGUARD'])]: {
          destination_topic_ids: [n.key_global('NOTT', ['CLOUDGUARD'])],
          event_display_name: n.display_global('rul', ['notify-on-cloudguard-changes']),
          supplied_events: cloudguard_events,
        },

        [n.key_global('RUL', ['IAM'])]: {
          destination_topic_ids: [n.key_global('NOTT', ['IAM'])],
          event_display_name: n.display_global('rul', ['notify-on-iam-changes']),
          supplied_events: iam_events,
        },
      },
    },

    notifications_configuration: {
      default_compartment_id: n.key_global('CMP', ['SECURITY']),

      topics: {
        [n.key_global('NOTT', ['CLOUDGUARD'])]: {
          name: n.display_global('nott', ['cloudguard']),
          description: 'Topic for Cloud Guard related notifications.',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: [{ protocol: 'EMAIL', values: [placeholder_email] }],
        },

        [n.key_global('NOTT', ['IAM'])]: {
          name: n.display_global('nott', ['iam']),
          description: 'Topic for IAM related notifications.',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: [{ protocol: 'EMAIL', values: [placeholder_email] }],
        },

        [n.key_global('NOTT', ['NETWORK'])]: {
          name: n.display_global('nott', ['network']),
          description: 'Topic for network related notifications.',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: [{ protocol: 'EMAIL', values: [placeholder_email] }],
        },

        [n.key_global('NOTT', ['SECURITY'])]: {
          name: n.display_global('nott', ['security']),
          description: 'Topic for notifications.',
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: [{ protocol: 'EMAIL', values: [placeholder_email] }],
        },
      },
    },

    service_connectors_configuration: {
      default_compartment_id: n.key_global('CMP', ['SECURITY']),

      buckets: {
        [n.key_global('BKT', ['SERVICE', 'CONNECTOR'])]: {
          name: n.display_global('bkt', ['service', 'connector']),
          compartment_id: n.key_global('CMP', ['SECURITY']),
          cis_level: '1',
        },
      },

      service_connectors: {
        [n.key_global('SCH', ['MONITOR'])]: {
          display_name: n.display_global('sch', ['monitor']),

          policy: {
            name: 'service-connector-audit-policy',
            description: 'IAM policy for letting Service Connector to push data to target resource.',
            compartment_id: n.key_global('CMP', ['SECURITY']),
          },

          source: {
            kind: 'logging',
            audit_logs: [{ cmp_id: 'ALL' }],
          },

          target: {
            bucket_name: n.display_global('bkt', ['service', 'connector']),
            bucket_object_name_prefix: 'sch',
            kind: 'objectstorage',
          },
        },
      },
    },
  };

  // --- Per-env flow logs and log groups (CIS2 only) ---
  local env_flow_logs = std.foldl(
    function(acc, env_name)
      acc + {
        [n.key_global('LOG', [env_name, 'SUBNET', 'FLOW'])]: {
          log_group_id: n.key_global('LGRP', [env_name, 'VCN', 'FLOW']),
          target_compartment_ids: [n.key_global('CMP', [env_name, 'NETWORK'])],
          target_resource_type: 'subnet',
        },
        [n.key_global('LOG', [env_name, 'VCN', 'FLOW'])]: {
          log_group_id: n.key_global('LGRP', [env_name, 'VCN', 'FLOW']),
          target_compartment_ids: [n.key_global('CMP', [env_name, 'NETWORK'])],
          target_resource_type: 'vcn',
        },
      },
    env_names,
    {}
  );

  local env_log_groups = std.foldl(
    function(acc, env_name)
      acc + {
        [n.key_global('LGRP', [env_name, 'VCN', 'FLOW'])]: {
          name: n.display_global('lgrp', [env_name, 'vcn', 'flow']),
          compartment_id: n.key_global('CMP', [env_name, 'SECURITY']),
        },
      },
    env_names,
    {}
  );

  local logging_configuration = {
    logging_configuration: {
      default_compartment_id: n.key_global('CMP', ['SECURITY']),

      flow_logs: env_flow_logs + {
        [n.key_global('LOG', ['SUBNET', 'FLOW'])]: {
          log_group_id: n.key_global('LGRP', ['VCN', 'FLOW']),
          target_compartment_ids: [n.key_global('CMP', ['NETWORK'])],
          target_resource_type: 'subnet',
        },
        [n.key_global('LOG', ['VCN', 'FLOW'])]: {
          log_group_id: n.key_global('LGRP', ['VCN', 'FLOW']),
          target_compartment_ids: [n.key_global('CMP', ['NETWORK'])],
          target_resource_type: 'vcn',
        },
      },

      log_groups: env_log_groups + {
        [n.key_global('LGRP', ['VCN', 'FLOW'])]: {
          name: n.display_global('lgrp', ['vcn', 'flow']),
          compartment_id: n.key_global('CMP', ['SECURITY']),
        },
      },
    },
  };

  // --- CIS2 bucket override (cis_level 2 + KMS) ---
  local cis2_bucket_override = {
    service_connectors_configuration+: {
      buckets+: {
        [n.key_global('BKT', ['SERVICE', 'CONNECTOR'])]+: {
          cis_level: '2',
          kms_key_id: n.key_global('KEY', ['SHARED', 'OSS', 'AUDIT', 'BKT']),
        },
      },
    },
  };

  // Pre variants: no logging_configuration
  // Non-pre variants: add logging_configuration (flow logs)
  // CIS1: bucket cis_level "1", no KMS
  // CIS2: bucket cis_level "2" + KMS key
  local cis1_pre = base;
  local cis1 = base + logging_configuration;

  local cis2_pre = base + cis2_bucket_override;
  local cis2 = base + logging_configuration + cis2_bucket_override;

  // Return all four variants
  {
    cis1_pre: cis1_pre,
    cis1: cis1,
    cis2_pre: cis2_pre,
    cis2: cis2,
  }
