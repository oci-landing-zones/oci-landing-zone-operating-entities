# **[OCI FinOps Solution](#)**
## **An OCI Open LZ [Addon](#) that enables cost governance, visibility, and optimization through the FinOps solution**
&nbsp;

## **Overview**

The **OCI FinOps Solution** is an addon to the OCI Open Landing Zone framework. It enhances cost governance and financial visibility for Operating Entities by integrating **OCI FOCUS reports** with an **Autonomous Database and a dashboard** for insightful cost analysis.

The solution automates the complete workflow from fetching and processing FOCUS reports to securely ingesting them into ADB and visualizing them in a user-friendly interface. All components run within a secure private network setup in OCI.

> **Why another dashboard?**  
> While OCI offers native Cost Analysis, this solution supports scenarios such as **multi-cloud cost aggregation**, **external stakeholder access**, and **customized reporting** for FinOps teams.

> **What is FinOps?**  
> FinOps is an operational model and cultural practice that helps organizations maximize the value of cloud by enabling data-driven decisions and creating financial accountability across engineering, finance, and business teams.

&nbsp;

### OCI FinOps Addon Architecture

<img src="images/OCI_FinOps_Arch.png" width="900">

### OCI FinOps Addon Resources

| **Resource** | **Description** |
|--------------|------------------|
| **Autonomous Database (ADB)** | Serves as the central data store for the FinOps solution. Provisioned with a **private endpoint** inside the VCN, it securely receives and stores the processed FOCUS report data, enabling backend processing and dashboard visualization. |
| **Object Storage Bucket** | Acts as the intermediate data lake where **FOCUS reports** are uploaded after being pulled and decompressed. |
| **Function – Fetch & Decompress** | A serverless function that authenticates with OCI APIs, pulls the **FOCUS cost and usage report** from the OCI Console, decompresses the file, and stores it into the Object Storage bucket. |
| **UI Dashboard** | Presents the FinOps insights on top of the Autonomous Database. Tools like **Oracle APEX**, **Oracle Analytics Cloud**, or any preferred BI tool can be used to build the visualization layer. |
| **VCN & Subnets** | A dedicated **Virtual Cloud Network** with private subnets to host the ADB with private endpoint, Functions, and other FinOps components in a secure and isolated manner. Ensures traffic stays within OCI without using public endpoints. |
| **IAM Policies** | Fine-grained **Identity and Access Management** policies to allow Functions and users to access resources like Object Storage, ADB, and Metrics in a controlled and auditable manner. |

&nbsp;

### OCI FinOps Addon Deployment Guide

&nbsp;

### Summary

This addon enhances the [OCI One-OE Landing Zone](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack) by embedding a FinOps platform that brings cost governance, financial visibility, and optimization. It automates the collection, processing, and visualization of OCI FOCUS reports using Functions, Object Storage, Autonomous Database (private endpoint), and a dashboard layer. The solution enables deep insights without requiring OCI login, making it suitable for finance, engineering, and business teams. It also supports multi-cloud use cases, allowing centralized cost analysis across multiple cloud platforms.

&nbsp;

#### License
Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
