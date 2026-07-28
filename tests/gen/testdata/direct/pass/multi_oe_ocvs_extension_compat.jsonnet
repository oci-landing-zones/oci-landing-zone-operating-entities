// Multi-OE OCVS qualifies identical prod/ocvs clusters and every generated network dependency.
// contains: "alpha_cluster": "SDDC-FRA-LZ-ALPHA-PROD-OCVS-KEY"
// contains: "beta_cluster": "SDDC-FRA-LZ-BETA-PROD-OCVS-KEY"
// contains: "alpha_vcn_dns": "vcnfralzalpov"
// contains: "beta_vcn_dns": "vcnfralzbepov"
local landing_zone = import 'gen/landing_zone.libsonnet';

local ocvs_platform(
  vcn,
  service_label,
  sddc_display_name,
  cluster_display_name,
  workload_network_cidr
) = {
  network: { vcn: vcn },
  extension: {
    type: 'ocvs',
    params: {
      ssh_authorized_keys: 'ssh-rsa AAAAmultioeocvs',
      cluster: {
        service_label: service_label,
        sddc_display_name: sddc_display_name,
        cluster_display_name: cluster_display_name,
        vmware_software_version: '7.0 update 3',
        is_hcx_enabled: false,
        compute_availability_domain: '1',
        esxi_hosts_count: 3,
        vsphere_type: 'MANAGEMENT',
        initial_host_ocpu_count: 52,
        initial_host_shape_name: 'BM.DenseIO2.52',
        workload_network_cidr: workload_network_cidr,
      },
    },
  },
};

local result = landing_zone({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  operating_entities: {
    alpha: {
      display_name: 'Alpha',
      dns: 'al',
      environments: {
        prod: {
          platforms: {
            ocvs: ocvs_platform(
              '10.2.24.0/21',
              'alpha-ocvs',
              'sddc-al-p',
              'cluster-al-p',
              '172.16.0.0/24'
            ),
          },
        },
      },
    },
    beta: {
      display_name: 'Beta',
      dns: 'be',
      environments: {
        prod: {
          platforms: {
            ocvs: ocvs_platform(
              '10.3.24.0/21',
              'beta-ocvs',
              'sddc-be-p',
              'cluster-be-p',
              '172.16.1.0/24'
            ),
          },
        },
      },
    },
  },
});

local categories = result.network.network_configuration.network_configuration_categories;
local alpha_vcn_key = 'VCN-FRA-LZ-ALPHA-PROD-PLATFORM-OCVS-KEY';
local beta_vcn_key = 'VCN-FRA-LZ-BETA-PROD-PLATFORM-OCVS-KEY';
local alpha_vcn = categories['alpha-prod-platform-ocvs'].vcns[alpha_vcn_key];
local beta_vcn = categories['beta-prod-platform-ocvs'].vcns[beta_vcn_key];
local clusters = result.extra.ocvs.ocvs_configuration.ocvs_clusters;
local alpha_cluster_key = 'SDDC-FRA-LZ-ALPHA-PROD-OCVS-KEY';
local beta_cluster_key = 'SDDC-FRA-LZ-BETA-PROD-OCVS-KEY';
local groups = result.iam.groups_configuration.groups;
local policies = result.iam.policies_configuration.supplied_policies;

local assert_cluster_dependencies(cluster, vcn) =
  local networking = cluster.networking;
  assert networking.vcn_id == vcn;
  assert std.objectHas(
    categories[
      if vcn == alpha_vcn_key then 'alpha-prod-platform-ocvs'
      else 'beta-prod-platform-ocvs'
    ].vcns[vcn].subnets,
    networking.subnet_id
  );
  assert std.length([
    key
    for key in std.objectFields(networking.nsgs)
    if !std.objectHas(
      categories[
        if vcn == alpha_vcn_key then 'alpha-prod-platform-ocvs'
        else 'beta-prod-platform-ocvs'
      ].vcns[vcn].network_security_groups,
      networking.nsgs[key]
    )
  ]) == 0;
  assert std.length([
    key
    for key in std.objectFields(networking.route_tables)
    if !std.objectHas(
      categories[
        if vcn == alpha_vcn_key then 'alpha-prod-platform-ocvs'
        else 'beta-prod-platform-ocvs'
      ].vcns[vcn].route_tables,
      networking.route_tables[key]
    )
  ]) == 0;
  true;

assert std.length(std.objectFields(clusters)) == 2;
assert std.objectHas(clusters, alpha_cluster_key);
assert std.objectHas(clusters, beta_cluster_key);
assert clusters[alpha_cluster_key].compartment_id == 'CMP-LZ-ALPHA-PROD-OCVS-KEY';
assert clusters[beta_cluster_key].compartment_id == 'CMP-LZ-BETA-PROD-OCVS-KEY';
assert clusters[alpha_cluster_key].ssh_authorized_keys == 'ssh-rsa AAAAmultioeocvs';
assert clusters[beta_cluster_key].ssh_authorized_keys == 'ssh-rsa AAAAmultioeocvs';
assert assert_cluster_dependencies(clusters[alpha_cluster_key], alpha_vcn_key);
assert assert_cluster_dependencies(clusters[beta_cluster_key], beta_vcn_key);
assert std.objectHas(groups, 'GRP-LZ-ALPHA-PROD-PLATFORM-OCVS-ADMINS-KEY');
assert std.objectHas(groups, 'GRP-LZ-BETA-PROD-PLATFORM-OCVS-ADMINS-KEY');
assert std.objectHas(policies, 'PCY-LZ-ALPHA-PROD-PLATFORM-OCVS-ADMINS-KEY');
assert std.objectHas(policies, 'PCY-LZ-BETA-PROD-PLATFORM-OCVS-ADMINS-KEY');
assert alpha_vcn.dns_label != beta_vcn.dns_label;

{
  alpha_cluster: alpha_cluster_key,
  beta_cluster: beta_cluster_key,
  alpha_sddc_name: clusters[alpha_cluster_key].sddc_display_name,
  beta_sddc_name: clusters[beta_cluster_key].sddc_display_name,
  alpha_vcn_dns: alpha_vcn.dns_label,
  beta_vcn_dns: beta_vcn.dns_label,
}
