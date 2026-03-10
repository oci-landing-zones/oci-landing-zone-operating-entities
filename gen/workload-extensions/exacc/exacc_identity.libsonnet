{


  identity_domain_groups_configuration+: {
        default_identity_domain_id   : "COMMON-DOMAIN",

        groups+: {
           "GRP-LZ-GLOBAL-INFRA-ADMIN-KEY": { 
            name: 'grp-lz-exacc-infra-admin',
            description: 'Global Infra Team admin group',
            },

            "GRP-LZ-GLOBAL-DB-ADMIN-KEY": { 
              name: 'grp-lz-exacc-db-admin',
              description: 'Global DBA team admin group',
            },

            "GRP-LZ-PROD-EXACC-PROJ1-ADMIN-KEY": { 
              name: 'grp-lz-prod-proj1-exacc-admin',
              description: 'Dedicated team to manage exacc db layer in proj1, prod environment',
            },

             "GRP-LZ-PREPROD-EXACC-PROJ1-ADMIN-KEY": { 
              name: 'grp-lz-preprod-proj1-exacc-admin',
              description: 'Dedicated team to manage exacc db layer in proj1, prod environment',
            },
        }
  },

  policies_configuration+: {
    supplied_policies+: {

      "PCY-LZ-PLATFORM-EXACS-GENERIC-ADMIN-KEY": {
        name: 'pcy-lz-exacc-generic',
        description: 'Policy which allows the groups grp-lz-exacc-infra-admin and grp-lz-exacc-db-admin to have shared privilegies in all exacc compartments',
        compartment_id: 'TENANCY-ROOT',
        statements: [
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to use cloud-shell in tenancy",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to read compartments in tenancy",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to read all-resources in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to manage alarms in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to manage metrics in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to read audit-events in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to read work-requests in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to manage cloudevents-rules in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin','id_lz_common'/'grp-lz-exacc-db-admin' to manage ons-family in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-admin'))",
        ],
      },

      "PCY-LZ-PLATFORM-EXACS-DB-ADMIN-KEY": {
        name: 'pcy-lz-exacc-db-admin',
        description: 'Policy which allows the groups grp-lz-exacc-infra-admin and grp-lz-exacc-db-admin to have shared privilegies in all exacc compartments',
        compartment_id: 'CMP-LANDINGZONE-KEY',
        statements: [
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage orm-stacks in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage orm-jobs in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage data-safe-family in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to use exadata-infrastructures in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin')), request.operation !='ValidateVmClusterNetwork',request.operation !='ActivateExadataInfrastructure',request.operation !='ChangeExadataInfrastructureCompartment',request.operation !='AddStorageCapacityExadataInfrastructure',request.operation !='CreateVmClusterNetwork',request.operation !='CreateVmClusterNetwork',request.operation !='UpdateVmClusterNetwork',request.operation !='DeleteVmClusterNetwork'}",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to use vmclusters in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin')), request.permission !='VM_CLUSTER_UPDATE_SSH_KEY', request.permission !='VM_CLUSTER_UPDATE_CPU',request.permission !='VM_CLUSTER_UPDATE_MEMORY',request.permission !='VM_CLUSTER_UPDATE_LOCAL_STORAGE',request.permission !='VM_CLUSTER_UPDATE_FILE_SYSTEM'}",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage backups in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage database-software-image in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage db-homes in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage databases in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage pluggable-databases in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage autonomous-databases in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage autonomous-backups in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to manage autonomous-container-databases in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-db-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-db-admin' to read virtual-network-family in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-network-admin'))",
        ],
      },

      "PCY-LZ-PLATFORM-EXACC-INFRA-ADMIN-KEY": {
       name: "pcy-lz-exacc-infra-admin",
       description: "Example policy which allows the grp-lz-exacc-infra-admin group users to manage the DB infra in sharead exacc platform compartment.",
       compartment_id: "CMP-LANDINGZONE-KEY",
       statements: [
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage exadata-infrastructures in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage scheduling-policies in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage scheduling-windows in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage execution-windows in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage orm-stacks in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage orm-jobs in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage orm-config-source-providers in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage vmclusters in compartment cmp-landingzone where all{sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin')), request.permission !='VM_CLUSTER_UPDATE_GI_SOFTWARE', request.permission !='VM_CLUSTER_UPDATE_EXADATA_STORAGE'}",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to use dbServers in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage dbnode-console-connection in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage dbnode-console-history in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage autonomous-vmclusters in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to use subnets in compartment cmp-landingzone  where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-network-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to use vnics in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-network-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to use dns in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-network-admin'))",
          "allow group 'id_lz_common'/'grp-lz-exacc-infra-admin' to manage db-nodes in compartment cmp-landingzone where sets-intersect(target.resource.compartment.tag.tagns-lz-role.tag-lz-role, ('lz-exacc-infra-admin'))"
          ]
      },

      "PCY-LZ-PROD-EXACC-PROJECTS-PROJ1-ADMIN-KEY": {
       name: "pcy-lz-prod-exacc-proj1-admin",
       description: "Example policy which allows the grp-lz-prod-proj1-exacc-admin group users to manage the autonomous database layer in proj1.",
       compartment_id: "CMP-LZ-PROD-PROJ1-DB-KEY",
       statements: [
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to read all-resources in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage alarms in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage metrics in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to read audit-events in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to read work-requests in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage cloudevents-rules in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage ons-family in compartment cmp-lz-prod-proj1-db",          
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage autonomous-databases in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage autonomous-backups in compartment cmp-lz-prod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-prod-proj1-exacc-admin' to manage autonomous-container-databases in compartment cmp-lz-prod-proj1-db"
          ]
      },

      "PCY-LZ-PREPROD-EXACC-PROJECTS-PROJ1-ADMIN-KEY": {
       name: "pcy-lz-preprod-exacc-proj1-admin",
       description: "Example policy which allows the grp-lz-preprod-proj1-exacc-admin group users to manage the autonomous database layer in proj1.",
       compartment_id: "CMP-LZ-PREPROD-PROJ1-DB-KEY",
       statements: [
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to read all-resources in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage alarms in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage metrics in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to read audit-events in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to read work-requests in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage cloudevents-rules in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage ons-family in compartment cmp-lz-preprod-proj1-db",          
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage autonomous-databases in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage autonomous-backups in compartment cmp-lz-preprod-proj1-db",
          "allow group 'id_lz_common'/'grp-lz-preprod-proj1-exacc-admin' to manage autonomous-container-databases in compartment cmp-lz-preprod-proj1-db"
          ]
      },
    },
  },
}
