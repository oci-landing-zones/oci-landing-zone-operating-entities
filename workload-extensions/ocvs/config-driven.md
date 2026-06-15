# Config-Driven OCVS

The OCVS workload extension is configured as a platform extension named `ocvs_simple`.

The first supported shape is one OCVS SDDC management cluster per platform. Define another OCVS platform when you need another SDDC.

The platform VCN CIDR is the OCVS cluster network CIDR. Supported prefixes are `/24`, `/23`, `/22`, and `/21`. The generator creates the provisioning subnet, route tables, and network security groups referenced by the generated `ocvs_configuration` payload.

HCX is currently not emitted by config mode. `is_hcx_enabled: true` is rejected until the NAT gateway and firewalled hub pattern is validated.

Validation level: generated JSON and Terraform validation can prove the shape and Terraform contracts, but they do not prove OCI capacity, shape availability, VMware bundle availability, or an actual OCVS apply.

Example platform shape:

```jsonnet
{
  platforms: {
    ocvs: {
      network: { vcn: '10.0.80.0/21' },
      extension: {
        type: 'ocvs_simple',
        params: {
          ssh_authorized_keys: 'ssh-rsa REPLACE_WITH_CUSTOMER_PUBLIC_KEY',
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
}
```
