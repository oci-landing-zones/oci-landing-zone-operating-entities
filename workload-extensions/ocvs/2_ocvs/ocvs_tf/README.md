## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >=1.5.7 |
| <a name="requirement_oci"></a> [oci](#requirement\_oci) | 6.32.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_oci"></a> [oci](#provider\_oci) | 6.32.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [oci_core_vlan.hcx_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.nsx_edge_uplink1_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.nsx_edge_uplink2_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.nsx_edge_vtep_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.nsx_vtep_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.provisioning_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.replication_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.vmotion_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.vsan_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_core_vlan.vsphere_vlan](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/core_vlan) | resource |
| [oci_ocvp_cluster.cluster](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/ocvp_cluster) | resource |
| [oci_ocvp_sddc.sddc](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/resources/ocvp_sddc) | resource |
| [oci_core_vcn.ocvs](https://registry.terraform.io/providers/oracle/oci/6.32.0/docs/data-sources/core_vcn) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_availability_domain"></a> [availability\_domain](#input\_availability\_domain) | OCVS Compute Availability domain | `string` | n/a | yes |
| <a name="input_block_volume_ids"></a> [block\_volume\_ids](#input\_block\_volume\_ids) | Block Volume IDs | `list(string)` | `[]` | no |
| <a name="input_capacity_reservation_id"></a> [capacity\_reservation\_id](#input\_capacity\_reservation\_id) | Capacity Reservation ID | `string` | `null` | no |
| <a name="input_clusters"></a> [clusters](#input\_clusters) | Clusters Definitions | <pre>object({<br>    name = string<br>  })</pre> | n/a | yes |
| <a name="input_datastore_type"></a> [datastore\_type](#input\_datastore\_type) | Datastore Type | `string` | `null` | no |
| <a name="input_defined_tags_sddc"></a> [defined\_tags\_sddc](#input\_defined\_tags\_sddc) | Defined Tags SDDC | `map(string)` | `null` | no |
| <a name="input_esxi_hosts_count"></a> [esxi\_hosts\_count](#input\_esxi\_hosts\_count) | Number of esxi hosts | `number` | n/a | yes |
| <a name="input_freeform_tags"></a> [freeform\_tags](#input\_freeform\_tags) | Simple key-value pairs to tag the resources created using freeform tags | `map(any)` | n/a | yes |
| <a name="input_freeform_tags_sddc"></a> [freeform\_tags\_sddc](#input\_freeform\_tags\_sddc) | Freeform Tags SDDC | `map(string)` | `null` | no |
| <a name="input_hcx_action"></a> [hcx\_action](#input\_hcx\_action) | HCX action | `string` | `"upgrade"` | no |
| <a name="input_hcx_enabled"></a> [hcx\_enabled](#input\_hcx\_enabled) | Enable HCX | `bool` | `false` | no |
| <a name="input_hcx_nsg_id"></a> [hcx\_nsg\_id](#input\_hcx\_nsg\_id) | HCX NSG OCID | `string` | `null` | no |
| <a name="input_initial_commitment"></a> [initial\_commitment](#input\_initial\_commitment) | Initial Commitment | `string` | `null` | no |
| <a name="input_initial_host_ocpu_count"></a> [initial\_host\_ocpu\_count](#input\_initial\_host\_ocpu\_count) | Initial Host OCPU Count | `number` | `null` | no |
| <a name="input_initial_host_shape_name"></a> [initial\_host\_shape\_name](#input\_initial\_host\_shape\_name) | Initial Host Shape Name | `string` | `null` | no |
| <a name="input_instance_name_prefix"></a> [instance\_name\_prefix](#input\_instance\_name\_prefix) | Instance Name Prefix | `string` | `null` | no |
| <a name="input_internal_route_table_id"></a> [internal\_route\_table\_id](#input\_internal\_route\_table\_id) | Internal Route Table ID | `string` | n/a | yes |
| <a name="input_network_compartment_id"></a> [network\_compartment\_id](#input\_network\_compartment\_id) | Network Compartment OCID | `string` | n/a | yes |
| <a name="input_nsx_edge_uplink_nsg_id"></a> [nsx\_edge\_uplink\_nsg\_id](#input\_nsx\_edge\_uplink\_nsg\_id) | NSX Edge Uplink NSG OCID | `string` | n/a | yes |
| <a name="input_nsx_edge_vtep_nsg_id"></a> [nsx\_edge\_vtep\_nsg\_id](#input\_nsx\_edge\_vtep\_nsg\_id) | NSX Edge VTEP NSG OCID | `string` | n/a | yes |
| <a name="input_nsx_vtep_nsg_id"></a> [nsx\_vtep\_nsg\_id](#input\_nsx\_vtep\_nsg\_id) | NSX VTEP NSGI OCID | `string` | n/a | yes |
| <a name="input_ocvs_compartment_id"></a> [ocvs\_compartment\_id](#input\_ocvs\_compartment\_id) | OCVS Compartment OCID | `string` | n/a | yes |
| <a name="input_provisioning_nsg_id"></a> [provisioning\_nsg\_id](#input\_provisioning\_nsg\_id) | Provisioning NSG OCID | `string` | n/a | yes |
| <a name="input_provisioning_subnet_id"></a> [provisioning\_subnet\_id](#input\_provisioning\_subnet\_id) | Provisioning Subnet ID | `string` | n/a | yes |
| <a name="input_region"></a> [region](#input\_region) | OCI Region | `string` | n/a | yes |
| <a name="input_replication_nsg_id"></a> [replication\_nsg\_id](#input\_replication\_nsg\_id) | Replication NSG OCID | `string` | n/a | yes |
| <a name="input_sddc_display_name"></a> [sddc\_display\_name](#input\_sddc\_display\_name) | OCVS SDDC Name | `string` | n/a | yes |
| <a name="input_shielded_instances_enabled"></a> [shielded\_instances\_enabled](#input\_shielded\_instances\_enabled) | Shielded Instances Enabled | `bool` | `false` | no |
| <a name="input_single_host_sddc_enabled"></a> [single\_host\_sddc\_enabled](#input\_single\_host\_sddc\_enabled) | Single Host SDDC | `bool` | `false` | no |
| <a name="input_ssh_authorized_keys_pub"></a> [ssh\_authorized\_keys\_pub](#input\_ssh\_authorized\_keys\_pub) | SSH Authorized Publick keys | `string` | n/a | yes |
| <a name="input_vcn_id"></a> [vcn\_id](#input\_vcn\_id) | VCN OCID | `string` | n/a | yes |
| <a name="input_vlan_route_table_id"></a> [vlan\_route\_table\_id](#input\_vlan\_route\_table\_id) | VLAN Route Table OCID | `string` | n/a | yes |
| <a name="input_vmotion_nsg_id"></a> [vmotion\_nsg\_id](#input\_vmotion\_nsg\_id) | VMotion Nsg OCID | `string` | n/a | yes |
| <a name="input_vmware_software_version"></a> [vmware\_software\_version](#input\_vmware\_software\_version) | VMWare Version | `string` | n/a | yes |
| <a name="input_vsan_nsg_id"></a> [vsan\_nsg\_id](#input\_vsan\_nsg\_id) | VSAN NSG OCID | `string` | n/a | yes |
| <a name="input_vsphere_nsg_id"></a> [vsphere\_nsg\_id](#input\_vsphere\_nsg\_id) | VSphere NSG OCID | `string` | n/a | yes |
| <a name="input_vsphere_type"></a> [vsphere\_type](#input\_vsphere\_type) | VSphere type | `string` | n/a | yes |
| <a name="input_workload_network_cidr"></a> [workload\_network\_cidr](#input\_workload\_network\_cidr) | Workload Network CIDR | `string` | n/a | yes |

## Outputs

No outputs.
