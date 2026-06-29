# OCI Bastion Managed SSH Session

Use an OCI Bastion managed SSH session for short-lived SSH access to a private Compute instance that satisfies the managed SSH requirements.

This is a Compute-instance access pattern. It is not the right pattern for private Autonomous Database, OIC internal endpoints, generic HTTPS UIs, or services that do not run OpenSSH on a Compute instance.

## 1. When To Use

Use managed SSH when:

- the target is a private Linux Compute instance;
- the target runs OpenSSH;
- Oracle Cloud Agent is enabled on the target;
- the Bastion plugin is enabled on the target;
- the customer wants short-lived access without operating a jump host VM.

Use [SSH port forwarding](./oci-bastion-port-forwarding-session.md) or [dynamic port forwarding](./oci-bastion-dynamic-port-forwarding-session.md) instead when the target is a database, private UI, OIC internal endpoint, RDP service, or another TCP service.

## 2. Benefits And Downsides

| Benefits | Downsides |
|---|---|
| No customer-managed jump host OS. | Compute target only. |
| Short-lived sessions with explicit session creation. | Requires target OpenSSH and Oracle Cloud Agent Bastion plugin. |
| Good fit for private Linux VM administration. | Not useful for ATP, OIC internal endpoints, or generic private TCP services. |
| Uses OCI Bastion IAM and audit surfaces. | For strict OCI-documented behavior, keep the Bastion in the target VCN. |

## 3. Landing Zone Placement

For a central hub design, place the OCI Bastion service in the hub security compartment targeting the hub management subnet. However, OCI documentation states that a Bastion resource is associated with a single VCN. For managed SSH, the conservative pattern is:

- create the Bastion in the same VCN as the target Compute instance; or
- use a VM-based hub bastion or dynamic forwarding pattern for cross-spoke access after customer validation.

Do not rely on managed SSH as the primary "one hub Bastion reaches every spoke" pattern.

## 4. IAM Requirements

Operators need enough permission to use the Bastion and create sessions. Typical permissions include:

- `use bastion` in the Bastion compartment;
- `manage bastion-session` in the session or target scope;
- read access to target Compute instances;
- read/use network access where the Bastion target subnet and VCN are referenced.

Security administrators who create and operate the Bastion resource need `manage bastion-family` in the compartment that contains the Bastion.

## 5. Network Requirements

Verify:

1. The client public IP or VPN egress CIDR is in the Bastion client CIDR allowlist.
2. The target subnet or NSG allows TCP `22` from the Bastion private endpoint IP.
3. The target host firewall allows SSH.
4. The VCN has the gateway and route path required by the managed SSH service requirements.
5. Firewall hub policies allow the access path if the target is reached through a firewall model.

## 6. Create The Bastion

Create the Bastion in the approved compartment and private target subnet. Keep the client CIDR allowlist narrow.

```bash
oci bastion bastion create \
  --bastion-type standard \
  --compartment-id <security_compartment_ocid> \
  --target-subnet-id <target_subnet_ocid> \
  --name <bastion_name> \
  --client-cidr-list '["<approved_client_public_cidr>"]' \
  --max-session-ttl 10800
```

FQDN/SOCKS5 support is not required for managed SSH, but enabling it can keep the Bastion resource usable for dynamic forwarding sessions too.

## 7. Create A Managed SSH Session

In the OCI Console:

1. Open the Bastion resource.
2. Select **Sessions**.
3. Create a **Managed SSH session**.
4. Enter the target OS username, such as `opc`.
5. Select the target Compute instance.
6. Add the operator public key.
7. Set a short session TTL.
8. Create the session.
9. Copy the generated SSH command.

OCI CLI shape:

```bash
oci bastion session create-managed-ssh \
  --bastion-id <bastion_ocid> \
  --target-resource-id <target_instance_ocid> \
  --target-os-username <target_os_user> \
  --key-details '{"publicKeyContent":"<public_key_content>"}' \
  --session-ttl-in-seconds 3600
```

Use the current OCI CLI command reference for the exact parameters supported by the installed CLI version.

## 8. Connect From Mac, Linux, Or Windows OpenSSH

Use the SSH command copied from the OCI Console. Replace the private key placeholder with the local private key path.

Mac or Linux example shape:

```bash
ssh -i <private_key_path> <copied_bastion_session_target>
```

Windows PowerShell example shape:

```powershell
ssh -i C:\Users\<user>\.ssh\<key_file> <copied_bastion_session_target>
```

Keep the session TTL in mind. When the OCI Bastion session expires, create a new session and use the new copied command.

## 9. PuTTY Guidance

For Windows users, OpenSSH is the simplest managed SSH client because the OCI Console gives an OpenSSH command. If PuTTY is required:

1. Convert the private key to `.ppk` format using PuTTYgen.
2. Copy the Bastion host, session username, target details, and any proxy command information from the generated SSH command.
3. Configure PuTTY with the Bastion host on port `22` and the `.ppk` key.
4. If the generated command uses a proxy command, use Plink or the Windows OpenSSH client instead unless the customer has a standard PuTTY proxy configuration.

For PuTTY-based local tunnels, use [OCI Bastion SSH port forwarding session](./oci-bastion-port-forwarding-session.md), which maps cleanly to PuTTY's **Tunnels** settings.

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Target instance is not selectable | Instance is not active, is in a different scope, or required read permissions are missing. |
| Session cannot be created | Missing `use bastion`, `manage bastion-session`, instance read, or network read permissions. |
| SSH connects to Bastion but not target | Target security list/NSG, host firewall, route, plugin, or OpenSSH issue. |
| Session stops working | Session TTL expired. Create a new session. |
| PuTTY setup is complex | Use Windows OpenSSH or use a port forwarding session instead. |

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
