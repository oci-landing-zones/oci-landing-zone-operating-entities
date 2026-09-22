local cidrs = import '../../lib/cidrs.libsonnet';

local letters = std.stringChars('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
local name_characters = letters + std.stringChars('0123456789-');
local checked_name(label, value, max_length) =
  assert std.type(value) == 'string' : '%s must be a string' % label;
  assert std.length(value) > 0 : '%s must not be empty' % label;
  assert std.length(value) <= max_length :
    '%s must be %d characters or less: %s' % [label, max_length, value];
  assert std.member(letters, value[0]) : '%s must start with a letter' % label;
  assert std.foldl(
    function(valid, character) valid && std.member(name_characters, character),
    std.stringChars(value),
    true
  ) : '%s may contain only letters, numbers, and hyphens' % label;
  assert std.length(std.findSubstr('--', value)) == 0 :
    '%s must not contain repeating hyphens' % label;
  value;

{
  build(params, metadata)::
    assert std.objectHas(params.config_params, 'ssh_authorized_keys') :
      'ocvs requires config_params.ssh_authorized_keys';
    assert std.type(params.config_params.ssh_authorized_keys) == 'string' &&
           std.length(params.config_params.ssh_authorized_keys) > 0 :
      'config_params.ssh_authorized_keys must be a non-empty string';
    assert std.objectHas(params.config_params, 'cluster') :
      'ocvs requires config_params.cluster';

    local cluster = params.config_params.cluster;
    assert std.type(cluster) == 'object' : 'config_params.cluster must be an object';
    assert std.objectHas(cluster, 'compute_availability_domain') :
      'ocvs requires config_params.cluster.compute_availability_domain';
    assert std.objectHas(cluster, 'esxi_hosts_count') :
      'ocvs requires config_params.cluster.esxi_hosts_count';
    assert std.objectHas(cluster, 'vmware_software_version') :
      'ocvs requires config_params.cluster.vmware_software_version';
    assert std.objectHas(cluster, 'vsphere_type') :
      'ocvs requires config_params.cluster.vsphere_type';
    assert std.objectHas(cluster, 'initial_host_ocpu_count') :
      'ocvs requires config_params.cluster.initial_host_ocpu_count';
    assert std.objectHas(cluster, 'initial_host_shape_name') :
      'ocvs requires config_params.cluster.initial_host_shape_name';
    assert !(std.objectHas(cluster, 'is_hcx_enabled') && cluster.is_hcx_enabled == true) :
      'ocvs config_params.cluster.is_hcx_enabled true is not supported until the NAT gateway pattern is validated';

    local n = params.naming;
    local scope = params.topology;
    local env = scope.scope_name;
    local plat = scope.platform_name;
    local display_segments = [env, plat];
    local cluster_cidr = cidrs.validate('ocvs platform network.vcn', params.network.vcn);
    local cluster_key = n.key('SDDC', display_segments);
    local raw_sddc_name =
      if std.objectHas(cluster, 'sddc_display_name') && cluster.sddc_display_name != null then
        cluster.sddc_display_name
      else
        n.display_tenancy('sddc', display_segments);
    local sddc_name = checked_name(
      'config_params.cluster.sddc_display_name',
      raw_sddc_name,
      16
    );
    local raw_cluster_name =
      if std.objectHas(cluster, 'cluster_display_name') && cluster.cluster_display_name != null then
        cluster.cluster_display_name
      else
        n.display_tenancy('cluster', display_segments);
    local cluster_name = checked_name(
      'config_params.cluster.cluster_display_name',
      raw_cluster_name,
      22
    );

    {
      params: params,
      metadata: metadata,
      n: n,
      scope: scope,
      env: env,
      plat: plat,
      dns: scope.dns,
      cluster: cluster,
      cluster_cidr: cluster_cidr,
      display_segments: display_segments,
      category_key: '%s-platform-%s' % [std.asciiLower(env), std.asciiLower(plat)],
      cmp_key: scope.compartment_key,
      network_cmp_key: scope.network_compartment_key,
      routing: if std.objectHas(params, 'routing') then params.routing else null,
      cluster_key: cluster_key,
      sddc_display_name: sddc_name,
      cluster_display_name: cluster_name,
      vcn_key: n.key('VCN', [env, 'PLATFORM', plat]),
      sgw_key: n.key('SGW', [env, 'PLATFORM', plat]),
      provisioning_subnet_key: n.key('SN', [env, 'PLATFORM', plat, 'PROVISIONING']),
      provisioning_route_table_key: n.key('RT', [env, 'PLATFORM', plat, 'PROVISIONING']),
      provisioning_security_list_key: n.key('SL', [env, 'PLATFORM', plat, 'PROVISIONING']),
      vlan_functions: [
        { name: 'nsx_edge_uplink_1', suffix: 'NSX-EDGE-UPLINK-1' },
        { name: 'nsx_edge_uplink_2', suffix: 'NSX-EDGE-UPLINK-2' },
        { name: 'nsx_vtep', suffix: 'NSX-VTEP' },
        { name: 'nsx_edge_vtep', suffix: 'NSX-EDGE-VTEP' },
        { name: 'vmotion', suffix: 'VMOTION' },
        { name: 'vsan', suffix: 'VSAN' },
        { name: 'vsphere', suffix: 'VSPHERE' },
        { name: 'hcx', suffix: 'HCX' },
        { name: 'replication', suffix: 'REPLICATION' },
        { name: 'provisioning', suffix: 'PROVISIONING' },
      ],
    },
}
