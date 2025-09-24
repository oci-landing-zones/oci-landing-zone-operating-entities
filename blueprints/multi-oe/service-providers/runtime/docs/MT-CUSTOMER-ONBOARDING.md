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
[rbac.yml](../mgmt-plane/tooling/ansible-playbooks/rbac.yml)  | **Optional**, Ansible playbook for managing role and role binding definitions. Execute it for utilizing narrower roles (bound to OCI groups/users with constrained permissions) for managing Kubernetes clusters. 
[rbac-tasks.yml](../mgmt-plane/tooling/ansible-playbooks/tasks/rbac_tasks.yml)  | **Optional**, Ansible tasks for managing role and role binding definitions. It is part of *rbac.yml*.
[calico-policy.yml](../mgmt-plane/tooling/k8s-manifests/calico-policy.yml) | **Required** for utilizing Kubernetes network policies.
[customer.yml](../mgmt-plane/tooling/ansible-playbooks/customer.yml)  | **Required**, Ansible playbook for onboarding customers into Kubernetes cluster. It must be updated and executed for any new customer.
[customer-tasks.yml](../mgmt-plane/tooling/ansible-playbooks/tasks/customer_tasks.yml) | **Required**, Ansible tasks for managing Kubernetes namespaces, quota policies and network policies. Each customer is assigned a namespace, a quota policy and a network policy. It is part of *customer.yml*.

### Stack Deployment

1. Make above files available in a machine where you have OCI CLI, kubectl, Ansible installed and network access enabled to OKE API endpoint. [Mgmt Plane Tooling](./MPLANE-TOOLING.md) stack deploys an operator host for the *Dev* lifecycle environment, with all necessary tooling, as well as including Ansible playbooks, manifest files and network access enabled to OKE cluster API endpoint.

#### One-Time Setup

2. If you are using the pre-configured OKE operator host provided by [Mgmt Plane Tooling](./MPLANE-TOOLING.md) stack, ssh into it as the *opc* user.
3. Generate a kubeconfig file for accessing the OKE cluster (notice and make sure to replace the values in between <>)
    - 3.1. > ```mkdir -p $HOME/.kube```
    - 3.2. > ```oci ce cluster create-kubeconfig --cluster-id <REPLACE-WITH-OKE-CLUSTER-OCID> --file $HOME/.kube/config --region <REPLACE-WITH-OKE-CLUSTER-REGION-NAME> --token-version 2.0.0  --kube-endpoint PRIVATE_ENDPOINT``` 
    - 3.3. > ```export KUBECONFIG=$HOME/.kube/config```
4. Execute the following playbooks/manifests:
    - 4.1. > ```ansible-playbook ~/ansible-playbooks/rbac.yml``` (**Optional**. Execute it for utilizing a narrower role - bound to OCI groups/users with constrained permissions - for managing Kubernetes clusters.)
    - 4.2. > ```kubectl apply -f ~/k8s-manifests/calico-policy.yml``` (**Required** for enabling Kubernetes network policies.)

#### For each customer  

- 4.3. > ```ansible-playbook ~/ansible-playbooks/customer.yml``` (**Required** for onboarding customers in Kubernetes cluster. It creates a namespace, quota policy and network policy for each customer. It must be updated and executed for any new customer.)

### What Gets Deployed

To be completed.
