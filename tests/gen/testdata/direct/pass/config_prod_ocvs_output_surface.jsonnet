// config-mode prod OCVS emits IAM, network, and OCVS workload output with matching logical keys
local multi = import 'gen/landing_zone_multi.jsonnet';
local outputs = multi({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        ocvs: {
          network: { vcn: '10.0.80.0/21' },
          extension: {
            type: 'ocvs_simple',
            params: {
              ssh_authorized_keys: 'ssh-rsa AAAAocvsfixture',
              cluster: {
                service_label: 'prod-ocvs',
                sddc_display_name: 'prod-ocvs',
                cluster_display_name: 'prod-ocvs-cluster',
                vmware_software_version: '7.0 update 3',
                is_hcx_enabled: false,
                compute_availability_domain: '1',
                esxi_hosts_count: 3,
                vsphere_type: 'MANAGEMENT',
                initial_host_ocpu_count: 52,
                initial_host_shape_name: 'BM.DenseIO2.52',
                workload_network_cidr: '172.16.0.0/24',
              },
            },
          },
        },
      },
    },
  },
});

local network_category =
  outputs['network.json'].network_configuration.network_configuration_categories['prod-platform-ocvs'];
local vcn = network_category.vcns['VCN-FRA-LZ-PROD-PLATFORM-OCVS-KEY'];
local iam = outputs['iam.json'];
local ocvs_cluster =
  outputs['ocvs.json'].ocvs_configuration.ocvs_clusters['SDDC-FRA-LZ-PROD-OCVS-KEY'];
{
  output_files: std.sort(std.objectFields(outputs)),
  ocvs_default_compartment_id: outputs['ocvs.json'].ocvs_configuration.default_compartment_id,
  ocvs_vcn_id: ocvs_cluster.networking.vcn_id,
  ocvs_vcn_cidr_block: ocvs_cluster.networking.vcn_cidr_block,
  provisioning_subnet_key: ocvs_cluster.networking.subnet_id,
  provisioning_subnet_cidr: vcn.subnets[ocvs_cluster.networking.subnet_id].cidr_block,
  ocvs_nsg_keys: ocvs_cluster.networking.nsgs,
  ocvs_route_table_keys: ocvs_cluster.networking.route_tables,
  route_table_keys_present: std.sort(std.objectFields(vcn.route_tables)),
  nsg_keys_present: std.sort(std.objectFields(vcn.network_security_groups)),
  sddc_display_name: ocvs_cluster.sddc_display_name,
  workload_network_cidr: ocvs_cluster.workload_network_cidr,
  ocvs_admin_group_present:
    std.objectHas(iam.groups_configuration.groups, 'GRP-LZ-PROD-PLATFORM-OCVS-ADMINS-KEY'),
  platform_compartment_present:
    std.objectHas(
      iam.compartments_configuration.compartments['CMP-LANDINGZONE-KEY'].children['CMP-LZ-PROD-KEY'].children['CMP-LZ-PROD-PLATFORM-KEY'].children,
      'CMP-LZ-PROD-OCVS-KEY'
    ),
}
