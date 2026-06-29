# VM-Based Bastion In The Hub

Use a VM-based bastion when the customer needs a customer-managed access host in the hub VCN. This is the right option when the bastion must run endpoint agents, custom tooling, database clients, browser tooling, SOCKS proxies, file transfer utilities, or customer compliance controls.

## 1. Benefits And Downsides

| Benefits | Downsides |
|---|---|
| Customer can install EDR, monitoring, management, proxy, database, browser, or compliance agents. | Customer owns OS patching, image lifecycle, hardening, backup, capacity, key management, and drift. |
| Works with familiar SSH jump host and proxy patterns. | A compromised bastion can become a privileged lateral movement point. |
| Can reach many spokes when routing, firewall policy, DNS, and target security rules allow it. | Long-running hosts need continuous vulnerability scanning, logging, and operational ownership. |
| Can host SQL Developer, browser tooling, command line tools, and customer-specific diagnostics. | Requires more operational effort than OCI Bastion service sessions. |

## 2. Landing Zone Placement

Recommended placement:

- Compartment: hub network or security management compartment.
- Subnet: private hub management subnet.
- Public IP: disabled.
- Image: hardened customer-approved Linux image.
- Access path: private enterprise path such as VPN, FastConnect, Secure Desktops, a customer admin network, or OCI Bastion service.
- Egress: only what is required for patching, agent control planes, repositories, and target access.

The VM should not be placed in a public subnet for production Landing Zones.

## 3. Network Requirements

The hub-to-target path must be routed and permitted:

1. Hub management subnet route table reaches target spoke CIDRs through the selected hub model path.
2. Spoke route table returns hub management or bastion subnet CIDRs.
3. Firewall policy allows only required destination ports.
4. Target security list or NSG allows required ports from the bastion private IP or bastion subnet CIDR.
5. Target host firewall allows the same ports.
6. DNS resolution works for private endpoint FQDNs.

Common target ports:

| Target | Port |
|---|---:|
| Linux VM SSH | `22` |
| Windows VM RDP | `3389` |
| Autonomous Database private endpoint | `1521` |
| Internal HTTPS UI or OIC internal endpoint | `443` |

## 4. IAM And Host Setup

The VM itself uses normal Compute IAM and network permissions. Operators still need target credentials:

- SSH key or identity credentials for the VM bastion.
- SSH keys or OS credentials for private Linux and Windows targets.
- Database credentials and wallet for Autonomous Database.
- Application credentials for OIC or internal applications.

Recommended host controls:

- Enable OCI Vulnerability Scanning and OCI Monitoring agent where supported.
- Install customer EDR and management agents.
- Disable password SSH login unless explicitly required.
- Restrict SSH to approved source CIDRs or an upstream private access service.
- Use named accounts or short-lived credentials rather than shared operator accounts.
- Enable audit logging for SSH sessions and privileged commands.
- Patch through an approved repository path. Private subnets may need NAT gateway, service gateway, mirrored repositories, or an enterprise package proxy.

## 5. Mac And Linux OpenSSH

### SSH through the bastion to a private VM

```bash
ssh -i <operator_private_key> \
  -J <bastion_user>@<bastion_private_ip_or_fqdn> \
  <target_user>@<target_private_ip_or_fqdn>
```

Equivalent explicit proxy form:

```bash
ssh -i <target_private_key> \
  -o ProxyCommand="ssh -i <bastion_private_key> -W %h:%p <bastion_user>@<bastion_private_ip_or_fqdn>" \
  <target_user>@<target_private_ip_or_fqdn>
```

### Local port forward for one private service

Forward local port `8443` to a private HTTPS endpoint:

```bash
ssh -i <bastion_private_key> \
  -N \
  -L 127.0.0.1:8443:<target_private_ip_or_fqdn>:443 \
  <bastion_user>@<bastion_private_ip_or_fqdn>
```

Then browse to:

```text
https://127.0.0.1:8443
```

If the application requires the original hostname for TLS or redirects, prefer SOCKS5 proxying or bind the local port to `443` and map the application hostname to `127.0.0.1` in the local hosts file. Binding local port `443` can require elevated privileges on many operating systems.

### SOCKS5 proxy for UI applications

```bash
ssh -i <bastion_private_key> \
  -N \
  -D 127.0.0.1:1080 \
  <bastion_user>@<bastion_private_ip_or_fqdn>
```

Configure the browser SOCKS5 proxy:

```text
SOCKS host: 127.0.0.1
SOCKS port: 1080
Proxy DNS through SOCKS: enabled when available
```

This is usually better for private UI applications and OIC internal endpoints because the browser keeps the original FQDN.

## 6. Windows OpenSSH

Windows 10 and later commonly include OpenSSH Client. From PowerShell:

```powershell
ssh -i C:\Users\<user>\.ssh\<key_file> `
  -N `
  -L 127.0.0.1:8443:<target_private_ip_or_fqdn>:443 `
  <bastion_user>@<bastion_private_ip_or_fqdn>
```

For SOCKS5:

```powershell
ssh -i C:\Users\<user>\.ssh\<key_file> `
  -N `
  -D 127.0.0.1:1080 `
  <bastion_user>@<bastion_private_ip_or_fqdn>
```

Keep the PowerShell window open while using the tunnel.

## 7. Windows PuTTY

For one local forward:

1. Open PuTTY.
2. Set **Host Name** to the bastion private IP or FQDN.
3. Set **Port** to `22`.
4. Under **Connection > SSH > Auth**, select the `.ppk` private key.
5. Under **Connection > SSH > Tunnels**, set:
   - **Source port**: `8443`
   - **Destination**: `<target_private_ip_or_fqdn>:443`
   - **Local** selected
6. Select **Add**.
7. Select **Open** and keep the PuTTY session open.
8. Browse to `https://127.0.0.1:8443`.

For SOCKS5:

1. Under **Connection > SSH > Tunnels**, set **Source port** to `1080`.
2. Select **Dynamic** and **Auto**.
3. Select **Add**.
4. Open the PuTTY session and configure the browser to use SOCKS5 `127.0.0.1:1080`.

Use PuTTYgen to convert OpenSSH keys to `.ppk` format when needed.

## 8. SQL Developer With A VM Bastion

For Autonomous Database or another private database endpoint:

1. Confirm the database private endpoint resolves from the bastion path.
2. Allow TCP `1521` from the bastion private IP or bastion subnet CIDR to the database private endpoint.
3. Open a local forward:

```bash
ssh -i <bastion_private_key> \
  -N \
  -L 127.0.0.1:1522:<database_private_endpoint_fqdn_or_ip>:1521 \
  <bastion_user>@<bastion_private_ip_or_fqdn>
```

4. In SQL Developer, create a connection using the customer-approved database wallet and credentials.
5. Configure the connection to use `127.0.0.1` and local port `1522` when the connection type allows host and port override.

If the database client must use the private endpoint hostname for TLS verification, use a hosts-file mapping or a SOCKS-aware JDBC/client configuration that preserves the original hostname.

## 9. Operations

Operational ownership includes:

- patch schedule;
- vulnerability remediation;
- SSH key rotation;
- agent lifecycle;
- bastion host logging;
- session recording if required by customer policy;
- emergency access break-glass flow;
- decommissioning and evidence retention.

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
