## Open LZ OE-01 Arhitecture Provisioning

### Arhitecture diagrams


Functional Diagram

![Functional Diagram](./diagrams/oe-functional-view.png)

Security Diagram

![Security Diagram](./diagrams/oe-security-view.png)

Network Diagram

![Network Diagram](./diagrams/oe-network-view.png)

### How to run the automation

- Change the directory to the ```terraform-oci-open-lz``` terraform module

- terraform init

```
terraform init
```

- terraform plan

```
terraform plan \
-var-file <YOUR_PATH>/oci-credentials.tfvars.json \
-var-file <YOUR_PATH>/open_lz_shared_security.auto.tfvars.json \
-var-file <YOUR_PATH>/open_lz_shared_network.auto.tfvars.json \
-state <YOUR_PATH>/terraform.tfstate \
/
```

- terraform apply

```
terraform apply \
-var-file <YOUR_PATH>/oci-credentials.tfvars.json \
-var-file <YOUR_PATH>/open_lz_shared_security.auto.tfvars.json \
-var-file <YOUR_PATH>/open_lz_shared_network.auto.tfvars.json \
-state <YOUR_PATH>/terraform.tfstate \
/
```


### Automation Output:

```
compartments = {
  "CMP-OE01-COMMON-INFRA-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 common infra Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-common-infra"
      "openlz-cmp" = "common-infra"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-common-infra"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:45.161 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-COMMON-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 common Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-common"
      "openlz-cmp" = "common"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-common"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:34.503 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-COMMON-NETWORK-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 common network Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-common-network"
      "openlz-cmp" = "common-network"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-common-network"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:44.686 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-DEVELOPMENT-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 development Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-development"
      "openlz-cmp" = "development"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1...."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-development"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:32.623 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-KEY" = {
    "compartment_id" = "ocid1.tenancy.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE-01 top compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01"
      "openlz-cmp" = "oe-top"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe1"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:23.563 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-NONPROD-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 nonprod Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-nonprod"
      "openlz-cmp" = "nonprod"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-nonprod"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:33.472 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-PROD-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 prod Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-prod"
      "openlz-cmp" = "prod"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-prod"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:34.062 +0000 UTC"
    "timeouts" = null /* object */
  }
  "CMP-OE01-SANDBOX-KEY" = {
    "compartment_id" = "ocid1.compartment.oc1..."
    "defined_tags" = tomap({
      "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
    })
    "description" = "Vision OE01 sandbox Compartment"
    "enable_delete" = true
    "freeform_tags" = tomap({
      "openlz" = "openlz-oe01-sandbox"
      "openlz-cmp" = "sandbox"
      "openlz-customer" = "vision"
    })
    "id" = "ocid1.compartment.oc1..."
    "inactive_state" = tostring(null)
    "is_accessible" = true
    "name" = "cmp-oe01-sandbox"
    "state" = "ACTIVE"
    "time_created" = "2023-06-12 10:17:36.264 +0000 UTC"
    "timeouts" = null /* object */
  }
}
groups = {}
memberships = {}
provisioned_networking_resources = {
  "dhcp_options" = {
    "VCN-FRANKFURT-OE01-CO-DHCP-OPTION-01-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-CO-DHCP-OPTION-01-KEY"
      "display_name" = "vcn_frankfurt_oe01_co_dhcp_option_01"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaaah2c6ud7lztbwna7ogotuyab2msjwuhktz67gwqpw7wltuetf2ra"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "192.168.0.3",
            "192.168.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.55 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "VCN-FRANKFURT-OE01-CO-DHCP-OPTION-02-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-CO-DHCP-OPTION-02-KEY"
      "display_name" = "vcn_frankfurt_oe01_co_dhcp_option_02"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaaxv43npf3bh2zxtwdspq3tb5dmjo23flfmtlcxas5fnkwgyp4lfyq"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "10.0.0.3",
            "10.0.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.746 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "VCN-FRANKFURT-OE01-DEV-DHCP-OPTION-01-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-DEV-DHCP-OPTION-01-KEY"
      "display_name" = "vcn_frankfurt_oe01_dev_dhcp_option_01"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa4qvcdebpwgkfvmqhcdvolhghk4wcx73t4rs3kqr5mxbues7ck63a"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "192.168.0.3",
            "192.168.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.304 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "VCN-FRANKFURT-OE01-DEV-DHCP-OPTION-02-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-DEV-DHCP-OPTION-02-KEY"
      "display_name" = "vcn_frankfurt_oe01_dev_dhcp_option_02"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagywagvzueooykyur64fx4xq6zmao72licfsin6p6gvj4r6xyszmq"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "10.0.0.3",
            "10.0.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.65 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "VCN-FRANKFURT-OE01-NP-DHCP-OPTION-01-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-NP-DHCP-OPTION-01-KEY"
      "display_name" = "vcn_frankfurt_oe01_np_dhcp_option_01"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaaykbm5u7kw6paqupiddiokbf455jvm4uefjvgqtxv756jgwyeba5a"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "192.168.0.3",
            "192.168.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.114 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "VCN-FRANKFURT-OE01-NP-DHCP-OPTION-02-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-NP-DHCP-OPTION-02-KEY"
      "display_name" = "vcn_frankfurt_oe01_np_dhcp_option_02"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaab4blhhac6fl7kpuptcvkq3t3est5se6dekxkray7h2yxqkf222rq"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "10.0.0.3",
            "10.0.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.912 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "VCN-FRANKFURT-OE01-P-DHCP-OPTION-01-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-P-DHCP-OPTION-01-KEY"
      "display_name" = "vcn_frankfurt_oe01_p_dhcp_option_01"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagvtch6ft3ref7topbhkjq76clyed5wpchroh3o5wug3mtimao7ca"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "192.168.0.3",
            "192.168.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.264 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "VCN-FRANKFURT-OE01-P-DHCP-OPTION-02-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-P-DHCP-OPTION-02-KEY"
      "display_name" = "vcn_frankfurt_oe01_p_dhcp_option_02"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaao4kc5vmickyvv2abccb2mtbyosfupajgqrrchhbj6fpjjla2wkba"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "10.0.0.3",
            "10.0.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.439 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "VCN-FRANKFURT-OE01-SB-DHCP-OPTION-01-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-SB-DHCP-OPTION-01-KEY"
      "display_name" = "vcn_frankfurt_oe01_sb_dhcp_option_01"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa34nxn3oowvi5hyocmddyaiuqkunagjgm5iuxt4rxgcdtjnghdiwq"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "192.168.0.3",
            "192.168.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.013 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "VCN-FRANKFURT-OE01-SB-DHCP-OPTION-02-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "dhcp_options_key" = "VCN-FRANKFURT-OE01-SB-DHCP-OPTION-02-KEY"
      "display_name" = "vcn_frankfurt_oe01_sb_dhcp_option_02"
      "domain_name_type" = "CUSTOM_DOMAIN"
      "freeform_tags" = tomap({})
      "id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaaw2tqtqmuficugl5dbzq326nqt6x466bhwj3tf3mrmh7won3sj45a"
      "network_configuration_category" = "shared"
      "options" = toset([
        {
          "custom_dns_servers" = tolist([
            "10.0.0.3",
            "10.0.0.4",
          ])
          "search_domain_names" = tolist([])
          "server_type" = "CustomDnsServer"
          "type" = "DomainNameServer"
        },
        {
          "custom_dns_servers" = tolist([])
          "search_domain_names" = tolist([
            "test.com",
          ])
          "server_type" = ""
          "type" = "SearchDomain"
        },
      ])
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:55.873 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "drg_attachments" = {}
  "drg_route_distributions" = {}
  "drg_route_distributions_statements" = {}
  "drg_route_table_route_rules" = {}
  "drg_route_tables" = {}
  "dynamic_routing_gateways" = {}
  "internet_gateways" = {}
  "local_peering_gateways" = {}
  "nat_gateways" = {}
  "network_security_groups" = {
    "NSG-01-OE01-CO-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101757"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa6uowijb3cpy4u6tv2aqjn634utfvb25wcrmoiean7dijojai7una"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-01-OE01-CO-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.592 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-01-OE01-DEV-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101757"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaark4gftxnft3opfyf7ow6r3bora7apslvwjsshq6ghrbftoyxagbq"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-01-OE01-DEV-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.56 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-01-OE01-NP-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101758"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaahaoavm46jp7gylrf4gi3sgj44h2mywbvgazg7yqecrmt6ng4nrnq"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-01-OE01-NP-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.363 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-01-OE01-P-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101758"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaahd5w7ervmfxfxb7di6kyvmda7tbnwea4o6hab6mhld7nfkr362dq"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-01-OE01-P-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.3 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-01-OE01-SB-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101758"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa5aokuoct2mecth4l4lqk5jg2hhqgyparfwqhe3s7hhe7sfwxv4ba"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-01-OE01-SB-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.23 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "NSG-02-OE01-CO-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101757"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabxvfy6ikrgyqdl7koq6ojjsvomxpt6rffgxzl476jcuvn3ctqnoq"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-02-OE01-CO-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.787 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-02-OE01-DEV-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101758"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabcw337r766pgxjz2jrudmhmcik2e4peumhakqpi542oavcrbdnpq"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-02-OE01-DEV-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.092 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-02-OE01-NP-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101757"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa2t5ns7k4oqxnwvgiznn6vqlveifexukgylc5uqjaoouluagamqva"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-02-OE01-NP-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.558 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-02-OE01-P-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101757"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaaby7366zkboqb3seekon64ugcohuo3h5c4hgm3knnn6bxuosuhmbq"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-02-OE01-P-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:57.539 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-02-OE01-SB-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "networksecuritygroup20230612101758"
      "freeform_tags" = tomap({})
      "id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaanl7daz3fkwng463i25dht6zsyvq4ji2dyuo27xfkchpfusr4ks5q"
      "network_configuration_category" = "shared"
      "nsg_key" = "NSG-02-OE01-SB-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.188 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "network_security_groups_egress_rules" = {
    "NSG-01-OE01-CO-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "35080E"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa6uowijb3cpy4u6tv2aqjn634utfvb25wcrmoiean7dijojai7una"
      "network_security_group_key" = "NSG-01-OE01-CO-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.581 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-01-OE01-DEV-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "009672"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaark4gftxnft3opfyf7ow6r3bora7apslvwjsshq6ghrbftoyxagbq"
      "network_security_group_key" = "NSG-01-OE01-DEV-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.729 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-01-OE01-NP-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "8EE1FA"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaahaoavm46jp7gylrf4gi3sgj44h2mywbvgazg7yqecrmt6ng4nrnq"
      "network_security_group_key" = "NSG-01-OE01-NP-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.576 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-01-OE01-P-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "9FCE3E"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaahd5w7ervmfxfxb7di6kyvmda7tbnwea4o6hab6mhld7nfkr362dq"
      "network_security_group_key" = "NSG-01-OE01-P-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.591 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-01-OE01-SB-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "1E5E0C"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa5aokuoct2mecth4l4lqk5jg2hhqgyparfwqhe3s7hhe7sfwxv4ba"
      "network_security_group_key" = "NSG-01-OE01-SB-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.582 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "NSG-02-OE01-CO-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "0EE2E2"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabxvfy6ikrgyqdl7koq6ojjsvomxpt6rffgxzl476jcuvn3ctqnoq"
      "network_security_group_key" = "NSG-02-OE01-CO-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.263 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-02-OE01-DEV-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "79B7CF"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabcw337r766pgxjz2jrudmhmcik2e4peumhakqpi542oavcrbdnpq"
      "network_security_group_key" = "NSG-02-OE01-DEV-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.574 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-02-OE01-NP-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "52484E"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa2t5ns7k4oqxnwvgiznn6vqlveifexukgylc5uqjaoouluagamqva"
      "network_security_group_key" = "NSG-02-OE01-NP-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.684 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-02-OE01-P-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "60D07A"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaaby7366zkboqb3seekon64ugcohuo3h5c4hgm3knnn6bxuosuhmbq"
      "network_security_group_key" = "NSG-02-OE01-P-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.233 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-02-OE01-SB-VCN-KEY.anywhere" = {
      "description" = "egress to 0.0.0.0/0 over TCP"
      "destination" = "0.0.0.0/0"
      "destination_type" = "CIDR_BLOCK"
      "direction" = "EGRESS"
      "icmp_options" = tolist([])
      "id" = "511BF3"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaanl7daz3fkwng463i25dht6zsyvq4ji2dyuo27xfkchpfusr4ks5q"
      "network_security_group_key" = "NSG-02-OE01-SB-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = tostring(null)
      "source_type" = ""
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.383 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "network_security_groups_ingress_rules" = {
    "NSG-01-OE01-CO-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "D6C3DE"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa6uowijb3cpy4u6tv2aqjn634utfvb25wcrmoiean7dijojai7una"
      "network_security_group_key" = "NSG-01-OE01-CO-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.643 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-01-OE01-DEV-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "48E43F"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaark4gftxnft3opfyf7ow6r3bora7apslvwjsshq6ghrbftoyxagbq"
      "network_security_group_key" = "NSG-01-OE01-DEV-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.617 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-01-OE01-NP-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "EC5E6D"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaahaoavm46jp7gylrf4gi3sgj44h2mywbvgazg7yqecrmt6ng4nrnq"
      "network_security_group_key" = "NSG-01-OE01-NP-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.695 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-01-OE01-P-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "789B28"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaahd5w7ervmfxfxb7di6kyvmda7tbnwea4o6hab6mhld7nfkr362dq"
      "network_security_group_key" = "NSG-01-OE01-P-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.861 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-01-OE01-SB-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "D36F51"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa5aokuoct2mecth4l4lqk5jg2hhqgyparfwqhe3s7hhe7sfwxv4ba"
      "network_security_group_key" = "NSG-01-OE01-SB-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.812 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "NSG-02-OE01-CO-VCN-KEY.http_8080" = {
      "description" = "ingress from 0.0.0.0/0 over HTTP8080"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "897294"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabxvfy6ikrgyqdl7koq6ojjsvomxpt6rffgxzl476jcuvn3ctqnoq"
      "network_security_group_key" = "NSG-02-OE01-CO-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 80
              "min" = 80
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.575 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-02-OE01-CO-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "B4EA07"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabxvfy6ikrgyqdl7koq6ojjsvomxpt6rffgxzl476jcuvn3ctqnoq"
      "network_security_group_key" = "NSG-02-OE01-CO-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.783 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "NSG-02-OE01-DEV-VCN-KEY.http_8080" = {
      "description" = "ingress from 0.0.0.0/0 over HTTP8080"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "054C84"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabcw337r766pgxjz2jrudmhmcik2e4peumhakqpi542oavcrbdnpq"
      "network_security_group_key" = "NSG-02-OE01-DEV-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 80
              "min" = 80
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.34 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-02-OE01-DEV-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "1D6831"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaabcw337r766pgxjz2jrudmhmcik2e4peumhakqpi542oavcrbdnpq"
      "network_security_group_key" = "NSG-02-OE01-DEV-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.665 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "NSG-02-OE01-NP-VCN-KEY.http_8080" = {
      "description" = "ingress from 0.0.0.0/0 over HTTP8080"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "66A6E5"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa2t5ns7k4oqxnwvgiznn6vqlveifexukgylc5uqjaoouluagamqva"
      "network_security_group_key" = "NSG-02-OE01-NP-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 80
              "min" = 80
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.99 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-02-OE01-NP-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "3697C3"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaa2t5ns7k4oqxnwvgiznn6vqlveifexukgylc5uqjaoouluagamqva"
      "network_security_group_key" = "NSG-02-OE01-NP-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:00.971 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "NSG-02-OE01-P-VCN-KEY.http_8080" = {
      "description" = "ingress from 0.0.0.0/0 over HTTP8080"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "E90092"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaaby7366zkboqb3seekon64ugcohuo3h5c4hgm3knnn6bxuosuhmbq"
      "network_security_group_key" = "NSG-02-OE01-P-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 80
              "min" = 80
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.612 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-02-OE01-P-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "25639D"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaaby7366zkboqb3seekon64ugcohuo3h5c4hgm3knnn6bxuosuhmbq"
      "network_security_group_key" = "NSG-02-OE01-P-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101757"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.715 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "NSG-02-OE01-SB-VCN-KEY.http_8080" = {
      "description" = "ingress from 0.0.0.0/0 over HTTP8080"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "94261D"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaanl7daz3fkwng463i25dht6zsyvq4ji2dyuo27xfkchpfusr4ks5q"
      "network_security_group_key" = "NSG-02-OE01-SB-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 80
              "min" = 80
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:17:59.586 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "NSG-02-OE01-SB-VCN-KEY.ssh_22" = {
      "description" = "ingress from 0.0.0.0/0 over TCP22"
      "destination" = tostring(null)
      "destination_type" = ""
      "direction" = "INGRESS"
      "icmp_options" = tolist([])
      "id" = "A73ABC"
      "is_valid" = true
      "network_configuration_category" = "shared"
      "network_security_group_id" = "ocid1.networksecuritygroup.oc1.eu-frankfurt-1.aaaaaaaanl7daz3fkwng463i25dht6zsyvq4ji2dyuo27xfkchpfusr4ks5q"
      "network_security_group_key" = "NSG-02-OE01-SB-VCN-KEY"
      "network_security_group_name" = "networksecuritygroup20230612101758"
      "protocol" = "6"
      "source" = "0.0.0.0/0"
      "source_type" = "CIDR_BLOCK"
      "stateless" = false
      "tcp_options" = tolist([
        {
          "destination_port_range" = tolist([
            {
              "max" = 22
              "min" = 22
            },
          ])
          "source_port_range" = tolist([])
        },
      ])
      "time_created" = "2023-06-12 10:18:01.65 +0000 UTC"
      "timeouts" = null /* object */
      "udp_options" = tolist([])
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "oci_network_firewall_network_firewall_policies" = {}
  "oci_network_firewall_network_firewalls" = {}
  "remote_peering_connections" = {}
  "route_tables" = {
    "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_CO-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "display_name" = "Default Route Table for vcn_frankfurt_oe01_co"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaatjdlucyb7o3ijstm2nbh5mh4y5pgbo57algsjmcohhbd5ponsoha"
      "network_configuration_category" = "shared"
      "route_rules" = tolist([])
      "route_table_key" = "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_CO-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.371 +0000 UTC"
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_DEV-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "display_name" = "Default Route Table for vcn_frankfurt_oe01_dev"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaabxjmltkiwhplk52pouu5eraokoqfzmuu56rgwnmaehmx7kj6uvva"
      "network_configuration_category" = "shared"
      "route_rules" = tolist([])
      "route_table_key" = "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_DEV-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.366 +0000 UTC"
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_NP-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "display_name" = "Default Route Table for vcn_frankfurt_oe01_np"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaro72sp3wzwzxv6wcz445cq7nxe7shfnyezsvvczunld5km4s344q"
      "network_configuration_category" = "shared"
      "route_rules" = tolist([])
      "route_table_key" = "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_NP-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.339 +0000 UTC"
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_P-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "display_name" = "Default Route Table for vcn_frankfurt_oe01_p"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6tzvm5tqcjnjyuxp5af7pcrbl56w2g33zpcecppzzrddyuce4zka"
      "network_configuration_category" = "shared"
      "route_rules" = tolist([])
      "route_table_key" = "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_P-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.31 +0000 UTC"
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_SB-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({
        "CCA_Basic_Tag.email" = "oracleidentitycloudservice/firstname.lastname@email.com"
      })
      "display_name" = "Default Route Table for vcn_frankfurt_oe01_sb"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaae3cdkkqk3sc6vgiu234aop4m6qyzr3j3zlycipr7cd7jkebsiskq"
      "network_configuration_category" = "shared"
      "route_rules" = tolist([])
      "route_table_key" = "DEFAULT_ROUTE_TABLE_FOR_VCN_FRANKFURT_OE01_SB-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.309 +0000 UTC"
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "RT-01-OE01-CO-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_01_oe01_co_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaafzxxcuy6igxnegh6d47aauxkavinspzrschxdedqbnvqc3ctj64a"
      "network_configuration_category" = "shared"
      "route_rules" = toset([])
      "route_table_key" = "RT-01-OE01-CO-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:48.57 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "RT-01-OE01-DEV-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_01_oe01_dev_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaabrze6dv2n4mlv4tbiaf4rp5kimlkthp7zarq5wrjlbis36cxexmq"
      "network_configuration_category" = "shared"
      "route_rules" = toset([])
      "route_table_key" = "RT-01-OE01-DEV-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:47.773 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "RT-01-OE01-NP-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_01_oe01_np_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaqfojgyjq3te73kiletpyhisrwiycmvtdiddwsxhui2beq7ddip5a"
      "network_configuration_category" = "shared"
      "route_rules" = toset([])
      "route_table_key" = "RT-01-OE01-NP-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:47.783 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "RT-01-OE01-P-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_01_oe01_p_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa3dlum5c6ak2ct5pspx6upchakvevaankjlflhi4c3damk4oul77a"
      "network_configuration_category" = "shared"
      "route_rules" = toset([])
      "route_table_key" = "RT-01-OE01-P-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:48.515 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "RT-01-OE01-SB-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_01_oe01_sb_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaayfwjrwzhxyubzqqqmxaph3np25tbzgsmrzxfbqtgydsnbxksfvbq"
      "network_configuration_category" = "shared"
      "route_rules" = toset([])
      "route_table_key" = "RT-01-OE01-SB-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:47.887 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "RT-02-OE01-CO-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_02_oe01_co_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "network_configuration_category" = "shared"
      "route_rules" = toset([
        {
          "cidr_block" = ""
          "description" = "Route for sgw"
          "destination" = "oci-fra-objectstorage"
          "destination_type" = "SERVICE_CIDR_BLOCK"
          "network_entity_id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaaemv7q4vqsnsdywjiezxnr35ntdqbwyqjsgswgwowrvtkusxl56jq"
          "route_type" = ""
        },
      ])
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:47.911 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "RT-02-OE01-DEV-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_02_oe01_dev_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "network_configuration_category" = "shared"
      "route_rules" = toset([
        {
          "cidr_block" = ""
          "description" = "Route for sgw"
          "destination" = "oci-fra-objectstorage"
          "destination_type" = "SERVICE_CIDR_BLOCK"
          "network_entity_id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaabaiurkmcfywts5fa3qx32t2dxkdsm6cag2vzac6ydaeneu5nxwba"
          "route_type" = ""
        },
      ])
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:47.873 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "RT-02-OE01-NP-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_02_oe01_np_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "network_configuration_category" = "shared"
      "route_rules" = toset([
        {
          "cidr_block" = ""
          "description" = "Route for sgw"
          "destination" = "oci-fra-objectstorage"
          "destination_type" = "SERVICE_CIDR_BLOCK"
          "network_entity_id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaawwzqzkl2gaa6hszf5mcxf5f5qu7sgiu7qmiuynxuuh5to3ph7d5a"
          "route_type" = ""
        },
      ])
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:48.067 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "RT-02-OE01-P-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_02_oe01_p_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "network_configuration_category" = "shared"
      "route_rules" = toset([
        {
          "cidr_block" = ""
          "description" = "Route for sgw"
          "destination" = "oci-fra-objectstorage"
          "destination_type" = "SERVICE_CIDR_BLOCK"
          "network_entity_id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaa7rsnj3gpd23qfir65yszym2mnhzocvssmq5mth5aygnk4spvhilq"
          "route_type" = ""
        },
      ])
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:48.68 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "RT-02-OE01-SB-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "rt_02_oe01_sb_vcn"
      "freeform_tags" = tomap({})
      "id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "network_configuration_category" = "shared"
      "route_rules" = toset([
        {
          "cidr_block" = ""
          "description" = "Route for sgw"
          "destination" = "oci-fra-objectstorage"
          "destination_type" = "SERVICE_CIDR_BLOCK"
          "network_entity_id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaajtqdojowxymjtgdfqffttvomff6elgtulv66svm72j65wgdxeqjq"
          "route_type" = ""
        },
      ])
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:23:47.89 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "route_tables_attachments" = {
    "SN-FRANKFURT-OE01-CO-DNS" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaavy3slkym6yfuijvhvaynoml6x2cvxoc76ekedzwort2xxrr35pfq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-CO-DNS"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaavy3slkym6yfuijvhvaynoml6x2cvxoc76ekedzwort2xxrr35pfq"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-DNS"
      "subnet_name" = "sn_frankfurt_oe01_co_dns"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SN-FRANKFURT-OE01-CO-FW-EW-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaai7cm6ulbuzvbthi54smbvrlmv7ogmdb7iyf4hjgcnrxnmtkzefxa/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-CO-FW-EW-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaai7cm6ulbuzvbthi54smbvrlmv7ogmdb7iyf4hjgcnrxnmtkzefxa"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-FW-EW-KEY"
      "subnet_name" = "sn_frankfurt_oe01_co_fw_ew"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SN-FRANKFURT-OE01-CO-LOGS-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaapyoetmyw5ekrnqbpqrc32rk7pj23jkkmkvqkfoh66a7wn6kdstzq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-CO-LOGS-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaapyoetmyw5ekrnqbpqrc32rk7pj23jkkmkvqkfoh66a7wn6kdstzq"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-LOGS-KEY"
      "subnet_name" = "sn_frankfurt_oe01_co_logs"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SN-FRANKFURT-OE01-CO-MGMT-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaarqmieajqtmtrjydjvipl2fcekachbr75sktemeainvy6aewmds2a/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-CO-MGMT-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaarqmieajqtmtrjydjvipl2fcekachbr75sktemeainvy6aewmds2a"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-MGMT-KEY"
      "subnet_name" = "sn_frankfurt_oe01_co_mgmt"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SN-FRANKFURT-OE01-DEV-DNS" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaalunu6q3cuiuds2vzsxl5qcwalwa45nqviduv4m6kys4nnajaefpa/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-DEV-DNS"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaalunu6q3cuiuds2vzsxl5qcwalwa45nqviduv4m6kys4nnajaefpa"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-DNS"
      "subnet_name" = "sn_frankfurt_oe01_dev_dns"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SN-FRANKFURT-OE01-DEV-FW-EW-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaehambgml36mqepvkujuyud6vlmq5he6jezymxcqngcjvygq4gocq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-DEV-FW-EW-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaehambgml36mqepvkujuyud6vlmq5he6jezymxcqngcjvygq4gocq"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-FW-EW-KEY"
      "subnet_name" = "sn_frankfurt_oe01_dev_fw_ew"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SN-FRANKFURT-OE01-DEV-LOGS-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaoq4vpombu2fek75cb2umcsl2onigsjzr67vnvj4h4mrsmvewfdnq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-DEV-LOGS-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaoq4vpombu2fek75cb2umcsl2onigsjzr67vnvj4h4mrsmvewfdnq"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-LOGS-KEY"
      "subnet_name" = "sn_frankfurt_oe01_co_logs"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SN-FRANKFURT-OE01-DEV-MGMT-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaagkfrusuzuucecygm3h7oz3po4ttzcsnellizyutcb3e5z6m5wqea/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-DEV-MGMT-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaagkfrusuzuucecygm3h7oz3po4ttzcsnellizyutcb3e5z6m5wqea"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-MGMT-KEY"
      "subnet_name" = "sn_frankfurt_oe01_dev_mgmt"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SN-FRANKFURT-OE01-NP-DNS" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaat7wwbwumaisswcfkmjef66kqpvhb4fsj6sruhd26q2ia72nj2baq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-NP-DNS"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaat7wwbwumaisswcfkmjef66kqpvhb4fsj6sruhd26q2ia72nj2baq"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-DNS"
      "subnet_name" = "sn_frankfurt_oe01_np_dns"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SN-FRANKFURT-OE01-NP-FW-EW-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaalxnk3gubgmb44tnlphdmmi55mfj7qke3ufepintv5pu7r5rdbkta/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-NP-FW-EW-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaalxnk3gubgmb44tnlphdmmi55mfj7qke3ufepintv5pu7r5rdbkta"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-FW-EW-KEY"
      "subnet_name" = "sn_frankfurt_oe01_np_fw_ew"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SN-FRANKFURT-OE01-NP-LOGS-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaqqxs4pt3ha2pnlv3axfhx6z3yhegozr7l7zrlkvuf3whtezzh4fq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-NP-LOGS-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaqqxs4pt3ha2pnlv3axfhx6z3yhegozr7l7zrlkvuf3whtezzh4fq"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-LOGS-KEY"
      "subnet_name" = "sn_frankfurt_oe01_np_logs"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SN-FRANKFURT-OE01-NP-MGMT-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaazib4ayolk64oirhu33x6g2q2daboycycdw2tybofymkie5x7hlwq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-NP-MGMT-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaazib4ayolk64oirhu33x6g2q2daboycycdw2tybofymkie5x7hlwq"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-MGMT-KEY"
      "subnet_name" = "sn_frankfurt_oe01_np_mgmt"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SN-FRANKFURT-OE01-P-DNS" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaapd4aglnqmkgo6tsjdtww5aq64gmm6qh2rfajqefr6hz5apubcggq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-P-DNS"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaapd4aglnqmkgo6tsjdtww5aq64gmm6qh2rfajqefr6hz5apubcggq"
      "subnet_key" = "SN-FRANKFURT-OE01-P-DNS"
      "subnet_name" = "sn_frankfurt_oe01_p_dns"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SN-FRANKFURT-OE01-P-FW-EW-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaauc5u7k2jmtq2blmftwqpd6lpcyxdflzjcz4b3jtohmub4oe2nhla/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-P-FW-EW-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaauc5u7k2jmtq2blmftwqpd6lpcyxdflzjcz4b3jtohmub4oe2nhla"
      "subnet_key" = "SN-FRANKFURT-OE01-P-FW-EW-KEY"
      "subnet_name" = "sn_frankfurt_oe01_p_fw_ew"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SN-FRANKFURT-OE01-P-LOGS-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaizbmmsetx45lafydi6wvgg6eswfmtsx4xp7azxro4cvp365i5jwa/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-P-LOGS-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaizbmmsetx45lafydi6wvgg6eswfmtsx4xp7azxro4cvp365i5jwa"
      "subnet_key" = "SN-FRANKFURT-OE01-P-LOGS-KEY"
      "subnet_name" = "sn_frankfurt_oe01_p_logs"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SN-FRANKFURT-OE01-P-MGMT-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaafll3jfutbs4pftvlzslnvpexum2cs42vcs57kys7ng5ilm3djxjq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-P-MGMT-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaafll3jfutbs4pftvlzslnvpexum2cs42vcs57kys7ng5ilm3djxjq"
      "subnet_key" = "SN-FRANKFURT-OE01-P-MGMT-KEY"
      "subnet_name" = "sn_frankfurt_oe01_p_mgmt"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SN-FRANKFURT-OE01-SB-DNS" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaazuyolssxh5n72iah6iu6qidq5as5jxfivttzhlsn6nudb7qlp65q/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-SB-DNS"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaazuyolssxh5n72iah6iu6qidq5as5jxfivttzhlsn6nudb7qlp65q"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-DNS"
      "subnet_name" = "sn_frankfurt_oe01_sb_dns"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "SN-FRANKFURT-OE01-SB-FW-EW-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaabbt4tz3gfe2z3ihjc2zmizlcsfl2yg3we5obhxaaqjvbarjg4ya/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-SB-FW-EW-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaabbt4tz3gfe2z3ihjc2zmizlcsfl2yg3we5obhxaaqjvbarjg4ya"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-FW-EW-KEY"
      "subnet_name" = "sn_frankfurt_oe01_sb_fw_ew"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "SN-FRANKFURT-OE01-SB-LOGS-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaaj2r7qdvdk7bl56ztdb35uxvpfvwhelgn4b5z3pyyyzyybk3kxtq/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-SB-LOGS-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaaj2r7qdvdk7bl56ztdb35uxvpfvwhelgn4b5z3pyyyzyybk3kxtq"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-LOGS-KEY"
      "subnet_name" = "sn_frankfurt_oe01_sb_logs"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "SN-FRANKFURT-OE01-SB-MGMT-KEY" = {
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaav3r6zbcayde5dvlsdqdzmlnnor4kiobwznzxabq5avvwgkv4tbea/ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "network_configuration_category" = "shared"
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "rta_key" = "SN-FRANKFURT-OE01-SB-MGMT-KEY"
      "subnet_id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaav3r6zbcayde5dvlsdqdzmlnnor4kiobwznzxabq5avvwgkv4tbea"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-MGMT-KEY"
      "subnet_name" = "sn_frankfurt_oe01_sb_mgmt"
      "timeouts" = null /* object */
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "security_lists" = {
    "SECLIST-01-OE01-CO-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_01_oe01_co_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over ALL protocols"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
        {
          "description" = "egress to 0.0.0.0/0 over any protocol"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaajdh5ofctbaaqvyuf7o5zedzquujojd5wy6ekmu4rk4pnceae53pq"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 22
              "min" = 22
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-01-OE01-CO-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.372 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SECLIST-01-OE01-DEV-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_01_oe01_dev_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over ALL protocols"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
        {
          "description" = "egress to 0.0.0.0/0 over any protocol"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaax5uu3bht62ldqd2ldbm2y34rirz7brzsa4fzcfhcumasspm4j2uq"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 22
              "min" = 22
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-01-OE01-DEV-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:59.503 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SECLIST-01-OE01-NP-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_01_oe01_np_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over ALL protocols"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
        {
          "description" = "egress to 0.0.0.0/0 over any protocol"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaaasmz53ieeqpsdt54asp3myzb3noiabhjs5t3dj5iqxibw47nrewa"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 22
              "min" = 22
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-01-OE01-NP-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.674 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SECLIST-01-OE01-P-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_01_oe01_p_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over ALL protocols"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
        {
          "description" = "egress to 0.0.0.0/0 over any protocol"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaag7tn2cv63hpnlski6ztsk27t2cz3t3wtr7sffsdtholvhj5neilq"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 22
              "min" = 22
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-01-OE01-P-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:59.211 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SECLIST-01-OE01-SB-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_01_oe01_sb_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over ALL protocols"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
        {
          "description" = "egress to 0.0.0.0/0 over any protocol"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "all"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaatryqryiznxhhcypvwvozubv5jjd72fei4tlrf462vbp73ymsryra"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 22
              "min" = 22
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-01-OE01-SB-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:59.25 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
    "SECLIST-02-OE01-CO-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_02_oe01_co_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over TCP"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaakf7dp42lsfmj2zzuys3fvxxy3zeolbtkipljixtvvhnjrkjxucsa"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over HTTP8080"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 80
              "min" = 80
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-02-OE01-CO-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:59.507 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SECLIST-02-OE01-DEV-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_02_oe01_dev_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over TCP"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalpzo3o6wmpoochrxxhskvvlhc4wpstxrbemlmmgfjj2bmevhgvra"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over HTTP8080"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 80
              "min" = 80
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-02-OE01-DEV-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.756 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SECLIST-02-OE01-NP-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_02_oe01_np_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over TCP"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaai2smznl3cvyxm2q3xzsxwpiu34n3rugj5skh2tvcrkgjvvcv7hpq"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over HTTP8080"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 80
              "min" = 80
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-02-OE01-NP-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.514 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SECLIST-02-OE01-P-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_02_oe01_p_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over TCP"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalg4u2wtlcnsvtkwehmx3fwcd5aowlkg4gxecmflm2wlwo5parrya"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over HTTP8080"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 80
              "min" = 80
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-02-OE01-P-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.554 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SECLIST-02-OE01-SB-VCN-KEY" = {
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "seclist_02_oe01_sb_vcn"
      "egress_security_rules" = toset([
        {
          "description" = "egress to 0.0.0.0/0 over TCP"
          "destination" = "0.0.0.0/0"
          "destination_type" = "CIDR_BLOCK"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "freeform_tags" = tomap({})
      "id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaavjtytmhvmbeafija4i3kexsgezoi25fa2voppfhrt5huhklo6mfq"
      "ingress_security_rules" = toset([
        {
          "description" = "ingress from 0.0.0.0/0 over HTTP8080"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([
            {
              "max" = 80
              "min" = 80
              "source_port_range" = tolist([])
            },
          ])
          "udp_options" = tolist([])
        },
        {
          "description" = "ingress from 0.0.0.0/0 over TCP22"
          "icmp_options" = tolist([])
          "protocol" = "6"
          "source" = "0.0.0.0/0"
          "source_type" = "CIDR_BLOCK"
          "stateless" = false
          "tcp_options" = tolist([])
          "udp_options" = tolist([])
        },
      ])
      "network_configuration_category" = "shared"
      "sec_list_key" = "SECLIST-02-OE01-SB-VCN-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:58.444 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "service_gateways" = {
    "SG-FRANKFURT-OE01-CO-KEY" = {
      "block_traffic" = false
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "sg_frankfurt_oe01_co"
      "freeform_tags" = tomap({})
      "id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaaemv7q4vqsnsdywjiezxnr35ntdqbwyqjsgswgwowrvtkusxl56jq"
      "network_configuration_category" = "shared"
      "route_table_id" = tostring(null)
      "route_table_key" = tostring(null)
      "route_table_name" = null
      "services" = toset([
        {
          "service_id" = "ocid1.service.oc1.eu-frankfurt-1.aaaaaaaalblrg4eycfxwohulzwwq63btwptzs2hva3muxfan5ro5x7glehtq"
          "service_name" = "OCI FRA Object Storage"
        },
      ])
      "sgw-key" = "SG-FRANKFURT-OE01-CO-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.246 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
    }
    "SG-FRANKFURT-OE01-DEV-KEY" = {
      "block_traffic" = false
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "sg_frankfurt_oe01_dev"
      "freeform_tags" = tomap({})
      "id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaabaiurkmcfywts5fa3qx32t2dxkdsm6cag2vzac6ydaeneu5nxwba"
      "network_configuration_category" = "shared"
      "route_table_id" = tostring(null)
      "route_table_key" = tostring(null)
      "route_table_name" = null
      "services" = toset([
        {
          "service_id" = "ocid1.service.oc1.eu-frankfurt-1.aaaaaaaalblrg4eycfxwohulzwwq63btwptzs2hva3muxfan5ro5x7glehtq"
          "service_name" = "OCI FRA Object Storage"
        },
      ])
      "sgw-key" = "SG-FRANKFURT-OE01-DEV-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.509 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
    }
    "SG-FRANKFURT-OE01-NP-KEY" = {
      "block_traffic" = false
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "sg_frankfurt_oe01_np"
      "freeform_tags" = tomap({})
      "id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaawwzqzkl2gaa6hszf5mcxf5f5qu7sgiu7qmiuynxuuh5to3ph7d5a"
      "network_configuration_category" = "shared"
      "route_table_id" = tostring(null)
      "route_table_key" = tostring(null)
      "route_table_name" = null
      "services" = toset([
        {
          "service_id" = "ocid1.service.oc1.eu-frankfurt-1.aaaaaaaalblrg4eycfxwohulzwwq63btwptzs2hva3muxfan5ro5x7glehtq"
          "service_name" = "OCI FRA Object Storage"
        },
      ])
      "sgw-key" = "SG-FRANKFURT-OE01-NP-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.525 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
    }
    "SG-FRANKFURT-OE01-P-KEY" = {
      "block_traffic" = false
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "sg_frankfurt_oe01_p"
      "freeform_tags" = tomap({})
      "id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaa7rsnj3gpd23qfir65yszym2mnhzocvssmq5mth5aygnk4spvhilq"
      "network_configuration_category" = "shared"
      "route_table_id" = tostring(null)
      "route_table_key" = tostring(null)
      "route_table_name" = null
      "services" = toset([
        {
          "service_id" = "ocid1.service.oc1.eu-frankfurt-1.aaaaaaaalblrg4eycfxwohulzwwq63btwptzs2hva3muxfan5ro5x7glehtq"
          "service_name" = "OCI FRA Object Storage"
        },
      ])
      "sgw-key" = "SG-FRANKFURT-OE01-P-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.474 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
    }
    "SG-FRANKFURT-OE01-SB-KEY" = {
      "block_traffic" = false
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "display_name" = "sg_frankfurt_oe01_sb"
      "freeform_tags" = tomap({})
      "id" = "ocid1.servicegateway.oc1.eu-frankfurt-1.aaaaaaaajtqdojowxymjtgdfqffttvomff6elgtulv66svm72j65wgdxeqjq"
      "network_configuration_category" = "shared"
      "route_table_id" = tostring(null)
      "route_table_key" = tostring(null)
      "route_table_name" = null
      "services" = toset([
        {
          "service_id" = "ocid1.service.oc1.eu-frankfurt-1.aaaaaaaalblrg4eycfxwohulzwwq63btwptzs2hva3muxfan5ro5x7glehtq"
          "service_name" = "OCI FRA Object Storage"
        },
      ])
      "sgw-key" = "SG-FRANKFURT-OE01-SB-KEY"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:56.114 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
    }
  }
  "subnets" = {
    "SN-FRANKFURT-OE01-CO-DNS" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.1.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa3iqvjcqpatmvmjuhg7wqpl33kumcovjpsm3sq2ce532gaoo4zpca"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_co_dns"
      "dns_label" = "oe01codns"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaavy3slkym6yfuijvhvaynoml6x2cvxoc76ekedzwort2xxrr35pfq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaakf7dp42lsfmj2zzuys3fvxxy3zeolbtkipljixtvvhnjrkjxucsa" = {
          "display_name" = "seclist_02_oe01_co_vcn"
          "sec_list_key" = "SECLIST-02-OE01-CO-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01codns.oe01co.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-DNS"
      "time_created" = "2023-06-12 10:18:02.623 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
      "virtual_router_ip" = "172.168.1.129"
      "virtual_router_mac" = "00:00:17:0F:7E:39"
    }
    "SN-FRANKFURT-OE01-CO-FW-EW-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.0.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa3iqvjcqpatmvmjuhg7wqpl33kumcovjpsm3sq2ce532gaoo4zpca"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_co_fw_ew"
      "dns_label" = "oe01cofwew"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaai7cm6ulbuzvbthi54smbvrlmv7ogmdb7iyf4hjgcnrxnmtkzefxa"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaakf7dp42lsfmj2zzuys3fvxxy3zeolbtkipljixtvvhnjrkjxucsa" = {
          "display_name" = "seclist_02_oe01_co_vcn"
          "sec_list_key" = "SECLIST-02-OE01-CO-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01cofwew.oe01co.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-FW-EW-KEY"
      "time_created" = "2023-06-12 10:18:04.957 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
      "virtual_router_ip" = "172.168.0.1"
      "virtual_router_mac" = "00:00:17:0F:7E:39"
    }
    "SN-FRANKFURT-OE01-CO-LOGS-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.1.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa3iqvjcqpatmvmjuhg7wqpl33kumcovjpsm3sq2ce532gaoo4zpca"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_co_logs"
      "dns_label" = "oe01cologs"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaapyoetmyw5ekrnqbpqrc32rk7pj23jkkmkvqkfoh66a7wn6kdstzq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaakf7dp42lsfmj2zzuys3fvxxy3zeolbtkipljixtvvhnjrkjxucsa" = {
          "display_name" = "seclist_02_oe01_co_vcn"
          "sec_list_key" = "SECLIST-02-OE01-CO-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01cologs.oe01co.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-LOGS-KEY"
      "time_created" = "2023-06-12 10:18:02.942 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
      "virtual_router_ip" = "172.168.1.1"
      "virtual_router_mac" = "00:00:17:0F:7E:39"
    }
    "SN-FRANKFURT-OE01-CO-MGMT-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.0.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa3iqvjcqpatmvmjuhg7wqpl33kumcovjpsm3sq2ce532gaoo4zpca"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_co_mgmt"
      "dns_label" = "oe01comgmt"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaarqmieajqtmtrjydjvipl2fcekachbr75sktemeainvy6aewmds2a"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6hyn4gn6kt7tvjuzf6rtw3oq5nkb6oais3hzcneg2kosxu3am6yq"
      "route_table_key" = "RT-02-OE01-CO-VCN-KEY"
      "route_table_name" = "rt_02_oe01_co_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaakf7dp42lsfmj2zzuys3fvxxy3zeolbtkipljixtvvhnjrkjxucsa" = {
          "display_name" = "seclist_02_oe01_co_vcn"
          "sec_list_key" = "SECLIST-02-OE01-CO-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01comgmt.oe01co.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-CO-MGMT-KEY"
      "time_created" = "2023-06-12 10:18:04.554 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_co"
      "virtual_router_ip" = "172.168.0.129"
      "virtual_router_mac" = "00:00:17:0F:7E:39"
    }
    "SN-FRANKFURT-OE01-DEV-DNS" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.3.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazbzalamlrllbujexjmqzjy7uooe5xfdmuh6isbebp2mkqmsgeopa"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_dev_dns"
      "dns_label" = "oe01devdns"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaalunu6q3cuiuds2vzsxl5qcwalwa45nqviduv4m6kys4nnajaefpa"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalpzo3o6wmpoochrxxhskvvlhc4wpstxrbemlmmgfjj2bmevhgvra" = {
          "display_name" = "seclist_02_oe01_dev_vcn"
          "sec_list_key" = "SECLIST-02-OE01-DEV-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01devdns.oe01dev.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-DNS"
      "time_created" = "2023-06-12 10:18:06.285 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
      "virtual_router_ip" = "172.168.3.129"
      "virtual_router_mac" = "00:00:17:5A:63:D4"
    }
    "SN-FRANKFURT-OE01-DEV-FW-EW-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.2.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazbzalamlrllbujexjmqzjy7uooe5xfdmuh6isbebp2mkqmsgeopa"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_dev_fw_ew"
      "dns_label" = "oe01devfwew"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaehambgml36mqepvkujuyud6vlmq5he6jezymxcqngcjvygq4gocq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalpzo3o6wmpoochrxxhskvvlhc4wpstxrbemlmmgfjj2bmevhgvra" = {
          "display_name" = "seclist_02_oe01_dev_vcn"
          "sec_list_key" = "SECLIST-02-OE01-DEV-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01devfwew.oe01dev.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-FW-EW-KEY"
      "time_created" = "2023-06-12 10:18:05.943 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
      "virtual_router_ip" = "172.168.2.1"
      "virtual_router_mac" = "00:00:17:5A:63:D4"
    }
    "SN-FRANKFURT-OE01-DEV-LOGS-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.3.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazbzalamlrllbujexjmqzjy7uooe5xfdmuh6isbebp2mkqmsgeopa"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_co_logs"
      "dns_label" = "oe01devlogs"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaoq4vpombu2fek75cb2umcsl2onigsjzr67vnvj4h4mrsmvewfdnq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalpzo3o6wmpoochrxxhskvvlhc4wpstxrbemlmmgfjj2bmevhgvra" = {
          "display_name" = "seclist_02_oe01_dev_vcn"
          "sec_list_key" = "SECLIST-02-OE01-DEV-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01devlogs.oe01dev.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-LOGS-KEY"
      "time_created" = "2023-06-12 10:18:05.481 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
      "virtual_router_ip" = "172.168.3.1"
      "virtual_router_mac" = "00:00:17:5A:63:D4"
    }
    "SN-FRANKFURT-OE01-DEV-MGMT-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.2.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazbzalamlrllbujexjmqzjy7uooe5xfdmuh6isbebp2mkqmsgeopa"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_dev_mgmt"
      "dns_label" = "oe01devmgmt"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaagkfrusuzuucecygm3h7oz3po4ttzcsnellizyutcb3e5z6m5wqea"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaar77qqzumjt2mj3oahpr2dd65khqd6g7aatv3yfltuinr2cdbpata"
      "route_table_key" = "RT-02-OE01-DEV-VCN-KEY"
      "route_table_name" = "rt_02_oe01_dev_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalpzo3o6wmpoochrxxhskvvlhc4wpstxrbemlmmgfjj2bmevhgvra" = {
          "display_name" = "seclist_02_oe01_dev_vcn"
          "sec_list_key" = "SECLIST-02-OE01-DEV-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01devmgmt.oe01dev.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-DEV-MGMT-KEY"
      "time_created" = "2023-06-12 10:18:02.334 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_dev"
      "virtual_router_ip" = "172.168.2.129"
      "virtual_router_mac" = "00:00:17:5A:63:D4"
    }
    "SN-FRANKFURT-OE01-NP-DNS" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.5.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazblkift77zeouwqbsthm6qg27cc235zszgapwhieurmwvlpsynra"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_np_dns"
      "dns_label" = "oe01npdns"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaat7wwbwumaisswcfkmjef66kqpvhb4fsj6sruhd26q2ia72nj2baq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaai2smznl3cvyxm2q3xzsxwpiu34n3rugj5skh2tvcrkgjvvcv7hpq" = {
          "display_name" = "seclist_02_oe01_np_vcn"
          "sec_list_key" = "SECLIST-02-OE01-NP-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01npdns.oe01np.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-DNS"
      "time_created" = "2023-06-12 10:18:05.186 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
      "virtual_router_ip" = "172.168.5.129"
      "virtual_router_mac" = "00:00:17:AE:0D:79"
    }
    "SN-FRANKFURT-OE01-NP-FW-EW-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.4.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazblkift77zeouwqbsthm6qg27cc235zszgapwhieurmwvlpsynra"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_np_fw_ew"
      "dns_label" = "oe01npfwew"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaalxnk3gubgmb44tnlphdmmi55mfj7qke3ufepintv5pu7r5rdbkta"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaai2smznl3cvyxm2q3xzsxwpiu34n3rugj5skh2tvcrkgjvvcv7hpq" = {
          "display_name" = "seclist_02_oe01_np_vcn"
          "sec_list_key" = "SECLIST-02-OE01-NP-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01npfwew.oe01np.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-FW-EW-KEY"
      "time_created" = "2023-06-12 10:18:02.625 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
      "virtual_router_ip" = "172.168.4.1"
      "virtual_router_mac" = "00:00:17:AE:0D:79"
    }
    "SN-FRANKFURT-OE01-NP-LOGS-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.5.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazblkift77zeouwqbsthm6qg27cc235zszgapwhieurmwvlpsynra"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_np_logs"
      "dns_label" = "oe01nplogs"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaqqxs4pt3ha2pnlv3axfhx6z3yhegozr7l7zrlkvuf3whtezzh4fq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaai2smznl3cvyxm2q3xzsxwpiu34n3rugj5skh2tvcrkgjvvcv7hpq" = {
          "display_name" = "seclist_02_oe01_np_vcn"
          "sec_list_key" = "SECLIST-02-OE01-NP-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01nplogs.oe01np.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-LOGS-KEY"
      "time_created" = "2023-06-12 10:18:01.672 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
      "virtual_router_ip" = "172.168.5.1"
      "virtual_router_mac" = "00:00:17:AE:0D:79"
    }
    "SN-FRANKFURT-OE01-NP-MGMT-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.4.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazblkift77zeouwqbsthm6qg27cc235zszgapwhieurmwvlpsynra"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_np_mgmt"
      "dns_label" = "oe01npmgmt"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaazib4ayolk64oirhu33x6g2q2daboycycdw2tybofymkie5x7hlwq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaazqvnykovcg26ghg42qhiaepndprdugzmllldnuar5wm3f4eumb3a"
      "route_table_key" = "RT-02-OE01-NP-VCN-KEY"
      "route_table_name" = "rt_02_oe01_np_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaai2smznl3cvyxm2q3xzsxwpiu34n3rugj5skh2tvcrkgjvvcv7hpq" = {
          "display_name" = "seclist_02_oe01_np_vcn"
          "sec_list_key" = "SECLIST-02-OE01-NP-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01npmgmt.oe01np.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-NP-MGMT-KEY"
      "time_created" = "2023-06-12 10:18:02.182 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_np"
      "virtual_router_ip" = "172.168.4.129"
      "virtual_router_mac" = "00:00:17:AE:0D:79"
    }
    "SN-FRANKFURT-OE01-P-DNS" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.7.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagq2oefacf3wgjeupy224lhafurqqzhsbn3wzvmrcuim7no7bw3aq"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_p_dns"
      "dns_label" = "oe01pdns"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaapd4aglnqmkgo6tsjdtww5aq64gmm6qh2rfajqefr6hz5apubcggq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalg4u2wtlcnsvtkwehmx3fwcd5aowlkg4gxecmflm2wlwo5parrya" = {
          "display_name" = "seclist_02_oe01_p_vcn"
          "sec_list_key" = "SECLIST-02-OE01-P-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01pdns.oe01p.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-P-DNS"
      "time_created" = "2023-06-12 10:18:02.275 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
      "virtual_router_ip" = "172.168.7.129"
      "virtual_router_mac" = "00:00:17:21:8F:CD"
    }
    "SN-FRANKFURT-OE01-P-FW-EW-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.6.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagq2oefacf3wgjeupy224lhafurqqzhsbn3wzvmrcuim7no7bw3aq"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_p_fw_ew"
      "dns_label" = "oe01pfwew"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaauc5u7k2jmtq2blmftwqpd6lpcyxdflzjcz4b3jtohmub4oe2nhla"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalg4u2wtlcnsvtkwehmx3fwcd5aowlkg4gxecmflm2wlwo5parrya" = {
          "display_name" = "seclist_02_oe01_p_vcn"
          "sec_list_key" = "SECLIST-02-OE01-P-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01pfwew.oe01p.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-P-FW-EW-KEY"
      "time_created" = "2023-06-12 10:18:01.847 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
      "virtual_router_ip" = "172.168.6.1"
      "virtual_router_mac" = "00:00:17:21:8F:CD"
    }
    "SN-FRANKFURT-OE01-P-LOGS-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.7.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagq2oefacf3wgjeupy224lhafurqqzhsbn3wzvmrcuim7no7bw3aq"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_p_logs"
      "dns_label" = "oe01plogs"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaizbmmsetx45lafydi6wvgg6eswfmtsx4xp7azxro4cvp365i5jwa"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalg4u2wtlcnsvtkwehmx3fwcd5aowlkg4gxecmflm2wlwo5parrya" = {
          "display_name" = "seclist_02_oe01_p_vcn"
          "sec_list_key" = "SECLIST-02-OE01-P-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01plogs.oe01p.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-P-LOGS-KEY"
      "time_created" = "2023-06-12 10:18:06.21 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
      "virtual_router_ip" = "172.168.7.1"
      "virtual_router_mac" = "00:00:17:21:8F:CD"
    }
    "SN-FRANKFURT-OE01-P-MGMT-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.6.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagq2oefacf3wgjeupy224lhafurqqzhsbn3wzvmrcuim7no7bw3aq"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_p_mgmt"
      "dns_label" = "oe01pmgmt"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaafll3jfutbs4pftvlzslnvpexum2cs42vcs57kys7ng5ilm3djxjq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaegfyruxhscoyfeqewd6jsnrfqmpptqzs75msbxozt6byw7bj6wkq"
      "route_table_key" = "RT-02-OE01-P-VCN-KEY"
      "route_table_name" = "rt_02_oe01_p_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaalg4u2wtlcnsvtkwehmx3fwcd5aowlkg4gxecmflm2wlwo5parrya" = {
          "display_name" = "seclist_02_oe01_p_vcn"
          "sec_list_key" = "SECLIST-02-OE01-P-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01pmgmt.oe01p.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-P-MGMT-KEY"
      "time_created" = "2023-06-12 10:18:05.845 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_p"
      "virtual_router_ip" = "172.168.6.129"
      "virtual_router_mac" = "00:00:17:21:8F:CD"
    }
    "SN-FRANKFURT-OE01-SB-DNS" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.9.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaahae6ekjvya7o7bwbldz7awtyhdxuqjnoq57idko4azlttt3usdna"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_sb_dns"
      "dns_label" = "oe01sbdns"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaazuyolssxh5n72iah6iu6qidq5as5jxfivttzhlsn6nudb7qlp65q"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaavjtytmhvmbeafija4i3kexsgezoi25fa2voppfhrt5huhklo6mfq" = {
          "display_name" = "seclist_02_oe01_sb_vcn"
          "sec_list_key" = "SECLIST-02-OE01-SB-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01sbdns.oe01sb.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-DNS"
      "time_created" = "2023-06-12 10:25:00.693 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
      "virtual_router_ip" = "172.168.9.129"
      "virtual_router_mac" = "00:00:17:25:82:49"
    }
    "SN-FRANKFURT-OE01-SB-FW-EW-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.8.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaahae6ekjvya7o7bwbldz7awtyhdxuqjnoq57idko4azlttt3usdna"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_sb_fw_ew"
      "dns_label" = "oe01sbfwew"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaabbt4tz3gfe2z3ihjc2zmizlcsfl2yg3we5obhxaaqjvbarjg4ya"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaavjtytmhvmbeafija4i3kexsgezoi25fa2voppfhrt5huhklo6mfq" = {
          "display_name" = "seclist_02_oe01_sb_vcn"
          "sec_list_key" = "SECLIST-02-OE01-SB-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01sbfwew.oe01sb.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-FW-EW-KEY"
      "time_created" = "2023-06-12 10:24:59.776 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
      "virtual_router_ip" = "172.168.8.1"
      "virtual_router_mac" = "00:00:17:25:82:49"
    }
    "SN-FRANKFURT-OE01-SB-LOGS-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.9.0/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaahae6ekjvya7o7bwbldz7awtyhdxuqjnoq57idko4azlttt3usdna"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_sb_logs"
      "dns_label" = "oe01sblogs"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaaaj2r7qdvdk7bl56ztdb35uxvpfvwhelgn4b5z3pyyyzyybk3kxtq"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaavjtytmhvmbeafija4i3kexsgezoi25fa2voppfhrt5huhklo6mfq" = {
          "display_name" = "seclist_02_oe01_sb_vcn"
          "sec_list_key" = "SECLIST-02-OE01-SB-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01sblogs.oe01sb.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-LOGS-KEY"
      "time_created" = "2023-06-12 10:24:59.495 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
      "virtual_router_ip" = "172.168.9.1"
      "virtual_router_mac" = "00:00:17:25:82:49"
    }
    "SN-FRANKFURT-OE01-SB-MGMT-KEY" = {
      "availability_domain" = tostring(null)
      "cidr_block" = "172.168.8.128/25"
      "compartment_id" = "ocid1.compartment.oc1..."
      "defined_tags" = tomap({})
      "dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaahae6ekjvya7o7bwbldz7awtyhdxuqjnoq57idko4azlttt3usdna"
      "dhcp_options_key" = "default_dhcp_options"
      "dhcp_options_name" = "default_dhcp_options"
      "display_name" = "sn_frankfurt_oe01_sb_mgmt"
      "dns_label" = "oe01sbmgmt"
      "freeform_tags" = tomap({})
      "id" = "ocid1.subnet.oc1.eu-frankfurt-1.aaaaaaaav3r6zbcayde5dvlsdqdzmlnnor4kiobwznzxabq5avvwgkv4tbea"
      "ipv6cidr_block" = tostring(null)
      "ipv6cidr_blocks" = tolist([])
      "ipv6virtual_router_ip" = tostring(null)
      "network_configuration_category" = "shared"
      "prohibit_internet_ingress" = true
      "prohibit_public_ip_on_vnic" = true
      "route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaajev2lutigtdndfoqytrxyfr5gga532ufabvg4r4c3isbdtu6sltq"
      "route_table_key" = "RT-02-OE01-SB-VCN-KEY"
      "route_table_name" = "rt_02_oe01_sb_vcn"
      "security_lists" = {
        "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaavjtytmhvmbeafija4i3kexsgezoi25fa2voppfhrt5huhklo6mfq" = {
          "display_name" = "seclist_02_oe01_sb_vcn"
          "sec_list_key" = "SECLIST-02-OE01-SB-VCN-KEY"
        }
      }
      "state" = "AVAILABLE"
      "subnet_domain_name" = "oe01sbmgmt.oe01sb.oraclevcn.com"
      "subnet_key" = "SN-FRANKFURT-OE01-SB-MGMT-KEY"
      "time_created" = "2023-06-12 10:25:00.159 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
      "vcn_name" = "vcn_frankfurt_oe01_sb"
      "virtual_router_ip" = "172.168.8.129"
      "virtual_router_mac" = "00:00:17:25:82:49"
    }
  }
  "vcns" = {
    "VCN-FRANKFURT-OE01-CO-KEY" = {
      "byoipv6cidr_blocks" = tolist([])
      "byoipv6cidr_details" = tolist([])
      "cidr_block" = "172.168.0.0/23"
      "cidr_blocks" = tolist([
        "172.168.0.0/23",
      ])
      "compartment_id" = "ocid1.compartment.oc1..."
      "default_dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaa3iqvjcqpatmvmjuhg7wqpl33kumcovjpsm3sq2ce532gaoo4zpca"
      "default_route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaatjdlucyb7o3ijstm2nbh5mh4y5pgbo57algsjmcohhbd5ponsoha"
      "default_security_list_id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaarmhkm76xingmjvpkfczwluh6sm23plaa7na5riz5hgjurkxmfaxq"
      "defined_tags" = tomap({})
      "display_name" = "vcn_frankfurt_oe01_co"
      "dns_label" = "oe01co"
      "freeform_tags" = tomap({})
      "id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiaouydby64s44jgxwmreqsnfnwv2j36iwkrytkqagxlq6q"
      "ipv6cidr_blocks" = tolist([])
      "ipv6private_cidr_blocks" = tolist([])
      "is_ipv6enabled" = false
      "is_oracle_gua_allocation_enabled" = tobool(null)
      "network_configuration_category" = "shared"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.371 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_domain_name" = "oe01co.oraclevcn.com"
      "vcn_key" = "VCN-FRANKFURT-OE01-CO-KEY"
    }
    "VCN-FRANKFURT-OE01-DEV-KEY" = {
      "byoipv6cidr_blocks" = tolist([])
      "byoipv6cidr_details" = tolist([])
      "cidr_block" = "172.168.2.0/23"
      "cidr_blocks" = tolist([
        "172.168.2.0/23",
      ])
      "compartment_id" = "ocid1.compartment.oc1..."
      "default_dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazbzalamlrllbujexjmqzjy7uooe5xfdmuh6isbebp2mkqmsgeopa"
      "default_route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaabxjmltkiwhplk52pouu5eraokoqfzmuu56rgwnmaehmx7kj6uvva"
      "default_security_list_id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaazt63o34o6p3krai3sm2gmsthhjewjttjpeqr2gbxjhmvvccralqa"
      "defined_tags" = tomap({})
      "display_name" = "vcn_frankfurt_oe01_dev"
      "dns_label" = "oe01dev"
      "freeform_tags" = tomap({})
      "id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia4x633gfja7iutqingxn5yztoteza5a6demhuzficfz5q"
      "ipv6cidr_blocks" = tolist([])
      "ipv6private_cidr_blocks" = tolist([])
      "is_ipv6enabled" = false
      "is_oracle_gua_allocation_enabled" = tobool(null)
      "network_configuration_category" = "shared"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.366 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_domain_name" = "oe01dev.oraclevcn.com"
      "vcn_key" = "VCN-FRANKFURT-OE01-DEV-KEY"
    }
    "VCN-FRANKFURT-OE01-NP-KEY" = {
      "byoipv6cidr_blocks" = tolist([])
      "byoipv6cidr_details" = tolist([])
      "cidr_block" = "172.168.4.0/23"
      "cidr_blocks" = tolist([
        "172.168.4.0/23",
      ])
      "compartment_id" = "ocid1.compartment.oc1..."
      "default_dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaazblkift77zeouwqbsthm6qg27cc235zszgapwhieurmwvlpsynra"
      "default_route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaaro72sp3wzwzxv6wcz445cq7nxe7shfnyezsvvczunld5km4s344q"
      "default_security_list_id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaaevxqm3weynvyuwmir3now7k3tp677xrhtx7xyikzxcujn6tnmsna"
      "defined_tags" = tomap({})
      "display_name" = "vcn_frankfurt_oe01_np"
      "dns_label" = "oe01np"
      "freeform_tags" = tomap({})
      "id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkiar67r5rt2bdsz5syc3ek4nhjx33he4wkklsveq6kvewnq"
      "ipv6cidr_blocks" = tolist([])
      "ipv6private_cidr_blocks" = tolist([])
      "is_ipv6enabled" = false
      "is_oracle_gua_allocation_enabled" = tobool(null)
      "network_configuration_category" = "shared"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.339 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_domain_name" = "oe01np.oraclevcn.com"
      "vcn_key" = "VCN-FRANKFURT-OE01-NP-KEY"
    }
    "VCN-FRANKFURT-OE01-P-KEY" = {
      "byoipv6cidr_blocks" = tolist([])
      "byoipv6cidr_details" = tolist([])
      "cidr_block" = "172.168.6.0/23"
      "cidr_blocks" = tolist([
        "172.168.6.0/23",
      ])
      "compartment_id" = "ocid1.compartment.oc1..."
      "default_dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaagq2oefacf3wgjeupy224lhafurqqzhsbn3wzvmrcuim7no7bw3aq"
      "default_route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaa6tzvm5tqcjnjyuxp5af7pcrbl56w2g33zpcecppzzrddyuce4zka"
      "default_security_list_id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaa2ogaxhwztmesyp6sufa7in6bjlglwyyd4lfy6xmqjreufjqryz6a"
      "defined_tags" = tomap({})
      "display_name" = "vcn_frankfurt_oe01_p"
      "dns_label" = "oe01p"
      "freeform_tags" = tomap({})
      "id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia5xaib5guwmyr5at5vyu7gbicsueoohs7vavjjwmzh3wq"
      "ipv6cidr_blocks" = tolist([])
      "ipv6private_cidr_blocks" = tolist([])
      "is_ipv6enabled" = false
      "is_oracle_gua_allocation_enabled" = tobool(null)
      "network_configuration_category" = "shared"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.31 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_domain_name" = "oe01p.oraclevcn.com"
      "vcn_key" = "VCN-FRANKFURT-OE01-P-KEY"
    }
    "VCN-FRANKFURT-OE01-SB-KEY" = {
      "byoipv6cidr_blocks" = tolist([])
      "byoipv6cidr_details" = tolist([])
      "cidr_block" = "172.168.8.0/23"
      "cidr_blocks" = tolist([
        "172.168.8.0/23",
      ])
      "compartment_id" = "ocid1.compartment.oc1..."
      "default_dhcp_options_id" = "ocid1.dhcpoptions.oc1.eu-frankfurt-1.aaaaaaaahae6ekjvya7o7bwbldz7awtyhdxuqjnoq57idko4azlttt3usdna"
      "default_route_table_id" = "ocid1.routetable.oc1.eu-frankfurt-1.aaaaaaaae3cdkkqk3sc6vgiu234aop4m6qyzr3j3zlycipr7cd7jkebsiskq"
      "default_security_list_id" = "ocid1.securitylist.oc1.eu-frankfurt-1.aaaaaaaajahu2jtxaqxg5xq3aoyc6qriscgqqu7rroasokvi2roznk7usc2a"
      "defined_tags" = tomap({})
      "display_name" = "vcn_frankfurt_oe01_sb"
      "dns_label" = "oe01sb"
      "freeform_tags" = tomap({})
      "id" = "ocid1.vcn.oc1.eu-frankfurt-1.amaaaaaattkvkkia7nrwktoy72wesoebohsnuklvqow3mth6awgwlaxope4a"
      "ipv6cidr_blocks" = tolist([])
      "ipv6private_cidr_blocks" = tolist([])
      "is_ipv6enabled" = false
      "is_oracle_gua_allocation_enabled" = tobool(null)
      "network_configuration_category" = "shared"
      "state" = "AVAILABLE"
      "time_created" = "2023-06-12 10:17:54.309 +0000 UTC"
      "timeouts" = null /* object */
      "vcn_domain_name" = "oe01sb.oraclevcn.com"
      "vcn_key" = "VCN-FRANKFURT-OE01-SB-KEY"
    }
  }
}

```