// gen/workload-extensions/exacc/exacc_builder.libsonnet
// Config-driven ExaDB-C@C workload extension.

local descriptions = import './descriptions.libsonnet';

{
  metadata(params):: {
    requires_network: false,
  },

  render(params)::
    assert std.objectHas(params, 'topology') : 'exacc requires topology scope semantics';
    assert std.objectHas(params, 'config_params') : 'exacc requires config_params';
    local n = params.naming;
    local scope = params.topology;
    local scope_config =
      if std.objectHas(params, 'scope_config') then params.scope_config
      else {};
    local cfg = params.config_params;

    assert std.objectHas(cfg, 'notification_emails') && cfg.notification_emails != null :
      'exacc notification_emails is required';
    assert std.type(cfg.notification_emails) == 'object' :
      'exacc notification_emails must be an object';
    assert std.objectHas(cfg.notification_emails, 'default') :
      'exacc notification_emails.default is required';
    assert std.type(cfg.notification_emails.default) == 'array' :
      'exacc notification_emails.default must be an array';
    assert std.length(cfg.notification_emails.default) > 0 :
      'exacc notification_emails.default must contain at least one value';
    local supported_notification_keys = ['default', 'db_workloads', 'infra_workloads', 'projects'];
    assert std.all([
      std.member(supported_notification_keys, key)
      for key in std.objectFields(cfg.notification_emails)
    ]) : 'exacc notification_emails contains unsupported keys: %s' % std.join(', ', [
      key
      for key in std.objectFields(cfg.notification_emails)
      if !std.member(supported_notification_keys, key)
    ]);
    local notification_email_keys = std.objectFields(cfg.notification_emails);
    local non_array_notification_keys = [
      key
      for key in notification_email_keys
      if std.type(cfg.notification_emails[key]) != 'array'
    ];
    assert std.length(non_array_notification_keys) == 0 :
      'exacc notification_emails.%s must be an array' % non_array_notification_keys[0];
    local empty_notification_keys = [
      key
      for key in notification_email_keys
      if std.length(cfg.notification_emails[key]) == 0
    ];
    assert std.length(empty_notification_keys) == 0 :
      'exacc notification_emails.%s must contain at least one value' % empty_notification_keys[0];
    local invalid_notification_value_keys = [
      key
      for key in notification_email_keys
      if std.length([
        value
        for value in cfg.notification_emails[key]
        if std.type(value) != 'string' || value == ''
      ]) > 0
    ];
    assert std.length(invalid_notification_value_keys) == 0 :
      'exacc notification_emails.%s values must be non-empty strings' % invalid_notification_value_keys[0];
    local notification_emails = {
      [key]: cfg.notification_emails[key]
      for key in notification_email_keys
    };
    local topic_emails(key) =
      if std.objectHas(notification_emails, key) then notification_emails[key]
      else notification_emails['default'];

    local project_db_compartments =
      if std.objectHas(cfg, 'project_db_compartments') && cfg.project_db_compartments != null then
        assert scope.scope_type == 'environment' :
          'exacc project_db_compartments can only be set on environment platforms';
        assert std.type(cfg.project_db_compartments) == 'array' :
          'exacc project_db_compartments must be an array';
        cfg.project_db_compartments
      else [];
    local scope_projects =
      if std.objectHas(scope_config, 'projects') then scope_config.projects
      else [];
    assert std.all([std.member(scope_projects, project_name) for project_name in project_db_compartments]) :
      'exacc project_db_compartments must reference projects defined in the same environment: %s' %
      std.join(', ', [
        project_name
        for project_name in project_db_compartments
        if !std.member(scope_projects, project_name)
      ]);

    local tag_key = 'tagns-lz-role.tag-lz-role';
    local tag_exacc = 'lz-exacc-admin';
    local tag_exacc_db = 'lz-exacc-db-admin';
    local tag_exacc_infra = 'lz-exacc-infra-admin';
    local domain_display = 'id_lz_common';
    local domain_grp(grp_name) = "'%s'/'%s'" % [domain_display, grp_name];
    local exacc_tag_allow(grp_name, verb, resource, tag_value) =
      "allow group %s to %s %s in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [
        domain_grp(grp_name),
        verb,
        resource,
        tag_key,
        tag_value,
      ];

    local platform_key = scope.compartment_key;
    local platform_name = scope.compartment_name;
    local db_key = n.key_global('CMP', [scope.scope_name, scope.platform_name, 'DB']);
    local infra_key = n.key_global('CMP', [scope.scope_name, scope.platform_name, 'INFRA']);
    local platform_children = {
      [db_key]: {
        name: '%s-db' % platform_name,
        description: descriptions.platform_child_compartment(scope, 'Database'),
        defined_tags: { [tag_key]: tag_exacc_db },
      },
      [infra_key]: {
        name: '%s-infra' % platform_name,
        description: descriptions.platform_child_compartment(scope, 'Infrastructure'),
        defined_tags: { [tag_key]: tag_exacc_infra },
      },
    };
    local platform_overlay =
      if scope.scope_type == 'shared' then {
        'CMP-LANDINGZONE-KEY'+: {
          children+: {
            [n.key_global('CMP', ['PLATFORM'])]+: {
              children+: {
                [platform_key]+: {
                  description: descriptions.platform_compartment(scope),
                  defined_tags+: { [tag_key]: tag_exacc },
                  children+: platform_children,
                },
              },
            },
          },
        },
      } else {
        'CMP-LANDINGZONE-KEY'+: {
          children+: {
            [n.key_global('CMP', [scope.scope_name])]+: {
              children+: {
                [n.key_global('CMP', [scope.scope_name, 'PLATFORM'])]+: {
                  children+: {
                    [platform_key]+: {
                      description: descriptions.platform_compartment(scope),
                      defined_tags+: { [tag_key]: tag_exacc },
                      children+: platform_children,
                    },
                  },
                },
              },
            },
          },
        },
      };

    local project_db_key(project_name) = n.key_global('CMP', [scope.scope_name, project_name, 'DB']);
    local project_db_name(project_name) =
      'cmp-lz-%s-%s-db' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)];
    local project_db_overlay =
      if scope.scope_type == 'environment' && std.length(project_db_compartments) > 0 then {
        'CMP-LANDINGZONE-KEY'+: {
          children+: {
            [n.key_global('CMP', [scope.scope_name])]+: {
              children+: {
                [n.key_global('CMP', [scope.scope_name, 'PROJECTS'])]+: {
                  children+: {
                    [n.key_global('CMP', [scope.scope_name, project_name])]+: {
                      children+: {
                        [project_db_key(project_name)]: {
                          name: project_db_name(project_name),
                          description: descriptions.project_db_compartment(scope, project_name),
                          defined_tags: { [tag_key]: tag_exacc_db },
                        },
                      },
                    }
                    for project_name in project_db_compartments
                  },
                },
              },
            },
          },
        },
      } else {};

    local global_groups = {
      [n.key_global('GRP', ['GLOBAL', 'DB', 'ADMIN'])]: {
        name: 'grp-lz-global-exacc-db-admin',
        description: descriptions.global_db_group,
      },
      [n.key_global('GRP', ['GLOBAL', 'INFRA', 'ADMIN'])]: {
        name: 'grp-lz-global-exacc-infra-admin',
        description: descriptions.global_infra_group,
      },
    };
    local project_groups = {
      [n.key_global('GRP', [scope.scope_name, 'EXACC', project_name, 'ADMIN'])]: {
        name: 'grp-lz-%s-%s-exacc-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)],
        description: descriptions.project_group(scope, project_name),
      }
      for project_name in project_db_compartments
    };

    local global_infra_policy = {
      [n.key_global('PCY', ['GLOBAL', 'EXACC', 'INFRA', 'ADMIN'])]: {
        name: 'pcy-lz-global-exacc-infra-admin',
        description: descriptions.global_infra_policy,
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = 'grp-lz-global-exacc-infra-admin',
        statements: [
          exacc_tag_allow(grp, 'manage', 'exadata-infrastructures', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'scheduling-policies', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'scheduling-windows', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'execution-windows', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'orm-stacks', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'orm-jobs', tag_exacc_infra),
          exacc_tag_allow(grp, 'manage', 'orm-config-source-providers', tag_exacc_infra),
          "allow group %s to manage vmclusters in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.permission !='VM_CLUSTER_UPDATE_GI_SOFTWARE', request.permission !='VM_CLUSTER_UPDATE_EXADATA_STORAGE'}" % [domain_grp(grp), tag_key, tag_exacc_db],
          exacc_tag_allow(grp, 'use', 'dbServers', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'dbnode-console-connection', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'dbnode-console-history', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-vmclusters', tag_exacc_db),
          exacc_tag_allow(grp, 'use', 'subnets', 'lz-network-admin'),
          exacc_tag_allow(grp, 'use', 'vnics', 'lz-network-admin'),
          exacc_tag_allow(grp, 'use', 'dns', 'lz-network-admin'),
          exacc_tag_allow(grp, 'manage', 'db-nodes', tag_exacc_db),
        ],
      },
    };
    local global_db_policy = {
      [n.key_global('PCY', ['GLOBAL', 'EXACC', 'DB', 'ADMIN'])]: {
        name: 'pcy-lz-global-exacc-db-admin',
        description: descriptions.global_db_policy,
        compartment_id: 'CMP-LANDINGZONE-KEY',
        local grp = 'grp-lz-global-exacc-db-admin',
        statements: [
          exacc_tag_allow(grp, 'manage', 'orm-stacks', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'orm-jobs', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'data-safe-family', tag_exacc_db),
          "allow group %s to use exadata-infrastructures in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.operation !='ValidateVmClusterNetwork', request.operation !='ActivateExadataInfrastructure', request.operation !='ChangeExadataInfrastructureCompartment', request.operation !='AddStorageCapacityExadataInfrastructure', request.operation !='CreateVmClusterNetwork', request.operation !='UpdateVmClusterNetwork', request.operation !='DeleteVmClusterNetwork'}" % [domain_grp(grp), tag_key, tag_exacc_db],
          "allow group %s to use vmclusters in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.%s, ('%s')), request.permission !='VM_CLUSTER_UPDATE_SSH_KEY', request.permission !='VM_CLUSTER_UPDATE_CPU', request.permission !='VM_CLUSTER_UPDATE_MEMORY', request.permission !='VM_CLUSTER_UPDATE_LOCAL_STORAGE', request.permission !='VM_CLUSTER_UPDATE_FILE_SYSTEM'}" % [domain_grp(grp), tag_key, tag_exacc_db],
          exacc_tag_allow(grp, 'manage', 'backups', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'database-software-image', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'db-homes', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'databases', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'pluggable-databases', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-databases', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-backups', tag_exacc_db),
          exacc_tag_allow(grp, 'manage', 'autonomous-container-databases', tag_exacc_db),
          exacc_tag_allow(grp, 'read', 'virtual-network-family', 'lz-network-admin'),
        ],
      },
    };
    local global_generic_policy = {
      [n.key_global('PCY', ['GLOBAL', 'EXACC', 'GENERIC', 'ADMIN'])]: {
        name: 'pcy-lz-global-exacc-generic',
        description: descriptions.global_generic_policy,
        compartment_id: 'TENANCY-ROOT',
        local groups = '%s,%s' % [
          domain_grp('grp-lz-global-exacc-infra-admin'),
          domain_grp('grp-lz-global-exacc-db-admin'),
        ],
        statements: [
          'allow group %s to use cloud-shell in tenancy' % groups,
          'allow group %s to read compartments in tenancy' % groups,
          "allow group %s to read all-resources in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage alarms in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage metrics in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to read audit-events in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to read work-requests in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage cloudevents-rules in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
          "allow group %s to manage ons-family in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.%s, ('%s'))" % [groups, tag_key, tag_exacc],
        ],
      },
    };
    local project_policies = {
      [n.key_global('PCY', [scope.scope_name, 'EXACC', project_name, 'ADMIN'])]: {
        name: 'pcy-lz-%s-exacc-%s-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)],
        description: descriptions.project_policy(scope, project_name),
        compartment_id: project_db_key(project_name),
        local grp_name = 'grp-lz-%s-%s-exacc-admin' % [std.asciiLower(scope.scope_name), std.asciiLower(project_name)],
        local cmp_name = project_db_name(project_name),
        statements: [
          'allow group %s to read all-resources in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage alarms in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage metrics in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to read audit-events in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to read work-requests in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage cloudevents-rules in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage ons-family in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage autonomous-databases in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage autonomous-backups in compartment %s' % [domain_grp(grp_name), cmp_name],
          'allow group %s to manage autonomous-container-databases in compartment %s' % [domain_grp(grp_name), cmp_name],
        ],
      }
      for project_name in project_db_compartments
    };

    local shared_infra_topic_key = n.key_global('NOTT', ['EXACC', 'SHARED', 'INFRA', 'WORKLOADS']);
    local db_topic_key = n.key_global('NOTT', ['EXACC', 'DB', 'WORKLOADS']);
    local env_topic_key = n.key_global('NOTT', [scope.scope_name, 'EXACC', 'PROJECTS']);
    local subscriptions(topic_key) = [{ protocol: 'EMAIL', values: topic_emails(topic_key) }];

    local topics =
      if scope.scope_type == 'shared' then {
        [db_topic_key]: {
          name: n.display_global('nott', ['exacc', 'db', 'workloads']),
          description: descriptions.shared_db_topic,
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('db_workloads'),
        },
        [shared_infra_topic_key]: {
          name: n.display_global('nott', ['exacc', 'infra', 'workloads']),
          description: descriptions.shared_infra_topic,
          compartment_id: n.key_global('CMP', ['SECURITY']),
          subscriptions: subscriptions('infra_workloads'),
        },
      } else {
        [env_topic_key]: {
          name: n.display_global('nott', [scope.scope_name, 'exacc', 'projects']),
          description: descriptions.project_topic(scope),
          compartment_id: n.key_global('CMP', [scope.scope_name, 'SECURITY']),
          subscriptions: subscriptions('projects'),
        },
      };

    local db_events = [
      'com.oraclecloud.databaseservice.deletebackupdestination',
      'com.oraclecloud.databaseservice.updatebackupdestination',
      'com.oraclecloud.databaseservice.dbnodeaction.begin',
      'com.oraclecloud.databaseservice.dbnodeaction.end',
      'com.oraclecloud.databaseservice.deletedbhome.begin',
      'com.oraclecloud.databaseservice.deletedbhome.end',
      'com.oraclecloud.databaseservice.updatedbhome.begin',
      'com.oraclecloud.databaseservice.updatedbhome.end',
      'com.oraclecloud.databaseservice.deletebackup.begin',
      'com.oraclecloud.databaseservice.deletebackup.end',
      'com.oraclecloud.databaseservice.restoredatabase.begin',
      'com.oraclecloud.databaseservice.restoredatabase.end',
      'com.oraclecloud.databaseservice.deletedatabase.begin',
      'com.oraclecloud.databaseservice.deletedatabase.end',
      'com.oraclecloud.databaseservice.updatedatabase.begin',
      'com.oraclecloud.databaseservice.updatedatabase.end',
      'com.oraclecloud.databaseservice.patchdbhome.begin',
      'com.oraclecloud.databaseservice.patchdbhome.end',
      'com.oraclecloud.databaseservice.movedatabase.end',
      'com.oraclecloud.databaseservice.changeautonomouscontainerdatabasecompartment',
      'com.oraclecloud.databaseservice.autonomous.container.database.maintenance.begin',
      'com.oraclecloud.databaseservice.autonomous.container.database.maintenance.end',
      'com.oraclecloud.databaseservice.autonomous.container.database.maintenance.reminder',
      'com.oraclecloud.databaseservice.autonomous.container.database.maintenance.scheduled',
      'com.oraclecloud.databaseservice.restartautonomouscontainerdatabase.begin',
      'com.oraclecloud.databaseservice.restartautonomouscontainerdatabase.end',
      'com.oraclecloud.databaseservice.autonomous.container.database.restore.begin',
      'com.oraclecloud.databaseservice.autonomous.container.database.restore.end',
      'com.oraclecloud.databaseservice.terminateautonomouscontainerdatabase.begin',
      'com.oraclecloud.databaseservice.terminateautonomouscontainerdatabase.end',
      'com.oraclecloud.databaseservice.autonomous.container.database.instance.update.begin',
      'com.oraclecloud.databaseservice.changeautonomousdatabasecompartment.begin',
      'com.oraclecloud.databaseservice.changeautonomousdatabasecompartment.end',
      'com.oraclecloud.databaseservice.autonomous.database.restore.begin',
      'com.oraclecloud.databaseservice.autonomous.database.restore.end',
      'com.oraclecloud.databaseservice.deleteautonomousdatabase.begin',
      'com.oraclecloud.databaseservice.deleteautonomousdatabase.end',
      'com.oraclecloud.databaseservice.updateautonomousdatabase.begin',
      'com.oraclecloud.databaseservice.updateautonomousdatabase.end',
      'com.oraclecloud.databaseservice.switchoverdataguardassociation.begin',
      'com.oraclecloud.databaseservice.switchoverdataguardassociation.end',
      'com.oraclecloud.databaseservice.failoverdataguardassociation.begin',
      'com.oraclecloud.databaseservice.failoverdataguardassociation.end',
      'com.oraclecloud.databaseservice.reinstatedataguardassociation.begin',
      'com.oraclecloud.databaseservice.reinstatedataguardassociation.end',
      'com.oraclecloud.DatabaseService.SwitchoverAutonomousDataguardAssociation.begin',
      'com.oraclecloud.DatabaseService.SwitchoverAutonomousDataguardAssociation.end',
      'com.oraclecloud.DatabaseService.FailoverAutonomousDataguardAssociation.begin',
      'com.oraclecloud.DatabaseService.FailoverAutonomousDataguardAssociation.end',
      'com.oraclecloud.DatabaseService.ReinstateAutonomousDataGuardAssociation.begin',
      'com.oraclecloud.DatabaseService.ReinstateAutonomousDataGuardAssociation.end',
      'com.oraclecloud.databaseservice.dbnode.critical',
      'com.oraclecloud.databaseservice.dbnode.information',
      'com.oraclecloud.databaseservice.database.critical',
      'com.oraclecloud.databaseservice.database.information',
      'com.oraclecloud.databaseservice.dbsystem.critical',
      'com.oraclecloud.databaseservice.dbsystem.information',
    ];
    local infra_events = [
      'com.oraclecloud.databaseservice.changeexadatainfrastructurecompartment',
      'com.oraclecloud.databaseservice.deleteexadatainfrastructure.begin',
      'com.oraclecloud.databaseservice.deleteexadatainfrastructure.end',
      'com.oraclecloud.databaseservice.updateexadatainfrastructure.begin',
      'com.oraclecloud.databaseservice.updateexadatainfrastructure.end',
      'com.oraclecloud.databaseservice.exadatainfrastructureconnectstatus',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancereminder',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenance.begin',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenance.end',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancecustomactiontime.begin',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancecustomactiontime.end',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancenetworkswitches.begin',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancenetworkswitches.end',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancestorageservers.start',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancestorageservers.end',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancedbservers.start',
      'com.oraclecloud.databaseservice.exaccinfrastructuremaintenancedbservers.end',
    ];
    local vmc_events = [
      'com.oraclecloud.databaseservice.deletevmclusternetwork.begin',
      'com.oraclecloud.databaseservice.deletevmclusternetwork.end',
      'com.oraclecloud.databaseservice.changevmclustercompartment',
      'com.oraclecloud.databaseservice.deletevmcluster.begin',
      'com.oraclecloud.databaseservice.deletevmcluster.end',
      'com.oraclecloud.databaseservice.updatevmcluster.begin',
      'com.oraclecloud.databaseservice.updatevmcluster.end',
      'com.oraclecloud.databaseservice.patchvmcluster.begin',
      'com.oraclecloud.databaseservice.patchvmcluster.end',
      'com.oraclecloud.databaseservice.changeautonomousvmclustercompartment',
      'com.oraclecloud.databaseservice.deleteautonomousvmcluster.begin',
      'com.oraclecloud.databaseservice.deleteautonomousvmcluster.end',
      'com.oraclecloud.databaseservice.updateautonomousvmcluster.begin',
      'com.oraclecloud.databaseservice.updateautonomousvmcluster.end',
    ];
    local operator_events = [
      'com.oraclecloud.operatorcontrol.UpdateOperatorControl',
      'com.oraclecloud.operatorcontrol.DeleteOperatorControl',
      'com.oraclecloud.operatorcontrol.UpdateOperatorControlAssignment',
      'com.oraclecloud.operatorcontrol.DeleteOperatorControlAssignment',
      'com.oraclecloud.operatorcontrol.ApproveAccessRequest',
      'com.oraclecloud.operatorcontrol.AutoApproveAccessRequest',
      'com.oraclecloud.operatorcontrol.CreateAccessRequest',
      'com.oraclecloud.operatoraccesscontrol.AddSharedOperator',
      'com.oraclecloud.operatorcontrol.RejectAccessRequest',
      'com.oraclecloud.operatorcontrol.RevokeAccessRequest',
      'com.oraclecloud.operatorcontrol.ExpiredAccessRequest',
      'com.oraclecloud.operatorcontrol.ClosedAccessRequest',
      'com.oraclecloud.operatorcontrol.ExtendAccessRequest',
      'com.oraclecloud.operatorcontrol.OperatorLogin',
      'com.oraclecloud.operatorcontrol.OperatorLogout',
    ];
    local event_rules =
      if scope.scope_type == 'shared' then {
        [n.key_global('RUL', ['NOTIFICATION', 'OPERATOR', 'ACCESS', 'CONTROL'])]: {
          compartment_id: n.key_global('CMP', ['SECURITY']),
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-opctl-events']),
          supplied_events: operator_events,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', 'EXACC', 'DB'])]: {
          compartment_id: db_key,
          destination_topic_ids: [db_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-exacc-db-events']),
          supplied_events: db_events,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', 'EXACC', 'INFRA'])]: {
          compartment_id: infra_key,
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-exacc-infra-events']),
          supplied_events: infra_events,
        },
        [n.key_global('RUL', ['NOTIFICATION', 'PLATFORM', 'EXACC', 'VMC'])]: {
          compartment_id: db_key,
          destination_topic_ids: [shared_infra_topic_key],
          event_display_name: n.display_global('rul', ['notify-on-exacc-vmc-events']),
          supplied_events: vmc_events,
        },
      } else {
        [if std.length(project_db_compartments) == 1 then
          n.key_global('RUL', [scope.scope_name, 'NOTIFICATION', 'PROJECTS'])
        else
          n.key_global('RUL', [scope.scope_name, 'NOTIFICATION', 'PROJECTS', project_name])]: {
          compartment_id: project_db_key(project_name),
          destination_topic_ids: [env_topic_key],
          event_display_name:
            if std.length(project_db_compartments) == 1 then
              n.display_global('rul', [scope.scope_name, 'notify-on-notifications-projects'])
            else
              n.display_global('rul', [scope.scope_name, 'notify-on-notifications-projects', project_name]),
          supplied_events: db_events,
        }
        for project_name in project_db_compartments
      };

    local alarm(key_segments, display_segments, topic_key, namespace, query, severity='CRITICAL') = {
      [n.key_global('AL', key_segments)]: {
        display_name: n.display_global('al', display_segments),
        compartment_id: db_key,
        destination_topic_ids: [topic_key],
        is_enabled: 'false',
        supplied_alarm: {
          message_format: 'PRETTY_JSON',
          namespace: namespace,
          pending_duration: 'PT5M',
          query: query,
          severity: severity,
        },
      },
    };
    local alarms =
      if scope.scope_type == 'shared' then
        alarm(['CPUUTIL'], ['db', 'cpuutil'], db_topic_key, 'oci_database', 'CpuUtilization[1m].mean() >= 90') +
        alarm(['STORAGEUTIL'], ['db', 'storageutil'], db_topic_key, 'oci_database', 'StorageUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'CPUUTIL'], ['vmc', 'cpuutil'], shared_infra_topic_key, 'oci_database_cluster', 'CpuUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'DISKUTIL'], ['vmc', 'dgutil'], shared_infra_topic_key, 'oci_database_cluster', 'ASMDiskgroupUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'FSUTIL'], ['vmc', 'fsutil'], db_topic_key, 'oci_database_cluster', 'FilesystemUtilization[1m].mean() >= 90') +
        alarm(['DB', 'CLUSTER', 'MEMUTIL'], ['vmc', 'memutil'], shared_infra_topic_key, 'oci_database_cluster', 'MemoryUtilization[1m].mean() >= 80') +
        alarm(['DB', 'CLUSTER', 'SWAPUTIL'], ['vmc', 'swaputil'], shared_infra_topic_key, 'oci_database_cluster', 'SwapUtilization[1m].mean() >= 75')
      else {};

    {
      contributions: {
        iam: {
          compartments_configuration+: {
            compartments+: platform_overlay + project_db_overlay,
          },
          identity_domain_groups_configuration+: {
            groups+: global_groups + project_groups,
          },
          policies_configuration+: {
            supplied_policies+: global_infra_policy + global_db_policy + global_generic_policy + project_policies,
          },
        },
        observability_cis1: {
          alarms_configuration+: { alarms+: alarms },
          events_configuration+: { event_rules+: event_rules },
          notifications_configuration+: { topics+: topics },
        },
        observability_cis2: {
          alarms_configuration+: { alarms+: alarms },
          events_configuration+: { event_rules+: event_rules },
          notifications_configuration+: { topics+: topics },
        },
      },
    },
}
