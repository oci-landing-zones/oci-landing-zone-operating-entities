


# **OCI Operating Entities Landing Zone**
## **[One-OE Blueprint](#) &ndash; One-Stack Deployment**

&nbsp; 

### Overview
This document provides a set of deployment options for creating a One Operating Entity (One-OE) Landing Zone on Oracle Cloud Infrastructure (OCI).
Each option represents a predefined architecture pattern that combines core identity, networking, security, and monitoring components to support standardized multi-environment deployments.

The deployment menu includes several Hub architectures, each with distinct network and firewall configurations. These options enable you to choose the configuration that aligns with your security requirements, cost constraints, and workload needs.

&nbsp; 

### One-OE Landing Zone Deployment Menu

| [**One-OE + Hub A**](one_oe_hub_a.md) | [**One-OE + Hub B**](one_oe_hub_b.md) | [**One-OE + Hub C**](one_oe_hub_c.md) | [**One-OE + Hub E**](one_oe_hub_e.md) |
|:-|:-|:-|:-|
| <img src="../../design/images/oneoe_hub_a.png" width="300" height=""> | <img src="../../design/images/oneoe_hub_b.png" width="300" height=""> | <img src="../../design/images/oneoe_hub_c.png" width="300" height=""> | <img src="../../design/images/oneoe_hub_e.png" width="340" height=""> |
| **Main components:**</br> • Compartments, Identity Domain, IAM groups, policies</br> • [**Hub A**](/addons/oci-hub-models/hub_a/readme.md) with two OCI Network Firewalls</br> • Public Load Balancer</br> • DRG, Route Tables</br> • Two workload environments with dedicated Spoke VCNs</br> • Cloud Guard, Security Zones, Vulnerability Scanning</br> • Events, Alarms, Logging, Notifications&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</br></br></br></br></br></br> | **Main components:**</br> • Compartments, Identity Domain, IAM groups, policies</br> • [**Hub B**](/addons/oci-hub-models/hub_b/readme.md) with one OCI Network Firewall</br> • Public Load Balancer</br> • DRG, Route Tables</br> • Two workload environments with dedicated Spoke VCNs</br> • Cloud Guard, Security Zones, Vulnerability Scanning</br> • Events, Alarms, Logging, Notifications&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</br></br></br></br></br></br> | **Main components:**</br> • Compartments, Identity Domain, IAM groups, policies</br> • [**Hub C**](/addons/oci-hub-models/hub_c/readme.md) with two Network Load Balancers</br> • Public Load Balancer</br> • DRG, Route Tables</br> • Two workload environments with dedicated Spoke VCNs</br> • Cloud Guard, Security Zones, Vulnerability Scanning</br> • Events, Alarms, Logging, Notifications</br></br></br> *Note: configuration does not include third-party Firewalls*&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</br> | **Main components:**</br> • Compartments, Identity Domain, IAM groups, policies</br> • [**Hub E**](/addons/oci-hub-models/hub_e/readme.md)</br> • Public Load Balancer</br> • DRG, Route Tables</br> • Two workload environments with dedicated Spoke VCNs</br> • Cloud Guard, Security Zones, Vulnerability Scanning</br> • Events, Alarms, Logging, Notifications&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</br></br></br></br></br></br></br> |
| **Cost:** includes the [price](https://www.oracle.com/cloud/networking/network-firewall/pricing/) of **two** [OCI Network Firewalls](https://www.oracle.com/cloud/networking/network-firewall/)</br></br></br> | **Cost:** includes the [price](https://www.oracle.com/cloud/networking/network-firewall/pricing/) of **one** [OCI Network Firewall](https://www.oracle.com/cloud/networking/network-firewall/)</br></br></br> | **Cost:** free</br> *(cost of third-party Firewalls must be accounted for separately)* | **Cost:** free</br></br></br></br> | 
| [Overview and Deployment](one_oe_hub_a.md)  | [Overview and Deployment](one_oe_hub_b.md) | [Overview and Deployment](one_oe_hub_c.md) | [Overview and Deployment](one_oe_hub_e.md) |



&nbsp; 

&nbsp; 


Review the [known issues](known_issues.md) for any potential problems, and feel free to contact us.

&nbsp; 

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
