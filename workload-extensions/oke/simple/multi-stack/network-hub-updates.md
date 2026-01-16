# OP.1.1 - Firewall and RT updates <!-- omit from toc -->

In all OCI Landing Zones, we use a Hub-and-Spoke network architecture. This approach allows deployment of network firewall in the hub for traffic inspection, providing enhanced security posture. There's no one size fits all solution and every customer has different requirements. We provide four different versions of [Hub Models](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models).

In the OKE extension we will use [Model A](https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/blob/master/addons/oci-hub-models/hub_a/readme.md) with two firewalls. The first firewall is used for North-South traffic, while the second is responsible for East-West traffic flow.

Model A offers two options:
- **Light Version** (No Cost) - testing purposes, without a firewall
- **Complete Version** (Paid) - includes deployment of two OCI Network Firewalls.

Follow the steps to configure version of [Hub Model A](/addons/oci-hub-models/hub_a). After Hub has been configured we need to perform modification to OKE environments to establish routing between Hub and Spoke VCN. In the diagram below we can see expected routing for OKE extension both for prod and uat clusters.

<img src="../../content/net-routing.png" width="1000" height="auto">

To connect OKE clusters as a spoke to the hub, we need to perform the following steps for each of the clusters:

- **1.** Identify the Private IP OCID of your firewalls. [Light version steps](/commons/content/howto_identify_private_ip_ocid_vm_vnic.md) or [Complete version steps](/commons/content/howto_identify_private_ip_ocid_network_firewall.md).
- **2.** You'll need to update Hub routing to the cluster network (spoke VCN). For an example of fully configured Hub A - Light model see the POST network JSON configuration [**oci_open_lz_hub_a_network_light_post.auto.tfvars.json**](/addons/oci-hub-models/hub_a/oci_open_lz_hub_a_network_light_post.auto.tfvars.json):
  - **2.1** Add route entry for the destination of cluster network range (10.0.80.0/21 in our example) to route tables: rt-\<region>-hub-natgw,  rt-\<region>-hub-ingress. And next hop as OCID of the respective Firewall IP from the step 1. 
  - **2.2** Add route entry for the destination of cluster network range (10.0.80.0/21 in our example) to route tables:  rt-\<region>-hub-lb,  rt-\<region>-hub-internal,  rt-\<region>-hub-mgmt. And next hop as Hub DRG.
  - **2.3.** Create DRG Attachment to the cluster network using the drg_route_table_key "DRGRT-FRA-LZP-SPOKES-KEY". After the attachment is created DRG will automatically import routes from the spokes to the DRG Route Table.
- **3.** You'll need to update cluster network routing (spoke VCN) to Hub.
  - **3.1** Modify all route tables in VCN (rt-\<region>-sn-p-oke-lb, rt-\<region>-sn-p-oke-cp, rt-\<region>-sn-p-oke-workers, rt-\<region>-sn-p-oke-pods) with new entry adding destination of 0.0.0.0/0 and next hop DRG. Resulting in sending all traffic outside of the VCN to DRG.
- **4.** Save and deploy all changes.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
