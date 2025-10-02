#!/bin/bash

# Exits immediately if a command exits with a non-zero status.
set -e

if [[ "$EUID" -ne 0 ]]; then
  echo "[ERROR]------ This script must be run as root. Please use sudo."
  exit 1
fi

# --- kubectl ---
KUBE_LATEST_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
KUBE_DESTINATION="/usr/bin/kubectl"
echo "[INFO]------ Installing kubectl $KUBE_LATEST_VERSION..."
curl -LO "https://dl.k8s.io/release/$KUBE_LATEST_VERSION/bin/linux/amd64/kubectl"
chmod +x ./kubectl
mv ./kubectl "$KUBE_DESTINATION"
echo "[INFO]------ kubectl client version:"
kubectl version --client
echo "[INFO]------ Done with kubectl."

# --- ansible ---
echo "[INFO]------ Uninstalling ansible..."
/usr/bin/python3 -m pip uninstall ansible --yes
echo "[INFO]------ Installing newer ansible version..."
/usr/bin/python3 -m pip install --user ansible
echo "[INFO]------ Installing openshift dependency..."
/usr/bin/python3 -m pip install --user openshift
echo "[INFO]------ Done with ansible."

mkdir -p /home/opc/k8s-manifests
mkdir -p /home/opc/ansible-playbooks
mkdir -p /home/opc/ansible-playbooks/tasks

# --- grabbing K8S manifests ---
echo "[INFO]------ Grabbing K8S manifests..."
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/k8s-manifests/calico-policy.yml -o /home/opc/k8s-manifests/calico-policy.yml

# --- grabbing playbooks ---
echo "[INFO]------ Grabbing playbooks..."
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/inventory.yml -o /home/opc/ansible-playbooks/inventory.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/customer.yml -o /home/opc/ansible-playbooks/customer.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/tasks/customer_tasks.yml -o /home/opc/ansible-playbooks/tasks/customer_tasks.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/rbac.yml -o /home/opc/ansible-playbooks/rbac.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/tasks/rbac_tasks.yml -o /home/opc/ansible-playbooks/tasks/rbac_tasks.yml

chown -R opc:opc /home/opc/k8s-manifests
chown -R opc:opc /home/opc/ansible-playbooks 

echo "[INFO]------ oke_operator_setup.sh is done."
