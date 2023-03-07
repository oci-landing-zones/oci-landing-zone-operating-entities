#Variables declared in this file must be declared in the marketplace.yaml
#Provide a description to your variables.

############################
#  Hidden Variable Group   #
############################
variable "tenancy_ocid" {
}

variable "region" {
}

###############################################################################
#  Marketplace Image Listing - information available in the Partner portal    #
###############################################################################
variable "mp_subscription_enabled" {
  description = "Subscribe to Marketplace listing?"
  type        = bool
  default     = false
}

variable "mp_listing_id" {
  // default = "ocid1.appcataloglisting.oc1.."
  default     = ""
  description = "Marketplace Listing OCID"
}

variable "mp_listing_resource_id" {
  // default = "ocid1.image.oc1.."
  default     = ""
  description = "Marketplace Listing Image OCID"
}

variable "mp_listing_resource_version" {
  // default = "1.0"
  default     = ""
  description = "Marketplace Listing Package/Resource Version"
}

############################
#  Custom Image           #
############################
variable "custom_image_id" {
  default     = "ocid1.image.oc1...."
  description = "Custom Image OCID"
}

############################
#  Compute Configuration   #
############################

variable "vm_display_name" {
  description = "Instance Name"
  default     = "simple-vm"
}

variable "vm_compute_shape" {
  description = "Compute Shape"
  default     = "VM.Standard2.2" //2 cores
}

# only used for E3 Flex shape
variable "vm_flex_shape_ocpus" {
  description = "Flex Shape OCPUs"
  default = 1
}

variable "availability_domain_name" {
  default     = ""
  description = "Availability Domain name, if non-empty takes precedence over availability_domain_number"
}

variable "availability_domain_number" {
  default     = 1
  description = "OCI Availability Domains: 1,2,3  (subject to region availability)"
}

variable "ssh_public_key" {
  description = "SSH Public Key"
}

variable "hostname_label" {
  default     = "simple"
  description = "DNS Hostname Label. Must be unique across all VNICs in the subnet and comply with RFC 952 and RFC 1123."
}

############################
#  Network Configuration   #
############################

variable "network_strategy" {
  #default = "Use Existing VCN and Subnet"
  default = "Create New VCN and Subnet"
}

variable "vcn_id" {
  default = ""
}

variable "vcn_display_name" {
  description = "VCN Name"
  default     = "simple-vcn"
}

variable "vcn_cidr_block" {
  description = "VCN CIDR"
  default     = "10.0.0.0/16"
}

variable "vcn_dns_label" {
  description = "VCN DNS Label"
  default     = "simplevcn"
}

variable "subnet_type" {
  description = "Choose between private and public subnets"
  default     = "Public Subnet"
  #or
  #default     = "Private Subnet"
}

variable "subnet_id" {
  default = ""
}

variable "subnet_display_name" {
  description = "Subnet Name"
  default     = "simple-subnet"
}

variable "subnet_cidr_block" {
  description = "Subnet CIDR"
  default     = "10.0.0.0/24"
}

variable "subnet_dns_label" {
  description = "Subnet DNS Label"
  default     = "simplesubnet"
}

############################
# Security Configuration #
############################
variable "nsg_display_name" {
  description = "Network Security Group Name"
  default     = "simple-network-security-group"
}

variable "nsg_source_cidr" {
  description = "Allowed Ingress Traffic (CIDR Block)"
  default     = "0.0.0.0/0"
}

variable "nsg_ssh_port" {
  description = "SSH Port"
  default     = 22
}

variable "nsg_https_port" {
  description = "HTTPS Port"
  default     = 443
}

variable "nsg_http_port" {
  description = "HTTP Port"
  default     = 80
}

############################
# Additional Configuration #
############################

variable "compartment_ocid" {
  description = "Compartment where Compute and Marketplace subscription resources will be created"
}

variable "tag_key_name" {
  description = "Free-form tag key name"
  default     = "oracle-quickstart"
}

variable "tag_value" {
  description = "Free-form tag value"
  default     = "oci-quickstart-template"
}


######################
#    Enum Values     #
######################
variable "network_strategy_enum" {
  type = map
  default = {
    CREATE_NEW_VCN_SUBNET   = "Create New VCN and Subnet"
    USE_EXISTING_VCN_SUBNET = "Use Existing VCN and Subnet"
  }
}

variable "subnet_type_enum" {
  type = map
  default = {
    PRIVATE_SUBNET = "Private Subnet"
    PUBLIC_SUBNET  = "Public Subnet"
  }
}

variable "nsg_config_enum" {
  type = map
  default = {
    BLOCK_ALL_PORTS = "Block all ports"
    OPEN_ALL_PORTS  = "Open all ports"
    CUSTOMIZE       = "Customize ports - Post deployment"
  }
}
