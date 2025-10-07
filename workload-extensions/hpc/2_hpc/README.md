# HPC Cluster Set-up <!-- omit from toc -->
&nbsp; 

## **1. Summary**

|                      |                                                       |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | HPC Cluster set-up                                    |
| **OBJECTIVE**        | Provision OCI HPC cluster as a new platform on the HPC Landing Zone Extensions. |
| **TARGET RESOURCES** | HPC Clusters                                                 |

&nbsp; 

## **2. HPC Deployment**

The HPC Cluster can be deployed to the HPC Landing Zone.

[![Deploy to Oracle Cloud](https://oci-resourcemanager-plugin.plugins.oci.oraclecloud.com/latest/deploy-to-oracle-cloud.svg)](https://cloud.oracle.com/resourcemanager/stacks/create?zipUrl=https://github.com/oracle-quickstart/oci-hpc/archive/refs/heads/master.zip)

The full information on the HPC stack is [here](https://github.com/oracle-quickstart/oci-hpc/)

The following are the relevant configuration variables for deploying the Production HPC cluster:

| Resource | Name |
| --- | --- |
| Target Compartment | cmp-lzp-p-platform-hpc |
| FSS Compartment | cmp-lzp-p-platform-hpc |
| Use Existing VCN | Check |
| VCN Compartment | cmp-lzp-p-network |
| Existing Network | vcn-fra-lzp-p-hpc |
| Deploy Master Node without a public IP | Check |
| Master Node Subnet | sn-fra-lzp-p-hpc-master |
| Private Subnet | sn-fra-lzp-p-hpc-cluster |
| DNS entry | Check |
| Private Zone Name | hpc-prod-cluster.local |

The following are the relevant configuration variables for deploying the Pre-Production HPC cluster:

| Resource | Name |
| --- | --- |
| Target Compartment | cmp-lzp-pp-platform-hpc |
| FSS Compartment | cmp-lzp-pp-platform-hpc |
| Use Existing VCN | Check |
| VCN Compartment | cmp-lzp-pp-network |
| Existing Network | vcn-fra-lzp-pp-hpc |
| Deploy Master Node without a public IP | Check |
| Master Node Subnet | sn-fra-lzp-pp-hpc-master |
| Private Subnet | sn-fra-lzp-pp-hpc-cluster |
| DNS entry | Check |
| Private Zone Name | hpc-preprod-cluster.local |

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
