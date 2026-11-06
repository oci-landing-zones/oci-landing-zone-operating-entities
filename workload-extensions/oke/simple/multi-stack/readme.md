# OKE Workload Extension - Multi-Stack Deployment  <!-- omit from toc -->

Supported releases: Orchestrator **v2.4.1** with CIS OKE **v0.3.0** only.

> **Migration warning:** Existing deployments require Terraform state and input migration from the legacy split OKE contract. Do not simply apply the new generated files to existing state; back up state and review the migration and plan first.

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

&nbsp;

## **2. Architecture Overview**

This simple multi-stack deployment uses the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator) to add OKE to an existing **Hub E** landing zone. The orchestrator automatically resolves dependencies between resources using configuration keys instead of OCIDs.

The simple multi-stack path is a Hub E quickstart that creates one production OKE platform.

**Key Features:**
- **Automated Dependency Resolution**: Network resources (VCN, subnets, NSGs) are automatically linked to the OKE cluster using configuration keys using dependency exchange across stacks
- **CIS-Compliant**: Uses the CIS-compliant OKE module from [terraform-oci-modules-workloads](https://github.com/oci-landing-zones/terraform-oci-modules-workloads/tree/main/cis-oke)
- **Encryption**: The included `oke.json` uses CIS1 with OCI-managed encryption and explicit worker `pv_transit_encryption: false`. Worker boot-volume encryption in transit is enabled only for CIS2 generation.
- **IAM profile**: `oke_identity.json` is rendered from CIS2 and includes compartment-scoped KMS authority. It is dormant for this quickstart because the CIS1 `oke.json` contains no KMS key reference; keep unrelated keys out of the OKE platform compartment.
- **OKE Network Mode**: The committed JSON uses VCN-native networking
- **Public workload ingress**: OKE has narrowly scoped permissions to create public OCI Load Balancers in the prepared Hub subnet; the quickstart does not provision a Terraform-managed Hub L7 Load Balancer
- **Multi-Step Deployment**: Deploy the Hub E landing zone first, then deploy the OKE stack separately

Before granting Kubernetes Service permissions, review the shared [private and public LB/NLB Service examples](../readme.md#deploying-workload-load-balancers) and [additional operational notes](../readme.md#additional-operational-notes).

&nbsp;

## **3. Configuration Files**

The deployment uses four JSON configuration files.

| File | Purpose |
| --- | --- |
| `oke_identity.json` | IAM resources rendered from CIS2: compartments, groups, and policies for OKE |
| `oke_governance.json` | OKE platform tag namespace and tag definition; include it in the initial apply before introducing tagged network, IAM, or cluster resources |
| `oke_network.json` | Network infrastructure: OKE VCN, subnets, NSGs, route tables, service gateway, DRG attachment, and a Hub-network-owned, platform-tagged frontend NSG injected into the existing Hub VCN through `network_dependency` |
| `oke.json` | Consolidated OKE configuration: cluster settings and managed worker pools |

### Staged Observability Files <!-- omit from toc -->

The folder includes companion JSONs with CIS-aligned observability settings. Multi-stack OKE is deployed on top of an existing Landing Zone, so it does not repeat the security baseline or security resources owned by that Landing Zone.

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

Prefer ORM with configuration files staged in a customer-controlled private OCI Object Storage bucket. Terraform CLI and customer-controlled CI/CD remain supported alternatives.

1. **Create ORM Stack**
   - Use Orchestrator `v2.4.1` with CIS OKE `v0.3.0` and set the working directory to `rms-facade`.

2. **Stage Configuration Files in a Private Source**
   - Upload `oke_governance.json`, `oke_network.json`, `oke_identity.json`, and `oke.json` to a customer-controlled private OCI Object Storage bucket, or make them available from an approved private GitHub source.
   - If you depend on outputs from a previously deployed landing zone, stage those dependency files in the same controlled source.

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

Use this alternative when local Terraform or customer-controlled CI/CD is required.

1. **Clone Repository**
   ```bash
   git clone https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator.git
   cd terraform-oci-modules-orchestrator
   git checkout tags/v2.4.1
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

**cert-manager:**
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.21.0/cert-manager.yaml
```

This pinned release supports the included Kubernetes `v1.35.2` baseline. Let’s Encrypt can terminate in Kubernetes with cert-manager and an ingress controller, or at OCI LB using an imported certificate maintained by a security-owned external pipeline. OKE and Kubernetes do not renew OCI certificates. Review the shared [operational and security notes](../readme.md#operational-and-security-notes) before choosing a model.

**Metrics Server:**
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

&nbsp;

## **6. Customization**

### Cluster Configuration <!-- omit from toc -->

In `oke.json`, each `oke_configuration.<cluster-key>` contains `cluster_configuration` and `workers_configuration.worker_pools`. Review `cluster_configuration` for:

- **Kubernetes Version**: Change `kubernetes_version` to upgrade/downgrade
- **Cluster Type**: Enhanced clusters and private API endpoints are implicit in the supported contract; basic/public flags and `add_ons` are not supported.
- **Network CIDRs**: Adjust the OKE VCN CIDR and `options.kubernetes_network_config.services_cidr` for your networking requirements.
- **CNI Mode**: The committed multi-stack JSON uses native networking.
- **Security**: Review `networking.api_endpoint_nsg_ids` and private access routes. Service load-balancer subnets are a list under `networking.service_lb_subnet_ids`, not `services_subnet_id`.

### Worker Pool Configuration <!-- omit from toc -->

In the same `oke.json`, edit `oke_configuration.<cluster-key>.workers_configuration.worker_pools.<nodepool-key>`. Compartment and CIS settings are inherited from the cluster; worker properties are flat:

- **Node Count**: Change `size` to scale worker nodes
- **Instance Shape**: Modify `shape`, `ocpus`, and `memory` for different compute resources.
- **Worker Image**: Source `worker_image` defaults to the numeric version string `'9'`; use an OL8/OL9 major or minor version, or an image OCID. Generated workers use `os_version` or `image_id`, not regex image selectors. Only the deprecated known family selectors `8\\.[0-9]+` and `9\\.[0-9]+` are normalized to `8` and `9` for compatibility.
- **Encryption**: The committed CIS1 worker has explicit `pv_transit_encryption: false` and no `volume_kms_key_id`. CIS2 sets `pv_transit_encryption: true` and the generated `volume_kms_key_id`.
- **Boot Volume**: Adjust `boot_volume_size`; upstream cloud-init remains enabled and handles filesystem growth and OKE bootstrap.
- **Networking**: Worker placement uses `subnet_id` and `nsg_ids`; native pod placement uses `pod_subnet_id` and `pod_nsg_ids`. Overlay workers omit the pod fields.
- **SSH Access**: Update `default_ssh_public_key_path` with your SSH public key path
- **Cloud-init**: CIS1 emits no custom cloud-init. CIS2 adds only a cloud-config installing `oci-fss-utils` with `dnf` from the runtime OL major-version developer repository. Do not replace upstream growfs/bootstrap.

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
- For overlay clusters, verify the source config uses workload-extension `cni_type: overlay` and `cni: flannel`, and that the generated worker pool does not include `pod_subnet_id` or `pod_nsg_ids`. Overlay `pods_cidr` defaults to `10.244.0.0/16`; native mode rejects `pods_cidr`.

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
