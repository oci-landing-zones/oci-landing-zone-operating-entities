// Multi-OE contract fixture: identical extension platform names under two operating entities.
local notification_emails(product) = {
  default: ['%s-platform@example.com' % product],
  db_workloads: ['%s-db@example.com' % product],
  infra_workloads: ['%s-infra@example.com' % product],
  projects: ['%s-projects@example.com' % product],
};

local environment(
  spoke_cidr,
  oke_cidr,
  services_cidr,
  exacs_cidr,
  ocvs_cidr,
  ocvs_service_label,
  ocvs_sddc_name,
  ocvs_cluster_name,
  ocvs_workload_cidr
) = {
  shared_project_network: {
    network: { vcn: spoke_cidr },
  },
  projects: { proj1: {} },
  platforms: {
    oke: {
      network: { vcn: oke_cidr },
      extension: {
        type: 'oke_simple',
        params: {
          kubernetes_version: 'v1.35.2',
          services_cidr: services_cidr,
          api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
        },
      },
    },
    exacc: {
      extension: {
        type: 'exacc',
        params: {
          project_db_compartments: ['proj1'],
          notification_emails: notification_emails('exacc'),
        },
      },
    },
    exacs: {
      network: { vcn: exacs_cidr },
      extension: {
        type: 'exacs',
        params: {
          project_db_compartments: ['proj1'],
          notification_emails: notification_emails('exacs'),
        },
      },
    },
    ocvs: {
      network: { vcn: ocvs_cidr },
      extension: {
        type: 'ocvs',
        params: {
          ssh_authorized_keys: 'ssh-rsa AAAAmultioecontract',
          cluster: {
            service_label: ocvs_service_label,
            sddc_display_name: ocvs_sddc_name,
            cluster_display_name: ocvs_cluster_name,
            vmware_software_version: '7.0 update 3',
            is_hcx_enabled: false,
            compute_availability_domain: '1',
            esxi_hosts_count: 3,
            vsphere_type: 'MANAGEMENT',
            initial_host_ocpu_count: 52,
            initial_host_shape_name: 'BM.DenseIO2.52',
            workload_network_cidr: ocvs_workload_cidr,
          },
        },
      },
    },
  },
};

{
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  cis_level: 2,
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  security_targets: ['alpha-prod', 'beta-prod'],
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: environment(
          '10.0.64.0/21',
          '10.2.0.0/20',
          '10.96.0.0/16',
          '10.2.16.0/21',
          '10.2.24.0/21',
          'alpha-ocvs',
          'sddc-al-p',
          'cluster-al-p',
          '172.16.0.0/24'
        ),
      },
    },
    beta: {
      display_name: 'Beta',
      dns: 'be',
      environments: {
        prod: environment(
          '10.1.64.0/21',
          '10.3.0.0/20',
          '10.97.0.0/16',
          '10.3.16.0/21',
          '10.3.24.0/21',
          'beta-ocvs',
          'sddc-be-p',
          'cluster-be-p',
          '172.16.1.0/24'
        ),
      },
    },
  },
}
