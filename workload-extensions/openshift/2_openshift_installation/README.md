# OpenShift Cluster Installation <!-- omit from toc -->
&nbsp;

## **1. Summary**

|                      |                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| **NAME**             | OpenShift Cluster Setup                                                                          |
| **OBJECTIVE**        | Provision an OpenShift cluster on Oracle Cloud Infrastructure (OCI) as a new platform on top of the OpenShift Landing Zone Extensions. |
| **TARGET RESOURCES** | OpenShift Cluster                                                                                |

&nbsp;

## **2. OpenShift Deployment**

### Installation Options

There are two options available for provisioning the OpenShift cluster infrastructure on OCI:

1. **[Assisted Installer](https://docs.oracle.com/en-us/iaas/Content/openshift-on-oci/installing-assisted.htm#installing-assisted)** *(Recommended)*  
   This is an automated and streamlined installation method using the Red Hat Assisted Installer.  
   It is the preferred approach for most users and requires an internet connection during installation.  

   Once the cluster installation is successfully completed, remove the Internet Gateway from the **spoke OpenShift VCN** and connect it to the **HUB VCN** to route traffic through the HUB.  
   Refer to [Step 3 - OpenShift Extension Cleanup and Routing](../3_openshift_cleanup_and_routing/).

2. **[Agent-based Installer](https://docs.oracle.com/en-us/iaas/Content/openshift-on-oci/agent-installer.htm#agent-installer)**  
   This is an advanced method suitable for environments that require custom infrastructure setup or operate in a disconnected (offline) mode.  
   Users can either leverage the OCI-provided Terraform script or manually provision the infrastructure if their configurations are not supported.

> [!NOTE]
> Make any necessary adjustments to customize your OpenShift cluster configuration. For additional details, refer to the official documentation.

&nbsp;

### OpenShift Installation

We recommend proceeding with either the **Assisted Installer** or the **Agent-based Installer** using the **OCI-provided Terraform stack**.

The following flow outlines the OpenShift cluster installation process based on the **Assisted Installer** method.  
Refer to the official [OCI OpenShift GitHub Repository](https://github.com/oracle-quickstart/oci-openshift/) for detailed steps.  
Terraform stack details are available [here](https://github.com/oracle-quickstart/oci-openshift/tree/main/terraform-stacks).



#### **Step 1: Create Resource Attribution Tags**

OpenShift resource attribution tags are used to categorize, organize, and track resource usage, ownership, billing, and compliance within OCI.  
This stack creates a **Tag Namespace** and a **Defined Tag**, which are applied to all OpenShift resources to enhance manageability, visibility, and reporting.

> [!NOTE]
> Run this stack with default values. 



#### **Step 2: Create Cluster**

This stack provisions the required OCI resources for the OpenShift cluster and facilitates the installation.

Below are the recommended configuration variables for deploying the **Production Platform OpenShift Cluster**:

| Resource | Configuration |
| --------- | -------------- |
| **Target Compartment** | `cmp-lzp-p-platform-openshift` |
| **Tag Namespace Compartment** | `root` *(default)* |
| **Create Private DNS** | ✅ Enabled |
| **Use Existing Networking Infrastructure** | ✅ Enabled |
| **Networking Compartment** | `cmp-lzp-p-network` |
| **Existing VCN** | `vcn-fra-lzp-p-platform-openshift` |
| **Existing Private Subnet for OCP** | `sn-fra-lzp-p-openshift-workers-private` |
| **Existing Private Subnet for Bare Metal** | `sn-fra-lzp-p-openshift-bm-private` |
| **Existing Public Subnet** | `sn-fra-lzp-p-openshift-lb-public` |






&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.