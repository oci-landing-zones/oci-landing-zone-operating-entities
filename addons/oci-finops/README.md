# **[OCI FinOps Solution](#)**
## **An OCI Open LZ [Addon](#) that enables cost governance, visibility, and optimization through the FinOps solution**
&nbsp;

## **Overview**

The **OCI FinOps Solution** is an addon to the OCI Open Landing Zone framework. It enhances cost governance and financial visibility for Operating Entities by integrating **OCI FOCUS reports** directly with an **Autonomous Database and a dashboard** for insightful cost analysis.

The solution describes the workflow end‑to‑end: it securely fetches FOCUS reports from the central tenancy into ADB and visualizes them in a user‑friendly interface. All components reside in a private network within OCI.

> **Why another dashboard?**  
> While OCI provides native Cost Analysis, this addon supports scenarios such as **multi‑cloud cost aggregation**, **external stakeholder access**, and **custom reporting** for FinOps teams.

> **What is FinOps?**  
> FinOps is an operational model and cultural practice that maximizes cloud value through data‑driven decisions and financial accountability across engineering, finance, and business teams.

&nbsp;

### OCI FinOps Addon Architecture

<img src="images/OCI_FinOps_Arch.png" width="900">

### OCI FinOps Addon Resources

| **Resource** | **Description** |
|--------------|------------------|
| **Autonomous Database (ADB)** | Central data store for the FinOps platform. Provisioned with a **private endpoint** inside the VCN, it directly ingests FOCUS reports from the central tenancy and powers the visualization layer. |
| **UI Dashboard** | Presents FinOps insights on top of ADB. You can build the UI with **Oracle APEX**, **Oracle Analytics Cloud**, or another BI tool of choice. |
| **VCN & Subnets** | A dedicated **Virtual Cloud Network** with private subnets to host ADB, the dashboard, and related components in an isolated, secure manner—keeping traffic off the public internet. |
| **IAM Policies** | Includes user policies to manage the FinOps platform and **service policies** that grant ADB permission to fetch FOCUS reports from the central tenancy, all in a controlled and auditable way. |

&nbsp;

### OCI FinOps Addon Deployment Guide

These are the required steps to provision the OKE workload:

 1. It's required to already have deployed OCI LZ. In this guide we will build on top of the One-OE LZ with Hub model E option. Any other OCI landing zone, such as a [CIS landing zone](https://github.com/oci-landing-zones/oci-cis-landingzone-quickstart), [OCI Core Landing Zone](https://github.com/oci-landing-zones/terraform-oci-core-landingzone) or [Multi-OE](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/multi-oe/generic_v1/runtime), can also used as a baseline landing zone as well.
 2. Deploy the FinOps solution from the [FinOps Setup](finops-setup) guide.


&nbsp;

### Summary

This addon enhances the [OCI One-OE Landing Zone](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/blueprints/one-oe/runtime/one-stack) by embedding a FinOps platform that delivers cost governance, visibility, and optimization. It automates the ingestion and analysis of OCI FOCUS reports using an Autonomous Database (private endpoint) and a flexible dashboard layer—no Object Storage or Functions required. The solution offers deep insights without necessitating OCI console access and supports centralized cost analysis across multiple clouds.

&nbsp;

#### License
Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
