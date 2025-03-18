

# **[EXACS ](#)**
## **An OCI Open LZ Addon to enable Database management & Operation Insights and Logging Analytics**

Database Management provides comprehensive performance diagnostics and management for EXACS Oracle Databases. Additionally, with the added capabilities of Ops Insights, you can:

* Analyze resource usage across cloud databases
* Forecast future resource demands, including CPU, memory, and storage, based on historical trends
* Compare SQL performance across databases and identify common patterns
* Monitor ASM disk group usage
* Analyze storage server (cell) I/O and throughput

The DM/OPSI PEs will need visibility with the EXACS SCAN listeners.

* In a Global approach, the DM/OPSI PEs will be placed in the mon subnet in the hub and should be assigned to the nsg-fra-lzp-hub-global-mon-pe NSGs. EXACS resides in database client subnet (sn-<region>-p-projs-db) and has to be assigned to the nsg-lzp-p-projects-mon-pe-db NSGs.
<img src="./images/EXACS_GLOBAL.png" height="300" align="center">

  
* In a Local approach DM/OPSI PEs and the VM cluster will reside in the same database client subnet(sn-<region>-p-projs-db), and the nsg-lzp-p-projects-mon-pe-db NSGs will allow communication between them.
<img src="./images/EXACS_LOCAL.png" height="300" align="center">
  

> [!NOTE]  
> To review the Oracle documentation for enabling Database Management and Operation Insights click [here](https://docs.public.content.oci.oraclecloud.com/en-us/iaas/exadatacloud/doc/observability-and-management-for-exacs.html).
> 


# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
