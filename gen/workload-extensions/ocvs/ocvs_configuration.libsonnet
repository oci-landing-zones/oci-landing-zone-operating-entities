function(ctx) {
  local n = ctx.n,
  local c = ctx.cluster,
  local nsg_key(fn) = n.key('NSG', [ctx.env, 'PLATFORM', ctx.plat, fn.suffix]),
  local rt_key(fn) = n.key('RT', [ctx.env, 'PLATFORM', ctx.plat, fn.suffix]),
  local function_by_name = {
    [fn.name]: fn
    for fn in ctx.vlan_functions
  },

  ocvs_configuration: {
    default_compartment_id: ctx.cmp_key,
    default_ssh_authorized_keys: ctx.params.config_params.ssh_authorized_keys,
    ocvs_clusters: {
      [ctx.cluster_key]: {
        service_label:
          if std.objectHas(c, 'service_label') && c.service_label != null then c.service_label
          else n.display('ocvs', ctx.display_segments),
        sddc_display_name: ctx.sddc_display_name,
        cluster_display_name: ctx.cluster_display_name,
        vmware_software_version: c.vmware_software_version,
        is_hcx_enabled: if std.objectHas(c, 'is_hcx_enabled') then c.is_hcx_enabled else false,
        compute_availability_domain: c.compute_availability_domain,
        esxi_hosts_count: c.esxi_hosts_count,
        vsphere_type: c.vsphere_type,
        initial_host_ocpu_count: c.initial_host_ocpu_count,
        initial_host_shape_name: c.initial_host_shape_name,
        [if std.objectHas(c, 'capacity_reservation_id') then 'capacity_reservation_id']: c.capacity_reservation_id,
        [if std.objectHas(c, 'workload_network_cidr') then 'workload_network_cidr']: c.workload_network_cidr,
        networking: {
          vcn_id: ctx.vcn_key,
          vcn_cidr_block: ctx.cluster_cidr,
          subnet_id: ctx.provisioning_subnet_key,
          nsgs: {
            nsx_edge_uplink_1_nsg_id: nsg_key(function_by_name.nsx_edge_uplink_1),
            nsx_edge_uplink_2_nsg_id: nsg_key(function_by_name.nsx_edge_uplink_2),
            nsx_vtep_nsg_id: nsg_key(function_by_name.nsx_vtep),
            nsx_edge_vtep_nsg_id: nsg_key(function_by_name.nsx_edge_vtep),
            vmotion_nsg_id: nsg_key(function_by_name.vmotion),
            vsan_nsg_id: nsg_key(function_by_name.vsan),
            vsphere_nsg_id: nsg_key(function_by_name.vsphere),
            hcx_nsg_id: nsg_key(function_by_name.hcx),
            replication_nsg_id: nsg_key(function_by_name.replication),
            provisioning_nsg_id: nsg_key(function_by_name.provisioning),
          },
          route_tables: {
            nsx_edge_uplink_1_rt_id: rt_key(function_by_name.nsx_edge_uplink_1),
            nsx_edge_uplink_2_rt_id: rt_key(function_by_name.nsx_edge_uplink_2),
            nsx_vtep_rt_id: rt_key(function_by_name.nsx_vtep),
            nsx_edge_vtep_rt_id: rt_key(function_by_name.nsx_edge_vtep),
            vmotion_rt_id: rt_key(function_by_name.vmotion),
            vsan_rt_id: rt_key(function_by_name.vsan),
            vsphere_rt_id: rt_key(function_by_name.vsphere),
            hcx_rt_id: rt_key(function_by_name.hcx),
            replication_rt_id: rt_key(function_by_name.replication),
            provisioning_rt_id: rt_key(function_by_name.provisioning),
          },
        },
      },
    },
  },
}
