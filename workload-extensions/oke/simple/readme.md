# OKE Workload Extension — Published Quickstarts <!-- omit from toc -->

- [1. Summary](#1-summary)
- [2. Architecture Overview](#2-architecture-overview)
- [3. Deployment Options](#3-deployment-options)
- [4. Operational Guidance](#4-operational-guidance)
- [5. Additional Resources](#5-additional-resources)

## 1. Summary

The published OKE package prepares one OKE platform using the [One-OE blueprint](/blueprints/one-oe/readme.md), Hub E networking, VCN-native pod networking, and managed workers. It includes infrastructure and IAM prerequisites for private and public workload load balancers. Kubernetes applications and Services are deployed through the workload owner's delivery process.

OCI Resource Manager (ORM) with configuration files in a customer-controlled private OCI Object Storage bucket is the recommended delivery path. Use the pinned OCI Landing Zone Orchestrator source with working directory `rms-facade`. Terraform CLI, customer-controlled CI/CD, and an approved private Git source are supported alternatives.

## 2. Architecture Overview

Both deployment modes use the same OKE workload baseline. Their foundation ownership and state boundaries differ.

| Component | Published resources |
| --- | --- |
| IAM | OKE compartments, administrator groups, and resource-principal policies |
| Governance | OKE platform tag namespace and definition |
| Network | OKE VCN with control-plane, worker, pod, and internal load-balancer subnets and NSGs; Hub/DRG integration |
| Cluster | One enhanced OKE cluster with VCN-native pod networking |
| Workers | One managed worker using `VM.Standard.E5.Flex` and a matching Oracle Linux 9 OKE image |
| Workload ingress | Private LB/NLB prerequisites in the OKE VCN and public OCI Load Balancer prerequisites in the Hub |

The cluster and worker snapshots use CIS1 with OCI-managed encryption. The published IAM snapshot is rendered from CIS2 and includes dormant compartment-scoped KMS authority; keep unrelated keys out of the OKE platform compartment. Use Blueprint Factory for a complete CIS2 workload and its generated encryption dependencies.

## 3. Deployment Options

| Path | Foundation | State and lifecycle | Guide |
| --- | --- | --- | --- |
| Published single-stack | Created together with OKE | One combined state | [Single-stack](single-stack/readme.md) |
| Published multi-stack | Existing One-OE Hub E landing zone | Separate foundation and extension states | [Multi-stack](multi-stack/readme.md) |
| Blueprint Factory | Generated for the reviewed design | Generated package and its deployment contract | [Customization](oke-blueprint-factory.md) |

The quickstarts use an environment named `prod` and a Hub E without a firewall. Use them for a PoC, lab, or explicitly non-production deployment that accepts that tradeoff. Production requires a firewall-based hub. For production or different environments, platforms, CIDRs, or networking modes, use [Blueprint Factory](oke-blueprint-factory.md).

## 4. Operational Guidance

### Deploying Workload Load Balancers

Use the deployed network-stack outputs to resolve compartment, subnet, and NSG OCIDs. The generated `int-lb-default-backend` NSG provides the preconfigured LB-to-backend connectivity and must be attached to the load balancer. In private deployments, OKE can create and manage a separate frontend NSG in the environment network compartment. Public Hub frontend NSGs remain network-team-managed.

The private and public OCI Load Balancer examples set `oci.oraclecloud.com/ingress-ip-mode: "proxy"` so traffic originating inside the cluster and sent to the Service's load-balancer address traverses the OCI Load Balancer. Without it, the default `VIP` mode sends in-cluster traffic directly to application pods, bypassing listener TLS, rule sets, WAF/WAA attachments, frontend NSGs, and other load-balancer controls. The annotation requires Kubernetes 1.30 or later.

#### Private OCI Load Balancer

A private load balancer stays in the OKE VCN and uses the cluster's configured private services subnet. The following example terminates TLS at the load balancer, restricts frontend access, limits simultaneous connections to each backend, and rejects HTTP headers larger than 16 KiB. OKE creates and manages a frontend NSG, while the generated `int-lb-default-backend` NSG is attached to the load balancer without allowing OKE to modify its rules:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-private-service
  annotations:
    # Load balancer type, ownership, placement, and stable addressing.
    oci.oraclecloud.com/load-balancer-type: "lb"
    oci.oraclecloud.com/compartment-id: "<environment-network-compartment-ocid>"
    service.beta.kubernetes.io/oci-load-balancer-internal: "true"
    service.beta.kubernetes.io/oci-load-balancer-subnet1: "<internal-lb-subnet-ocid>"
    oci.oraclecloud.com/reserved-private-ips: "<reserved-private-ip-address>"

    # Route in-cluster clients through the LB and use NSGs instead of security lists.
    oci.oraclecloud.com/ingress-ip-mode: "proxy"
    oci.oraclecloud.com/security-rule-management-mode: "NSG"
    oci.oraclecloud.com/oci-network-security-groups: "<int-lb-default-backend-nsg-ocid>"

    # Terminate TLS 1.2/1.3 at the LB and forward HTTP to the application.
    service.beta.kubernetes.io/oci-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/oci-load-balancer-backend-protocol: "HTTP"
    oci-load-balancer.oraclecloud.com/tls-certificate-map: "private-lb-tls"
    oci.oraclecloud.com/oci-load-balancer-listener-ssl-config: '{"CipherSuiteName":"oci-tls-12-13-ssl-cipher-suite-v3","Protocols":["TLSv1.2","TLSv1.3"]}'

    # Bound backend connections and accepted HTTP header size.
    oci-load-balancer.oraclecloud.com/backendset-backend-max-connections: "1024"
    oci.oraclecloud.com/oci-load-balancer-rule-sets: |
      {
        "header-size": {
          "items": [
            {
              "action": "HTTP_HEADER",
              "httpLargeHeaderSizeInKB": 16
            }
          ]
        }
      }
spec:
  type: LoadBalancer
  selector:
    app: my-app
  loadBalancerSourceRanges:
    - "<approved-private-client-cidr>"
  ports:
    - name: https
      protocol: TCP
      port: 443
      targetPort: 8080
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: private-lb-tls
data:
  "443": '["<oci-leaf-certificate-ocid>"]'
```

The compartment annotation is required because OKE otherwise creates the load balancer in the cluster compartment, while this extension authorizes private load-balancer lifecycle in the environment network compartment. The certificate must be active, in the same region as the load balancer, and stored in the owning OKE platform compartment. The `ConfigMap` must be in the same Kubernetes namespace as the Service.

The example uses the OCI version 3 cipher suite for TLS 1.2 and TLS 1.3. The maximum-connection value is applied to each backend, not to the backend set as a whole, and must be adjusted to the tested capacity of the application. The header-size annotation makes OKE authoritative for all load-balancer rule sets; include any additional required rule sets in the same JSON object.

Reserved private IPv4 addresses require Kubernetes 1.32 or later. The address must already be reserved, available, and belong to the selected load-balancer subnet. It must be declared during initial Service creation; changing from an automatically assigned address requires recreating the Service. Remove the `oci.oraclecloud.com/reserved-private-ips` annotation when a stable private address is not required.

#### Private OCI Network Load Balancer

A private Network Load Balancer uses NLB-specific subnet and internal annotations. OKE creates and manages a frontend NSG, while the generated `int-lb-default-backend` NSG is attached to the NLB without allowing OKE to modify its rules. Network Load Balancers do not terminate TLS; this example passes TCP 443 through to an application that owns the certificate and TLS configuration:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-private-nlb-service
  annotations:
    # Network Load Balancer type, ownership, placement, and stable addressing.
    oci.oraclecloud.com/load-balancer-type: "nlb"
    oci.oraclecloud.com/compartment-id: "<environment-network-compartment-ocid>"
    oci-network-load-balancer.oraclecloud.com/internal: "true"
    oci-network-load-balancer.oraclecloud.com/subnet: "<internal-lb-subnet-ocid>"
    oci.oraclecloud.com/reserved-private-ips: "<reserved-private-ip-address>"

    # Let OKE manage a frontend NSG and attach the preconfigured connectivity NSG.
    oci.oraclecloud.com/security-rule-management-mode: "NSG"
    oci-network-load-balancer.oraclecloud.com/oci-network-security-groups: "<int-lb-default-backend-nsg-ocid>"

    # Redirect established flows when a backend becomes unhealthy.
    oci-network-load-balancer.oraclecloud.com/is-instant-failover-enabled: "true"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: my-app
  loadBalancerSourceRanges:
    - "<approved-private-client-cidr>"
  ports:
    - name: tls
      protocol: TCP
      port: 443
      targetPort: 8443
```

`externalTrafficPolicy: Local` sends traffic only to nodes with a local ready endpoint. Review the application's pod distribution and availability requirements before using it. This setting alone does not guarantee source preservation. When preserving the original client IP is required, also add `oci-network-load-balancer.oraclecloud.com/is-preserve-source: "true"` and ensure the backend NSGs permit the original client CIDRs.

The reserved private IPv4 address has the same Kubernetes version, subnet, availability, and initial-creation requirements described for the private Load Balancer. Remove the annotation when a stable private address is not required.

#### Public OCI Load Balancer

A public load balancer is created in the Hub network compartment and Hub LB subnet. The following example terminates TLS at the load balancer, limits simultaneous connections to each backend, and rejects HTTP headers larger than 16 KiB. The network team owns all Hub security rules, so OKE must not manage security lists or NSG rules. Attach the approved Hub frontend NSG only after the load balancer is active:

1. Create the Service without `oci.oraclecloud.com/oci-network-security-groups`. Set security-rule management mode to `None` so OKE does not modify security lists or NSG rules.

   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: my-public-service
     annotations:
       # Load balancer type, Hub ownership, public placement, and stable addressing.
       oci.oraclecloud.com/load-balancer-type: "lb"
       oci.oraclecloud.com/compartment-id: "<hub-network-compartment-ocid>"
       service.beta.kubernetes.io/oci-load-balancer-subnet1: "<hub-public-lb-subnet-ocid>"
       oci.oraclecloud.com/reserved-ips: "<reserved-public-ip-address>"

       # Route in-cluster clients through the LB; the network team owns Hub rules.
       oci.oraclecloud.com/ingress-ip-mode: "proxy"
       oci.oraclecloud.com/security-rule-management-mode: "None"

       # Terminate TLS 1.2/1.3 at the LB and forward HTTP to the application.
       service.beta.kubernetes.io/oci-load-balancer-ssl-ports: "443"
       service.beta.kubernetes.io/oci-load-balancer-backend-protocol: "HTTP"
       oci-load-balancer.oraclecloud.com/tls-certificate-map: "public-lb-tls"
       oci.oraclecloud.com/oci-load-balancer-listener-ssl-config: '{"CipherSuiteName":"oci-tls-12-13-ssl-cipher-suite-v3","Protocols":["TLSv1.2","TLSv1.3"]}'

       # Bound backend connections and accepted HTTP header size.
       oci-load-balancer.oraclecloud.com/backendset-backend-max-connections: "1024"
       oci.oraclecloud.com/oci-load-balancer-rule-sets: |
         {
           "header-size": {
             "items": [
               {
                 "action": "HTTP_HEADER",
                 "httpLargeHeaderSizeInKB": 16
               }
             ]
           }
         }
   spec:
     type: LoadBalancer
     selector:
       app: my-app
     ports:
       - name: https
         protocol: TCP
         port: 443
         targetPort: 8080
   ---
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: public-lb-tls
   data:
     "443": '["<oci-leaf-certificate-ocid>"]'
   ```

2. Wait until the OCI Load Balancer is active and the Service reports its public address.
3. Add the approved NSG and reapply the Service:

   ```yaml
   metadata:
     annotations:
       # Attach only the network-team-approved, matching-platform Hub NSG.
       oci.oraclecloud.com/oci-network-security-groups: "<approved-hub-frontend-nsg-ocid>"
       oci.oraclecloud.com/security-rule-management-mode: "None"
   ```

OKE then attaches the NSG and continues listener and backend reconciliation. Do not include the NSG during initial creation: the matching-tag IAM restriction is enforceable only during post-create attachment.

The network team exclusively manages the Hub frontend NSG's placement, platform tag, rules, movement, and lifecycle. OKE can attach it only when its `tagns-lz-oke.platform` tag matches the cluster platform tag. Approval is cluster-to-NSG, not Service-to-NSG, so the cluster can reuse that approved NSG on its other public load balancers. IAM remains the enforcement boundary even if Kubernetes admission or RBAC is bypassed. Do not specify `loadBalancerSourceRanges`; OKE does not manage the Hub frontend rules. The approved Hub NSG controls public ingress, while its egress rules and the OKE worker or pod ingress rules provide cross-VCN backend connectivity.

The certificate must be active, in the same region as the load balancer, and stored in the owning OKE platform compartment. The `ConfigMap` must be in the same Kubernetes namespace as the Service. The maximum-connection value applies to each backend and must be adjusted to the tested capacity of the application. The header-size annotation makes OKE authoritative for all load-balancer rule sets; include any additional required rule sets in the same JSON object.

To reuse a reserved public IPv4 address, create it in the Hub network compartment and declare it during initial Service creation. The annotation takes the IP address value, not the public-IP OCID. Remove the `oci.oraclecloud.com/reserved-ips` annotation when a stable public address is not required.

OCI Web Application Firewall (WAF) and Web Application Acceleration (WAA) can also be attached to the provisioned Layer 7 Load Balancer. OKE provides no Service annotations for these integrations. After the load balancer is active, create a WAF firewall that binds an approved WAF policy to the load balancer, or create a WAA acceleration that binds an approved WAA policy to it. These resources, their IAM permissions, and their lifecycle must be managed outside the Kubernetes Service manifest.

See the [summary of OKE load-balancer annotations](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingloadbalancer_topic-Summaryofannotations.htm) for the complete LB and NLB annotation reference.

### Kubernetes Add-ons

**Manual post-deployment configuration required:** the extension does not install Kubernetes add-ons. The workload owner manages their versions, lifecycle, drift, and compliance review.

The published OKE baseline uses the following cert-manager release for Kubernetes `v1.35.2`:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.21.0/cert-manager.yaml
```

For Metrics Server, review the release selected by the workload delivery process before installation. The upstream manifest location used by the quickstarts is:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

For cert-manager renewal, terminate TLS in an approved ingress controller and use OCI Load Balancer TCP pass-through. OCI Load Balancer termination with imported certificates requires a security-owned external renewal pipeline; an in-cluster Secret update does not rotate the OCI certificate.

### Using OCI File Storage

Config-driven OKE generation can prepare OCI File Storage networking and IAM by setting `create_fss: true` in the `oke_simple` parameters. The option defaults to `false`, so the committed quickstarts and existing configurations do not gain extra subnets or permissions.

When enabled, the generated OKE VCN includes a private FSS subnet, service-gateway-only route table, FSS security list and NSG, and paired stateless NFS rules between the FSS and worker NSGs. For VCN-native networking, the same rules are generated between the FSS and pod NSGs so OKE virtual nodes can mount FSS directly from pods. The OKE cluster principal also receives `manage file-family` in its own platform compartment.

**Manual post-deployment configuration required:** the extension prepares prerequisites for File Storage but does not create a file system, mount target, or Kubernetes storage objects. After infrastructure deployment, create a mount target in the generated FSS subnet and associate the generated FSS NSG with it. Then configure the `fss.csi.oraclecloud.com` StorageClass with that existing `mountTargetOcid` and the OKE platform compartment. This keeps the mount target and its NSG association under infrastructure management while CSI manages file systems and persistent volumes. See [Provisioning PVCs on the File Storage Service](https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingpersistentvolumeclaim_Provisioning_PVCs_on_FSS.htm).

CIS2 worker initialization installs `oci-fss-utils` from the developer repository matching the runtime Oracle Linux major version. This prepares CIS2 workers for FSS in-transit encryption. CIS1 workers do not install the package.

Worker boot volumes default to `60` GB. Set `worker_boot_volume_size` to an integer from `50` through `32768` in the `oke_simple` parameters to choose another size. Worker initialization runs `oci-growfs` at both CIS levels so the root partition and filesystem use the configured capacity, then executes the OKE-provided bootstrap script so the node can join the cluster.

<a id="additional-operational-notes"></a>

### Operational and Security Notes

- OCI Load Balancer can terminate TLS with an approved certificate in the owning OKE platform compartment. OKE can read and associate the certificate but cannot renew it. TCP pass-through to an in-cluster TLS endpoint is also supported.
- The initial public-LB state remains closed only while the Hub LB subnet security list does not permit public ingress. Changing or removing the approved NSG's platform tag causes later attachment requests to fail.
- When public workload ingress is enabled, the shared Hub policy grants public-IP and floating-IP management plus private-IP use to every OKE cluster principal without platform-tag filtering. The platform-tag restrictions still apply to public Load Balancer lifecycle, Hub subnet/VCN access, and approved NSG attachment.
- OKE administrators, the OKE service, and managed node pools can use an existing Compute capacity reservation in the owning OKE platform compartment. The extension does not create, select, update, or delete reservations.

## 5. Additional Resources

- [Single-stack deployment](single-stack/readme.md)
- [Multi-stack deployment](multi-stack/readme.md)
- [Blueprint Factory customization](oke-blueprint-factory.md)
- [ORM deployment guidance](/commons/content/orm_bp.md)

## License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
