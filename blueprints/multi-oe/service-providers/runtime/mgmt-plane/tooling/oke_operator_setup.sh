#!/bin/bash
set -euo pipefail

KUBECTL_VERSION=v1.34.1
ANSIBLE_VERSION=2.9.7

# Load Terraform-provided variables
source /tmp/oke_operator_setup.conf

echo "[INFO] Running oke_operator_setup.sh as $(whoami)"
echo "[INFO] Vars -> kubectl:$KUBECTL_VERSION ansible:$ANSIBLE_VERSION"

# Ensure PATH has ~/.local/bin for pip installs
export PATH=$HOME/.local/bin:/usr/local/bin:$PATH

# --- System deps ---
echo "[INFO] Installing system deps..."
sudo dnf -y install python3-pip curl unzip

# --- OCI CLI ---
if ! command -v oci >/dev/null 2>&1; then
  echo "[INFO] Installing OCI CLI..."
  curl -sSL https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh | sudo bash -s -- --accept-all-defaults --exec-dir /usr/local/bin --install-dir /usr/local/lib/oci-cli
else
  echo "[INFO] OCI CLI already installed."
fi

# --- kubectl ---
if ! command -v kubectl >/dev/null 2>&1 || [[ "$(kubectl version --client --output=yaml | grep gitVersion | awk '{print $2}')" != "$KUBECTL_VERSION" ]]; then
  echo "[INFO] Installing kubectl $KUBECTL_VERSION..."
  curl -sLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  rm -f kubectl
else
  echo "[INFO] kubectl $KUBECTL_VERSION already installed."
fi

# --- ansible ---
if ! ansible --version 2>/dev/null | grep -q "$ANSIBLE_VERSION"; then
  echo "[INFO] Installing ansible $ANSIBLE_VERSION..."
  pip3 install --user --upgrade pip
  pip3 install --user "ansible==${ANSIBLE_VERSION}"
else
  echo "[INFO] ansible $ANSIBLE_VERSION already installed."
fi

mkdir -p /home/opc/k8s-manifests
mkdir -p /home/opc/ansible-playbooks
mkdir -p /home/opc/ansible-playbooks/tasks

# --- grabbing K8S manifests ---
echo "[INFO] Grabbing K8S manifests..."
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/k8s-manifests/calico-policy.yml -o /home/opc/k8s-manifests/calico-policy.yml

# --- grabbing playbooks ---
echo "[INFO] Grabbing playbooks..."
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/inventory.yml -o /home/opc/ansible-playbooks/inventory.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/customer.yml -o /home/opc/ansible-playbooks/customer.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/tasks/customer_tasks.yml -o /home/opc/ansible-playbooks/tasks/customer_tasks.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/rbac.yml -o /home/opc/ansible-playbooks/rbac.yml
curl -s https://raw.githubusercontent.com/oci-landing-zones/oci-landing-zone-operating-entities/refs/heads/multi-tenant-pattern/blueprints/multi-oe/service-providers/runtime/mgmt-plane/tooling/ansible-playbooks/tasks/rbac_tasks.yml -o /home/opc/ansible-playbooks/tasks/rbac_tasks.yml

echo "[INFO] Done."
