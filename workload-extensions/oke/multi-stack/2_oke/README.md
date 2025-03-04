# OKE foundations Set-up <!-- omit from toc -->
&nbsp; 

## **1. Summary**

|                      |                                                       |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | OKE cluster set-up                                    |
| **OBJECTIVE**        | Provision OCI OKE cluster as a new platform on top of the OKE Landing Zone Extensions. |
| **TARGET RESOURCES** | OKE                                                  |

&nbsp; 

## **2. OKE Deployment**

We recommend automating the OKE Cluster deployment using Terraform. 

To deploy a new OKE Cluster ( VCN-native pod networking for OKE CNI ) as a new Platform (on top of ONE-OE LZ), follow next steps.

For this Demo we are going to use Cloud Shell. See the full module documentation [here](https://github.com/oracle-terraform-modules/terraform-oci-oke/tree/main/examples) if required.

1. Click the 'Next' button, cloud shell will be open

[![Open in Code Editor](https://raw.githubusercontent.com/oracle-devrel/oci-code-editor-samples/main/images/open-in-code-editor.png)](https://cloud.oracle.com/?region=home&cs_repo_url=https://github.com/oci-landing-zones/oci-landing-zone-operating-entities.git&cs_branch=master&cs_readme_path=workload-extensions/oke/multi-stack/2_oke/README.md&cs_open_ce=false)

2. `$ cd oci-landing-zone-operating-entities/workload-extensions/oke/multi-stack/2_oke/oke_lz_tf`
3. Change the **KEYS values** for the respective **OCIDs** in the oke.tf file 

| Placeholder | Description |
| --- | --- |
| CMP-PLATFORM-OKE-KEY | OCID of OKE Platform Compartment where we want to deploy OKE. Created in step 1_foundation |
| VCN-OKE-KEY | OCID of OKE VCN deployed in Network Compartment in respective environment. Created in step 1_foundation |
| SN-CP-KEY | OCID of Control plane subnet in OKE VCN. Created in step 1_foundation. |    
| SN-PRIV-LB-KEY | OCID of private Load Balancer subnet in OKE VCN. Created in step 1_foundation. |
| SN-WORKERS-KEY | OCID of workers subnet in OKE VCN. Created in step 1_foundation. |
| SN-PODS-KEY | OCID of pods subnet in OKE VCN. Created in step 1_foundation. |
| NSG-CP-KEY | OCID of Control plane NSG in OKE VCN. Created in step 1_foundation. | 
| NSG-INT-LB-KEY | OCID of private Load Balancer NSG in OKE VCN. Created in step 1_foundation. |
| NSG-WORKERS-KEY | OCID of workers NSG in OKE VCN. Created in step 1_foundation. |
| NSG-PODS-KEY | OCID of pods NSG in OKE VCN. Created in step 1_foundation. |
| CMP-NETWORK-KEY | OCID of Network compartment in respective environment.

> [!NOTE]
> Make any additional changes needed to customize your cluster. If you have any questions, please refer to the documentation.

5. Run `$ terraform init`
6. Run `$ terraform apply -var="tenancy_ocid=$OCI_TENANCY" -var="region=$OCI_REGION" `

> [!WARNING]
> Be careful to store your `terraform.tfstate` file. This files holds information about Terraform Managed resources. Without it, you won't be able to modify or destroy your Terraform configured infrastructure. Local storage in Cloud Shell is deleted after a period of inactivity.
>
>  To destroy created OKE cluster run `$ terraform destroy -var="tenancy_ocid=$OCI_TENANCY" -var="region=$OCI_REGION" `

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
