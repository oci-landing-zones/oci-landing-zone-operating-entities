
# **[OCI Network Hub Models](#)**
## **An OCI Open LZ [Addon](#) to Increase and Tailor Your Network Security**

&nbsp; 

### The Menu
Welcome to the **OCI Network Hub Model [Addon](#)**, a set of **comprehensible** and well-**documented** network options with a complete **design** and IaC **runtime**. Each of the models presented can be used in any OCI Open LZ Blueprint, or with your tailored landing zone.

&nbsp; 

### The Hub Menu

|  |  |  |   | |
|:-:|:-:|:-:|:-:|:-:|
| **MODEL A** | **MODEL B**| **MODEL C**  | **MODEL D**  | 
| **Native Hub with 2 Firewalls - NS + EW**| **Native Hub with 1 Common Firewall** | **Hub with 3rd Party Firewall - AP** | **Hub with 3rd Party Firewall - AA** | 
| [<img src="model_a/images/hub_model_A_design.jpg" width="250" height="value">](/addons/oci-hub-models/model_a/hub-model-A-packet_flow.md) | <img src="model_b/images/hub_model_B_design.jpg" width="250" height="value"> | <img src="model_c/images/hub_model_C_design.jpg" width="250" height="value"> | <img src="model_d/images/hub_model_D_design.jpg" width="250" height="value"> | <img src="images/oci_hub_models_legend.jpg" width="150" height="value"> 




&nbsp; 

**NS** = North-South   | **EW** = East-West |  **AP** = Active - Passive | **AA** = Active - Active

&nbsp; 

### Guidance on Model A or B

Find below a quick comparison between the two OCI Native Hub models.

|  |  |  |   | |
|:-:|:-:|:-:|:-:|:-:|
| **MODEL A** | **MODEL B**|
| **Two Firewalls**: Public for Inbound and Private for Outbound/EW traffic inspection | **Single Firewall** for NS (Inbound/Outbound) and East-West traffic inspection
| **Segmentation of the network traffic** and **higher throughput rate** | Throughput rate of a single OCI Network Firewall
| **Visibility into the source of the Inbound traffic** on the Public Firewall | **No visibility into the source of the Inbound traffic**, as the source is Public LB
| **Higher cost**: 2 x price of the OCI Network Firewall | **Lower cost**

&nbsp; 

&nbsp; 

# License

Copyright (c) 2024 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](LICENSE) for more details.
