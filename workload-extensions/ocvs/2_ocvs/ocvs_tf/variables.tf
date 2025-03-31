variable "clusters" {
  description = "Clusters Definitions"
  type = object({
    name = string
  })

}

variable "freeform_tags" {
  description = "Simple key-value pairs to tag the resources created using freeform tags"
  type        = map(any)
}

variable "region" {
  description = "OCI Region"
  type        = string
}

variable "network_compartment_id" {
  description = "Network Compartment OCID"
  type        = string
}

variable "vcn_id" {
  description = "VCN OCID"
  type        = string
}

variable "ocvs_compartment_id" {
  description = "OCVS Compartment OCID"
  type        = string
}

variable "provisioning_subnet_id" {
  description = "Provisioning Subnet ID"
  type        = string
}

variable "availability_domain" {
  description = "OCVS Compute Availability domain"
  type        = string
}

###################
# SDDC
###################

variable "sddc_display_name" {
  description = "OCVS SDDC Name"
  type        = string
}

variable "esxi_hosts_count" {
  description = "Number of esxi hosts"
  type        = number
}

variable "vsphere_type" {
  description = "VSphere type"
  type        = string
}

variable "vmware_software_version" {
  description = "VMWare Version"
  type        = string
}

variable "hcx_enabled" {
  description = "Enable HCX"
  type        = bool
  default     = false
}

variable "workload_network_cidr" {
  description = "Workload Network CIDR"
  type        = string
}

variable "initial_commitment" {
  description = "Initial Commitment"
  type        = string
  default     = null
}

variable "ssh_authorized_keys_pub" {
  description = "SSH Authorized Publick keys"
  type        = string
}

variable "capacity_reservation_id" {
  description = "Capacity Reservation ID"
  type        = string
  default     = null
}

variable "block_volume_ids" {
  description = "Block Volume IDs"
  type        = list(string)
  default     = []
}

variable "datastore_type" {
  description = "Datastore Type"
  type        = string
  default     = null
}

variable "initial_host_ocpu_count" {
  description = "Initial Host OCPU Count"
  type        = number
  default     = null
}

variable "initial_host_shape_name" {
  description = "Initial Host Shape Name"
  type        = string
  default     = null
}

variable "instance_name_prefix" {
  description = "Instance Name Prefix"
  type        = string
  default     = null
}

variable "shielded_instances_enabled" {
  description = "Shielded Instances Enabled"
  type        = bool
  default     = false
}

variable "hcx_action" {
  description = "HCX action"
  type        = string
  default     = "upgrade"
}

variable "freeform_tags_sddc" {
  description = "Freeform Tags SDDC"
  type        = map(string)
  default     = null
}

variable "defined_tags_sddc" {
  description = "Defined Tags SDDC"
  type        = map(string)
  default     = null
}

variable "single_host_sddc_enabled" {
  description = "Single Host SDDC"
  type        = bool
  default     = false
}
###################
# NSG
###################

variable "nsx_edge_uplink_nsg_id" {
  description = "NSX Edge Uplink NSG OCID"
  type        = string
}

variable "nsx_vtep_nsg_id" {
  description = "NSX VTEP NSGI OCID"
  type        = string
}

variable "nsx_edge_vtep_nsg_id" {
  description = "NSX Edge VTEP NSG OCID"
  type        = string
}

variable "vsan_nsg_id" {
  description = "VSAN NSG OCID"
  type        = string
}

variable "vmotion_nsg_id" {
  description = "VMotion Nsg OCID"
  type        = string
}

variable "vsphere_nsg_id" {
  description = "VSphere NSG OCID"
  type        = string
}

variable "hcx_nsg_id" {
  description = "HCX NSG OCID"
  type        = string
  default     = null
}

variable "provisioning_nsg_id" {
  description = "Provisioning NSG OCID"
  type        = string
}

variable "replication_nsg_id" {
  description = "Replication NSG OCID"
  type        = string
}

#####################
# Route Table
#####################

variable "vlan_route_table_id" {
  description = "VLAN Route Table OCID"
  type        = string
}

variable "internal_route_table_id" {
  description = "Internal Route Table ID"
  type        = string
}

