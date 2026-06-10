# OKE Workload Extension - Multi-Stack Deployment  <!-- omit from toc -->

- [**1. Summary**](#1-summary)
- [**2. Architecture Overview**](#2-architecture-overview)
- [**3. Configuration Files**](#3-configuration-files)
- [**4. Deployment Steps**](#4-deployment-steps)
  - [Option A: Deploy via OCI Resource Manager](#option-a-deploy-via-oci-resource-manager)
  - [Option B: Deploy via Terraform CLI](#option-b-deploy-via-terraform-cli)
- [**5. Post-Deployment Configuration**](#5-post-deployment-configuration)
- [**6. Customization**](#6-customization)
- [**7. Cleanup**](#7-cleanup)
- [**8. Troubleshooting**](#8-troubleshooting)
- [**9. Additional Resources**](#9-additional-resources)



## **1. Summary**

| | |
| -------------------- | ----------------------------------------------------- |
| **NAME**         | OKE Cluster Deployment with Orchestrator                                    |
| **OBJECTIVE**        | Deploy OCI OKE cluster with spoke network infrastructure using the Landing Zone Orchestrator module. |
| **TARGET RESOURCES** | IAM (Compartments, Groups, Policies), Network (VCN, Subnets, NSGs, Gateways), OKE Cluster |
| **DEPLOYMENT**          | Use the JSON files in this folder with Terraform CLI, or stage them in a customer-controlled private source for OCI Resource Manager as described in [Deployment Steps](#4-deployment-steps). [Terraform CLI](/commons/content/terraform.md) can also be used. |

For customized OKE landing zones generated from a configuration file, see [OKE Config-Driven Generation](../config-driven.md).


&nbsp;

## **2. Architecture Overview**

This published simple multi-stack deployment uses the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) to add OKE to an existing **Hub E** landing zone. The orchestrator automatically resolves dependencies between resources using configuration keys instead of OCIDs.

The simple multi-stack path is a Hub E quickstart. For Hub A, Hub B, Hub C, multiple OKE platforms, overlay networking, or custom landing zone shapes, use [OKE Config-Driven Generation](../config-driven.md).

The published quickstart creates one pre-production OKE platform by default. Add production or additional OKE platforms through config-driven generation.

**Key Features:**
- **Automated Dependency Resolution**: Network resources (VCN, subnets, NSGs) are automatically linked to the OKE cluster using configuration keys using dependency exchange across stacks
- **CIS-Compliant**: Uses the CIS-compliant OKE module from [terraform-oci-modules-workloads](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- **OKE Network Modes**: Published JSON is VCN-native by default; config-driven generation can also emit an overlay network shape for Flannel-compatible clusters
- **No Hub L7 Load Balancer**: The published OKE stack does not provision a hub-level OCI L7 Load Balancer; Kubernetes `Service` resources of type `LoadBalancer` create OCI load balancers through OKE
- **Multi-Step Deployment**: Deploy the Hub E landing zone first, then deploy the OKE stack separately

&nbsp;

## **3. Configuration Files**

The deployment uses four JSON configuration files:

| File | Purpose |
| --- | --- |
| `oke_identity.json` | IAM resources: compartments, groups, and policies for OKE |
| `oke_network.json` | Network infrastructure: VCN, subnets, NSGs, route tables, service gateway, DRG attachment |
| `oke_clusters.json` | OKE cluster configuration: cluster settings, Kubernetes version, CNI type, networking |
| `oke_workers.json` | Node pool configuration: worker nodes, shape, size, networking, cloud-init |

### Additional Published Observability Outputs <!-- omit from toc -->

The published surface includes companion JSONs with CIS-aligned observability settings. Multi-stack OKE is deployed on top of an existing landing zone, so the security baseline artifacts come from that existing landing-zone stack and are not repeated in this extension package.

| File | Purpose |
| --- | --- |
| `oke_observability_cis1.json` | Observability settings (CIS profile 1) |
| `oke_observability_cis1_pre.json` | Pre-requisites for `oke_observability_cis1.json` |
| `oke_observability_cis2.json` | Observability settings (CIS profile 2) |
| `oke_observability_cis2_pre.json` | Pre-requisites for `oke_observability_cis2.json` |

&nbsp;

## **4. Deployment Steps** 

### Prerequisites <!-- omit from toc -->

- An existing One-OE Hub E landing zone deployment
- Access to OCI Console with appropriate permissions
- DRG (Dynamic Routing Gateway) already created in your Hub E landing zone

### Option A: Deploy via OCI Resource Manager

Use ORM only when the customer specifically wants ORM. Prefer Terraform CLI locally or from customer-controlled CI/CD for the default secure deployment path.

1. **Create ORM Stack**
   - Create the stack from the pinned orchestrator release and set the working directory to `rms-facade`.
   - Use the same pinned orchestrator tag referenced by the published OKE docs.

2. **Stage Configuration Files in a Private Source**
   - Upload `oke_workers.json`, `oke_network.json`, `oke_identity.json`, and `oke_clusters.json` to a customer-controlled private OCI Object Storage bucket, or make them available from an approved private GitHub source.
   - If you depend on outputs from a previously deployed landing zone, stage those dependency files in the same controlled source.
   - The previous public repo-hosted one-click example is not the recommended customer deployment path.

3. **Configure ORM Variables**
   - Set the configuration source to match the private location you chose.
   - Point the stack at the four staged JSON files and any required dependency files.

4. **Review Configuration Keys**

   Before deployment, verify these configuration keys match your Landing Zone:

   **In `oke_identity.json`:**
   - `CMP-LZ-PROD-PLATFORM-KEY` - Parent platform compartment
   - Adjust compartment/group/policy names to match your naming convention

   **In `oke_network.json`:**
   - `CMP-LZ-PROD-NETWORK-KEY` - Network compartment
   - `DRG-FRA-LZ-HUB-KEY` - Your DRG key
   - `DRGRT-FRA-LZ-SPOKES-KEY` - Your DRG route table key
   - CIDR blocks (`10.0.80.0/20`) - Adjust if conflicts with existing networks

5. **Run Terraform Plan**
   - Click **Next** to review the configuration
   - Click **Create** to create the stack
   - Click **Plan** to validate the configuration

6. **Apply Configuration**
   - Review the plan output
   - Click **Apply** to provision resources
   - Deployment typically takes 15-20 minutes

### Option B: Deploy via Terraform CLI

This is the preferred customer path because it keeps the deployable files under the customer's local or CI/CD control.

1. **Clone Repository**
   ```bash
   git clone https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator.git
   cd terraform-oci-modules-orchestrator
   ```

2. **Copy Configuration Files**
   ```bash
   cp /path/to/oke/*.json .
   ```

3. **Initialize and Deploy**
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

&nbsp;

## **5. Post-Deployment Configuration**

### Access the Cluster <!-- omit from toc -->
Kubernetes is deployed with control plane using internal IPs. It's required to access the cluster to be on the same / routable network with OKE

1. **Generate kubeconfig**
   ```bash
   oci ce cluster create-kubeconfig \
     --cluster-id <cluster-ocid> \
     --file ~/.kube/config \
     --region <region> \
     --token-version 2.0.0
   ```

2. **Verify Access**
   ```bash
   kubectl get nodes
   kubectl get pods -A
   ```

### Install OKE Add-ons <!-- omit from toc -->

The orchestrator module does not currently support add-on configuration. Install add-ons manually:

**CertManager:**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

**Metrics Server:**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

&nbsp;

## **6. Customization**

### Cluster Configuration <!-- omit from toc -->

Edit `oke_clusters.json`:

- **Kubernetes Version**: Change `kubernetes_version` to upgrade/downgrade
- **Cluster Type**: Set `is_enhanced: false` for basic clusters
- **Network CIDRs**: Adjust the OKE VCN CIDR and `options.kubernetes_network_config.services_cidr` for your networking requirements. In config-driven generation, auto-subnetting defaults to the `small` profile when `cluster_size` and manual OKE subnet CIDRs are omitted. In native mode, `pods_cidr` is optional passthrough. In overlay mode, `pods_cidr` represents the Kubernetes overlay pod range and defaults to `10.244.0.0/16` when omitted.
- **CNI Mode**: The published multi-stack JSON uses native networking. In config-driven generation, set workload-extension `cni_type: overlay` to select the overlay network shape; the OKE CNI is selected with `cni: flannel`.
- **Security**: Modify `is_api_endpoint_public` and NSG settings

### Native and Overlay Network Modes <!-- omit from toc -->

Config-driven `oke_simple` generation supports two OKE network shapes:

| Config parameter | Purpose | Supported values | Default |
| --- | --- | --- | --- |
| `cni_type` | Network shape emitted by this workload extension | `native`, `overlay` | `native` |
| `cni` | OKE cluster CNI requested from the downstream OKE module | `vcn_native`, `flannel` | `vcn_native` for native, `flannel` for overlay |

Native mode creates control plane, internal load balancer, worker, and pod subnets, plus pod route table, pod security list, pod NSG, and worker pod networking references.

Overlay mode creates only control plane, internal load balancer, and worker subnets. It omits the pod subnet and related pod network resources because pod addressing comes from the Kubernetes overlay pod CIDR. Do not set workload-extension `cni_type` to `flannel`; `flannel` is the OKE CNI value, while `overlay` is the workload-extension network shape.

For config-driven subnetting, prefer auto-subnet profiles. If `cluster_size` is omitted and no manual OKE subnet map is provided, the generator uses `small`. `small` requires an OKE VCN `/20`, `medium` requires `/18`, and `large` requires `/16`. Manual OKE subnet CIDRs are still supported by omitting `cluster_size` and defining `network.subnets` with the required native or overlay subnet keys.

### Worker Pool Configuration <!-- omit from toc -->

Edit `oke_workers.json`:

- **Node Count**: Change `size` to scale worker nodes
- **Instance Shape**: Modify `node_shape`, `ocpus`, `memory` for different compute resources
- **Worker Image**: Update `node_config_details.image` after checking the supported OKE worker images for the target Kubernetes version
- **Boot Volume**: Adjust `boot_volume.size` for storage requirements
- **SSH Access**: Update `default_ssh_public_key_path` with your SSH public key path
- **Cloud-init**: Customize `cloud_init` for additional node configuration

### Network Configuration <!-- omit from toc -->

Edit `oke_network.json`:

- **CIDR Blocks**: Adjust VCN and subnet CIDR blocks to avoid conflicts
- **NSG Rules**: Add/modify network security group rules for specific security requirements
- **Route Tables**: Update routing for connectivity to on-premises or other VCNs
- **DRG Attachment**: Modify DRG route table keys for inter-VCN routing

&nbsp;

## **7. Cleanup**

To destroy the OKE cluster and network infrastructure:

**Via ORM:**
1. Navigate to your stack in Resource Manager
2. Click **Destroy**
3. Confirm the action

**Via Terraform CLI:**
```bash
terraform destroy
```

> **Warning**: This will delete all resources including the OKE cluster, node pools, VCN, subnets, and compartments. Ensure you have backed up any important data.

&nbsp;

## **8. Troubleshooting**

### Common Issues <!-- omit from toc -->

**Issue**: Configuration key not found errors
- **Solution**: Verify all configuration keys in var-files match your Landing Zone resources
- Check compartment, network, and DRG keys exist in your parent Landing Zone

**Issue**: CIDR block conflicts
- **Solution**: Ensure VCN CIDR (`10.0.80.0/20`) doesn't overlap with existing VCNs
- Adjust subnet CIDRs in `oke_network.json`

**Issue**: Cluster creation fails
- **Solution**: Check IAM policies are correctly configured
- For native clusters, verify VCN-native CNI policy grants required permissions (see `oke_identity.json`)
- For overlay clusters, verify the source config uses workload-extension `cni_type: overlay` and `cni: flannel`, and that the generated worker node pool does not include `pods_subnet_id` or `pods_nsg_ids`

**Issue**: Nodes not joining cluster
- **Solution**: Verify NSG rules allow required traffic
- Check route tables have correct routes to service gateway
- Ensure worker subnet has connectivity to control plane subnet

&nbsp;


&nbsp;

## **9. Additional Resources**

- [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator)
- [CIS OKE Module Documentation](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- [OKE Documentation](https://docs.oracle.com/en-us/iaas/Content/ContEng/home.htm)
- [VCN-Native Pod Networking](https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-OCI_CNI_plugin.htm)
- [Flannel Pod Networking](https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengpodnetworking_topic-flannel_CNI_plugin.htm)

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
