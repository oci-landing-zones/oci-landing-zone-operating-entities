# **[OKE Landing Zone Extension](#)**   <!-- omit from toc -->
## **An OCI Open LZ [Workload Extensions](#) to Reduce Your Time-to-Production** <!-- omit from toc -->

 <img src="../../../commons/images/icon_oke.jpg" height="100">
&nbsp; 

## **1. Introduction**
Welcome to the **OKE Landing Zone Extension**.

The OKE Landing Zone Extension is a secure cloud environment, designed with the best practices to simplify the on-boarding of OKE workloads and enable the continuous operations of their cloud resources. This reference architecture provides an automated landing zone configuration.
&nbsp;

## **2. Design Overview**
This workload extension uses the [One-OE](https://github.com/oracle-quickstart/terraform-oci-open-lz/tree/master/blueprints/one-oe) Blueprint as the reference Landing Zone and guides the deployment of OKE on top of it. Extension consists of base infrastructure layer provisioning required OCI resources for deployment of OKE and OKE deployment itself.
&nbsp;

## **3. Deployment Options**

This OKE Landing Zone Extension provides **two quickstart approaches**, [single-stack](single-stack/) and [multi-stack](multi-stack/), to accommodate different use cases and architectural preferences. Both use the committed JSON configurations as-is and are based on **Hub E**.

For requirements outside the quickstart configurations, such as other hub models or additional OKE platforms, see [OKE generation options](oke-blueprint-factory.md).

The quickstarts create one production OKE platform by default.


### **Choosing the Right Approach**

| Consideration | [Single-stack](single-stack/) | [Multi-stack](multi-stack/) |
|---------------|-------------|--------------|
| **Use Case** | PoC, Exploration | Existing Hub E quickstart with separate lifecycle |
| **Hub Model** |  [Hub E (free)](../../../addons/oci-hub-models/hub_e/) |  Existing [Hub E](../../../addons/oci-hub-models/hub_e/) landing zone |
| **Routing Configuration** |  Automatic Hub route updates | OKE spoke attachment and Hub E route coordination |
| **Landing Zone** | Created together  | Already exists |
| **Deployment Steps** | Single deployment operation | Deploy LZ first, then OKE extension |
| **Terraform State** |  Combined (1 state) | Separate (2 states) |
| **Resource Lifecycle** | Coupled | Independent |
| **Complexity** | Self-contained | Requires key coordination across stacks |

The committed quickstart configurations are designed to be deployed as-is.


### Common Features (Both Approaches)

Both deployment options provide:
- **Automated Dependency Resolution**: Configuration keys instead of manual OCID lookups
- **CIS-Compliant OKE**: Using [CIS OKE module](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- **OKE CNI Network Mode**: VCN-native pod networking
- **Comprehensive NSG Configuration**: Control plane, workers, load balancers, and, for native networking, pods
- **Hub-and-Spoke Topology**: OKE VCN as spoke connected to Hub via DRG
- **Public workload ingress**: Kubernetes `Service` resources can create public OCI Load Balancers in the prepared Hub subnet.
- **Service Gateway**: Direct connectivity to OCI services

### Deployment Components

Both approaches deploy the same main components:

| Component | What is deployed |
| --- | --- |
| IAM | OKE administrator and resource-principal policies, compartments, and groups. |
| Network | An OKE VCN with cluster, worker, pod, and private load-balancer subnets and NSGs; Hub routing and public-ingress prerequisites are included. |
| OKE | A Kubernetes cluster with VCN-native pod networking. |
| Workers | A managed node pool using `VM.Standard.E5.Flex` and an Oracle Linux 9 OKE image. |
| Workload load balancing | Private OCI Load Balancers use the OKE VCN. Public OCI Load Balancers use the Hub LB subnet and a network-team-controlled frontend NSG. |

This repository deploys OCI infrastructure only. Deploy Kubernetes workloads and `Service` resources through an approved Kubernetes delivery process.

### Deploying workload load balancers

Use the deployed network-stack outputs to resolve subnet and NSG OCIDs.

#### Private OCI Load Balancer

A private load balancer stays in the OKE VCN and uses the cluster's configured private services subnet. Add the generated internal-LB NSG at creation and disable controller-managed security rules:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-private-service
  annotations:
    oci.oraclecloud.com/load-balancer-type: "lb"
    oci.oraclecloud.com/compartment-id: "<environment-network-compartment-ocid>"
    service.beta.kubernetes.io/oci-load-balancer-internal: "true"
    oci.oraclecloud.com/security-rule-management-mode: "None"
    oci.oraclecloud.com/oci-network-security-groups: "<internal-lb-nsg-ocid>"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 443
      targetPort: 8443
```

The compartment annotation is required because OKE otherwise creates the load balancer in the cluster compartment, while this extension authorizes private load-balancer lifecycle in the environment network compartment. Apply the manifest and wait for the Service to receive a private address. If an alternative private subnet is required, add `service.beta.kubernetes.io/oci-load-balancer-subnet1: "<private-subnet-ocid>"`.

#### Public OCI Load Balancer

A public load balancer is created in the Hub network compartment and Hub LB subnet. Attach the approved Hub frontend NSG only after the load balancer is active:

1. Create the Service without `oci.oraclecloud.com/oci-network-security-groups`. Set security-rule management mode to `None` so OKE does not modify security lists or NSG rules.

   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: my-public-service
     annotations:
       oci.oraclecloud.com/load-balancer-type: "lb"
       oci.oraclecloud.com/compartment-id: "<hub-network-compartment-ocid>"
       service.beta.kubernetes.io/oci-load-balancer-subnet1: "<hub-lb-subnet-ocid>"
       oci.oraclecloud.com/security-rule-management-mode: "None"
   spec:
     type: LoadBalancer
     selector:
       app: my-app
     ports:
       - port: 443
         targetPort: 8443
   ```

2. Wait until the OCI Load Balancer is active and the Service reports its public address.
3. Add the approved NSG and reapply the Service:

   ```yaml
   metadata:
     annotations:
       oci.oraclecloud.com/oci-network-security-groups: "<approved-hub-frontend-nsg-ocid>"
       oci.oraclecloud.com/security-rule-management-mode: "None"
   ```

OKE then attaches the NSG and continues listener and backend reconciliation. Do not include the NSG during initial creation: the matching-tag IAM restriction is enforceable only during post-create attachment.

The network team exclusively manages the Hub frontend NSG's placement, platform tag, rules, movement, and lifecycle. OKE can attach it only when its `tagns-lz-oke.platform` tag matches the cluster platform tag. Approval is cluster-to-NSG, not Service-to-NSG, so the cluster can reuse that approved NSG on its other public load balancers. IAM remains the enforcement boundary even if Kubernetes admission or RBAC is bypassed.

See the [summary of OKE load-balancer annotations](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingloadbalancer_topic-Summaryofannotations.htm) for the complete annotation reference.

### Additional operational notes

- OCI Load Balancer can terminate TLS with an approved certificate in the owning OKE platform compartment. OKE can read and associate the certificate but cannot renew it. TCP pass-through to an in-cluster TLS endpoint is also supported.
- The initial public-LB state remains closed only while the Hub LB subnet security list does not permit public ingress. Changing or removing the approved NSG's platform tag causes later attachment requests to fail.
- When public workload ingress is enabled, the shared Hub policy grants public-IP and floating-IP management plus private-IP use to every OKE cluster principal without platform-tag filtering. The platform-tag restrictions still apply to public Load Balancer lifecycle, Hub subnet/VCN access, and approved NSG attachment.
- OKE administrators, the OKE service, and managed node pools can use an existing Compute capacity reservation in the owning OKE platform compartment. The extension does not create, select, update, or delete reservations.

&nbsp;

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
