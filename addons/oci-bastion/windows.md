# Use OCI Bastion from Windows

Use PowerShell with the Windows OpenSSH **Client** for the tunnel, a dedicated Firefox profile for database web access, and PuTTY for a Linux VM connection through SOCKS5. Review the [session prerequisites](./oci-bastion-dynamic-port-forwarding-session.md#before-connecting) and [target access requirements](./README.md#prepare-target-access) first.

## 1. Prepare the client and create a session

Check the SSH client in PowerShell:

```powershell
ssh -V
```

If it is unavailable, install **OpenSSH Client** through Windows Optional Features, following [Microsoft's instructions](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse). The workstation does not need OpenSSH Server. Use a supported Windows version and keep the private key in a location accessible only to its owner.

Follow the [Console session steps](./oci-bastion-dynamic-port-forwarding-session.md#create-a-session-in-the-console) to avoid installing OCI CLI. Register the public half of your approved OpenSSH session key pair; retain the private half locally.

For OCI CLI instead, configure your approved authentication method and replace the following values in PowerShell. The separate ASCII JSON file avoids differences in native-command quote handling between Windows PowerShell and newer PowerShell versions.

```powershell
$OciProfile = 'your-configured-profile'
$OciRegion = 'your-bastion-region'
$BastionId = 'your-bastion-ocid'
$SessionPublicKey = 'C:\absolute\path\session-public-key.pub'
Set-Content -Path .\dynamic-session.json -Value '{"sessionType":"DYNAMIC_PORT_FORWARDING"}' -Encoding ascii
oci bastion session create `
  --profile $OciProfile --region $OciRegion `
  --bastion-id $BastionId `
  --target-resource-details file://dynamic-session.json `
  --ssh-public-key-file $SessionPublicKey `
  --display-name operator-access `
  --session-ttl-in-seconds 3600 `
  --wait-for-state SUCCEEDED
```

Use a TTL no greater than the Bastion maximum. Record the returned session OCID, wait for **Active**, and copy its SSH command in the Console. CLI users can inspect it with:

```powershell
$SessionId = 'your-session-ocid'
oci bastion session get --profile $OciProfile --region $OciRegion --session-id $SessionId
```

## 2. Start the SOCKS5 tunnel

Copy the exact `session-ocid@bastion-host` from **Copy SSH command** into `$SessionTarget`. Keep key paths quoted; do not replace the session OCID with a VM username or guess the Bastion hostname.

```powershell
$SessionKey = 'C:\absolute\path\session-private-key'
$SessionTarget = 'your-session-ocid@your-copied-bastion-host'
ssh -i "$SessionKey" -N -D 127.0.0.1:1080 `
  -o ExitOnForwardFailure=yes `
  -o ServerAliveInterval=120 -o ServerAliveCountMax=3 `
  -p 22 "$SessionTarget"
```

Verify the Bastion host identity through your approved process. Enter the private-key passphrase if prompted and keep PowerShell open. The command remains in the foreground while the tunnel is active. Open a separate window for further commands.

## 3. Open a private database web interface

Create a dedicated Firefox profile at `about:profiles` and launch it for private access. Open **Settings**, find **Network Settings** or **Proxy settings**, and select **Settings/Configure proxy**. Firefox versions can place these controls under General or Privacy & Security; see [Mozilla's current guide](https://support.mozilla.org/en-US/kb/connection-settings-firefox).

Select **Manual proxy configuration** and set:

| Setting | Value |
|---|---|
| HTTP/HTTPS proxy | Leave empty. |
| SOCKS Host | `127.0.0.1` |
| Port | `1080` |
| SOCKS version | **SOCKS v5** |
| Proxy DNS when using SOCKS v5 | Enabled. |
| No Proxy For | Do not include the private target hostname or domain. |

Open the original private Database Actions or APEX HTTPS URL from the database's tools page. Authenticate with the database account and keep TLS validation enabled. Any redirect destination must also be reachable from the Bastion path. These settings apply to this Firefox profile; do not enter the SOCKS listener as a Windows HTTP proxy.

In a second PowerShell window, test a private HTTPS endpoint with:

```powershell
curl.exe --proxy socks5h://127.0.0.1:1080 --connect-timeout 15 --max-time 30 'https://your-private-hostname/'
```

Use `curl.exe` explicitly because some PowerShell versions alias `curl` to another command. `socks5h` delegates hostname resolution to the proxy. Do not disable certificate checks. See [curl's SOCKS options](https://curl.se/docs/manpage.html#--socks5-hostname).

## 4. Connect to a private Linux VM with PuTTY

Keep the OpenSSH tunnel running. Install [PuTTY and PuTTYgen](https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html) from the official distribution if they are not available under your organization's software policy.

1. In PuTTY, set **Host Name** to the Linux VM's private hostname or IP, **Port** to `22`, and connection type **SSH**.
2. Under **Connection > Proxy**, select **SOCKS 5**, set **Proxy hostname** to `127.0.0.1` and **Port** to `1080`, and set **Do DNS name lookup at proxy end** to **Yes**. Leave proxy username/password empty: the local SSH SOCKS listener does not require them.
3. Under **Connection > Data**, enter the VM's image-specific username, for example `opc`.
4. Under **Connection > SSH > Auth > Credentials**, select the **VM's** private key. If it is in OpenSSH format, import it with PuTTYgen and save a protected `.ppk` copy. This is separate from the key used to authenticate the Bastion tunnel.
5. Open the connection and verify the VM host-key fingerprint against an approved source before logging in.

The target rules must permit TCP 22 from the Bastion path. PuTTY connects to the private target through SOCKS; do not set the target host to the SOCKS listener. See the [PuTTY proxy and DNS configuration](https://the.earth.li/~sgtatham/putty/latest/htmldoc/Chapter4.html#config-proxy).

## 5. Connect to a private Windows VM

Confirm RDP is enabled, the target allows TCP 3389 from the Bastion path, and you have an authorized Windows VM account. First validate local forwarding on the dynamic session in your environment; see the [application-access notes](./oci-bastion-dynamic-port-forwarding-session.md#application-access).

Stop the OpenSSH tunnel with **Ctrl+C**, then restart it with the additional local listener. Replace `your-windows-private-ip` with the VM's actual private IP:

```powershell
ssh -i "$SessionKey" -N -D 127.0.0.1:1080 `
  -L 127.0.0.1:13389:your-windows-private-ip:3389 `
  -o ExitOnForwardFailure=yes `
  -o ServerAliveInterval=120 -o ServerAliveCountMax=3 `
  -p 22 "$SessionTarget"
```

From another PowerShell window, open the built-in Remote Desktop Connection client:

```powershell
mstsc.exe /v:127.0.0.1:13389
```

Use the Windows VM account, verify the remote identity/certificate through your approved process, and keep NLA enabled. The loopback connection can show a name different from the remote certificate; confirm the expected remote identity rather than disabling checks. This client-side `-L` listener uses the existing OCI **dynamic** session; no other OCI session type is created. The tunnel carries TCP, not RDP's optional UDP traffic. See [Microsoft's mstsc reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/mstsc).

## 6. End access

Close target clients, stop the tunnel with **Ctrl+C**, and close the dedicated Firefox profile or restore its previous proxy setting. Delete the session in the Console, or use:

```powershell
oci bastion session delete --profile $OciProfile --region $OciRegion --session-id $SessionId
```

The CLI asks for deletion confirmation. Remove `dynamic-session.json` when it is no longer needed. Expired sessions require a new session and a new `$SessionTarget`; keepalives do not renew them. See [troubleshooting](./oci-bastion-dynamic-port-forwarding-session.md#troubleshooting).

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
