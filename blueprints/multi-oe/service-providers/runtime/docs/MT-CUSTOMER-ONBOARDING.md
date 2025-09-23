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

The following tools (with where to get them downloaded) are required for OKE cluster configuration/management:

- OCI CLI
- Kubectl
- Ansible
- Calico

Input Configuration Files | Description 
--------------------------|-------------------------------------------
rbac-play.yml      | Optional. Ansible playbook for managing role and role binding definitions. Execute it for utilizing narrower roles (bound to OCI groups/users with constrained permissions) for managing Kubernetes clusters. 
rbac-tasks         | Ansible tasks for managing role and role binding definitions. It is part of *rbac-play.yml*.
customer-play.yml  | Ansible playbook for onboarding customers into Kubernetes cluster. It must be updated and executed for any new customer.
customer-tasks.yml | Ansible tasks for managing namespaces, quota policies and network policies. Each customer is assigned a namespace, a quota policy and a network policy. It is part of *customer-play*.yml.

### Stack Creation

1. Make above files available in a machine where you have Ansible installed and access to OKE API endpoint. [Multi-tenant OKE - Oracle Kubernetes Engine](./MT-SHARED-OKE.md) stack deploys an operator host for OKE with access to OKE API endpoint enabled.
2. Execute the Ansible playbooks:
    - 2.1. > ansible-playbook rbac-play.yml (Optional. Execute it for utilizing narrower roles (bound to OCI groups/users with constrained permissions) for managing Kubernetes clusters)
    - 2.2. > ansible-playbook customer-play.yml (Execute for onboarding customers in Kubernetes cluster. It must be updated and executed for any new customer.)

### What Gets Deployed

The resources in red color are added.

![shared-mt](../../design/images/customer-1-mt.png)
