## Multi-Tenant Model Customer Onboarding Stack Deployment

This stack is responsible for OKE intra-cluster configuration, supporting partitioning and isolation of customer workloads on shared infrastructure.

### Overall Deployment Sequence

1. [Mgmt Plane Foundational - IAM, Security, Governance](./MPLANE-FOUNDATIONAL.md)
2. [Mgmt Plane Networking 1st stage - Mgmt Plane VCNs](./MPLANE-NETWORKING.md#stage1)
3. [Mgmt Plane Networking - Firewall](./MPLANE-FIREWALL.md)
4. [Mgmt Plane Networking 2nd stage - Network routing post firewall deployment](./MPLANE-NETWORKING.md#stage2)
5. [Multi-tenant OKE - Oracle Kubernetes Engine](./MT-SHARED-OKE.md)
6. [Mgmt Plane Tooling](./MPLANE-TOOLING.md)
7. **Multi-Tenant Model - Customer Onboarding (this stack)**

### Stack Configuration

#### Requirements

The following tools are required for customer onboarding: OCI CLI, kubectl and Ansible.

Input Configuration Files | Description 
--------------------------|-------------------------------------------
[inventory.ini](../mgmt-plane/tooling/ansible-playbooks/inventory.ini) | Ansible inventory
[rbac.yml](../mgmt-plane/tooling/ansible-playbooks/rbac.yml)      | Optional. Ansible playbook for managing role and role binding definitions. Execute it for utilizing narrower roles (bound to OCI groups/users with constrained permissions) for managing Kubernetes clusters. 
[rbac-tasks.yml](../mgmt-plane/tooling/ansible-playbooks/tasks/rbac_tasks.yml)      | Ansible tasks for managing role and role binding definitions. It is part of *rbac.yml*.
[customer.yml](../mgmt-plane/tooling/ansible-playbooks/customer.yml)  | Ansible playbook for onboarding customers into Kubernetes cluster. It must be updated and executed for any new customer.
[customer-tasks.yml](../mgmt-plane/tooling/ansible-playbooks/tasks/customer_tasks.yml) | Ansible tasks for managing namespaces, quota policies and network policies. Each customer is assigned a namespace, a quota policy and a network policy. It is part of *customer.yml*.

### Stack Creation

1. Make above files available in a machine where you have OCI CLI, kubectl, Ansible installed and network access to OKE API endpoint. [Mgmt Plane Tooling](./MPLANE-TOOLING.md) stack deploys an operator host for OKE with all necessary tooling, Ansible playbooks, manifest files and network access enabled to OKE cluster API endpoint.
2. 
3. Execute the Ansible playbooks:
    - 2.1. > ansible-playbook ~/ansible-playbooks/rbac.yml (Optional. Execute it for utilizing narrower roles (bound to OCI groups/users with constrained permissions) for managing Kubernetes clusters)
    - 2.2. > kubectl apply -f ~/k8s-manifests/calico-policy.yml (Required for deploying Calico)
    - 2.3. > ansible-playbook ~/ansible-playbooks/customer.yml (Required for onboarding customers in Kubernetes cluster. It creates a namespace, quota policy and network policy for the customer. It must be updated and executed for any new customer.)

### What Gets Deployed

The resources in red color are added.

![shared-mt](../../design/images/customer-1-mt.png)
