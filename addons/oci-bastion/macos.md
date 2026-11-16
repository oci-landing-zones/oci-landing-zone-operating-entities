# Use OCI Bastion from macOS

Use Terminal's OpenSSH client for the tunnel and a dedicated Firefox profile for web access. Review the [session prerequisites](./oci-bastion-dynamic-port-forwarding-session.md#before-connecting), especially the actual Bastion source IP and the [target access requirements](./README.md#prepare-target-access), first.

## 1. Create a dynamic session

You can follow the [Console steps](./oci-bastion-dynamic-port-forwarding-session.md#create-a-session-in-the-console) without installing OCI CLI. Have an approved OpenSSH key pair available and restrict its private file permissions:

```bash
chmod 600 /absolute/path/to/session-private-key
```

If using OCI CLI, configure it for your approved authentication method. In Terminal, replace the values below. The public key file must match the private key you will use for the tunnel.

```bash
OCI_PROFILE='your-configured-profile'
OCI_REGION='your-bastion-region'
BASTION_ID='your-bastion-ocid'
SESSION_PUBLIC_KEY='/absolute/path/to/session-public-key.pub'
printf '%s\n' '{"sessionType":"DYNAMIC_PORT_FORWARDING"}' > dynamic-session.json
oci bastion session create \
  --profile "$OCI_PROFILE" --region "$OCI_REGION" \
  --bastion-id "$BASTION_ID" \
  --target-resource-details file://dynamic-session.json \
  --ssh-public-key-file "$SESSION_PUBLIC_KEY" \
  --display-name operator-access \
  --session-ttl-in-seconds 3600 \
  --wait-for-state SUCCEEDED
```

Use a TTL no greater than the Bastion maximum. Record the returned session OCID. Wait for **Active**, then copy the session's SSH command in the Console. To inspect details with CLI:

```bash
SESSION_ID='your-session-ocid'
oci bastion session get --profile "$OCI_PROFILE" --region "$OCI_REGION" --session-id "$SESSION_ID"
```

## 2. Start the SOCKS5 tunnel

Copy the exact `session-ocid@bastion-host` from **Copy SSH command** into `SESSION_TARGET`. Do not use the target VM's username here or construct the hostname from a guessed region/realm suffix.

```bash
SESSION_KEY='/absolute/path/to/session-private-key'
SESSION_TARGET='your-session-ocid@your-copied-bastion-host'
ssh -i "$SESSION_KEY" -N -D 127.0.0.1:1080 \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=120 -o ServerAliveCountMax=3 \
  -p 22 "$SESSION_TARGET"
```

Verify the Bastion host identity using your approved host-key verification process. Enter the key's passphrase if prompted. Keep this Terminal window open; an idle foreground process is expected. Work in another window for target connections. The listener is available only on your workstation.

## 3. Open a private database web interface

Create a separate Firefox profile through `about:profiles` and launch it for private access. In that profile, open **Settings**, find **Network Settings** or **Proxy settings**, and select **Settings/Configure proxy**. Firefox versions can place these controls under General or Privacy & Security; [Mozilla's connection-settings guide](https://support.mozilla.org/en-US/kb/connection-settings-firefox) shows the current paths.

Select **Manual proxy configuration** and set:

| Setting | Value |
|---|---|
| HTTP/HTTPS proxy | Leave empty. |
| SOCKS Host | `127.0.0.1` |
| Port | `1080` |
| SOCKS version | **SOCKS v5** |
| Proxy DNS when using SOCKS v5 | Enabled. |
| No Proxy For | Do not include the private target hostname or domain. |

Open the database's original **private** Database Actions or APEX HTTPS URL and sign in with the database account. Keep the original hostname and TLS validation. The browser uses the proxy for its traffic; if the page redirects to another host, that destination also needs to be reachable from the Bastion path. This Firefox setting does not change macOS system proxy settings.

To test a private HTTPS endpoint from a second Terminal window:

```bash
curl --proxy socks5h://127.0.0.1:1080 --connect-timeout 15 --max-time 30 'https://your-private-hostname/'
```

`socks5h` sends the hostname to the proxy for resolution. An HTTP login/authorization response proves more of the path than a local listening-port check. Do not add `-k` to bypass certificate errors. See [curl's SOCKS options](https://curl.se/docs/manpage.html#--socks5-hostname).

## 4. Connect to a private Linux VM

macOS includes `nc`, which can connect an SSH client through SOCKS5. In a second Terminal window, use the VM's own key and image-specific username; `opc` below is an example.

```bash
ssh -i /absolute/path/to/vm-private-key \
  -o 'ProxyCommand=nc -X 5 -x 127.0.0.1:1080 %h %p' \
  opc@your-private-vm-hostname
```

Check the VM host-key fingerprint against an approved source. The destination is the VM's private hostname or IP, rather than `127.0.0.1:1080`. The target subnet and host firewall must allow TCP 22 from the Bastion path. See the [nc proxy options](https://man.openbsd.org/nc.1).

## 5. Connect to a private Windows VM

Install Microsoft's [Windows App for macOS](https://learn.microsoft.com/en-us/windows-app/get-started-connect-devices-desktops-apps?pivots=remote-pc). Confirm that the target Windows VM permits RDP, has an authorized Windows account, and allows TCP 3389 from the Bastion path.

First validate local forwarding on a dynamic session in your environment, as described in the [application-access notes](./oci-bastion-dynamic-port-forwarding-session.md#application-access). Stop the tunnel with **Ctrl+C**, then restart it with an additional local listener, replacing the destination with the Windows VM's actual private IP:

```bash
ssh -i "$SESSION_KEY" -N -D 127.0.0.1:1080 \
  -L 127.0.0.1:13389:your-windows-private-ip:3389 \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=120 -o ServerAliveCountMax=3 \
  -p 22 "$SESSION_TARGET"
```

In Windows App, choose **Add PC**, enter **PC name** `127.0.0.1:13389` and select **No gateway**. Connect with the Windows VM account. No Windows App sign-in is required to add a remote PC. Check the remote identity/certificate through your approved process, including the expected name difference when connecting through loopback. Keep NLA enabled. This TCP tunnel does not transport RDP's optional UDP traffic.

## 6. End access

Close the VM/database clients, stop the tunnel with **Ctrl+C**, and close the dedicated Firefox profile or restore its previous proxy setting. Delete the session in the Console, or use the same configured CLI profile and region:

```bash
oci bastion session delete --profile "$OCI_PROFILE" --region "$OCI_REGION" --session-id "$SESSION_ID"
```

The CLI asks for deletion confirmation. Remove `dynamic-session.json` when it is no longer needed. When a session expires, create a new one and update `SESSION_TARGET`; keepalives do not renew it. See [troubleshooting](./oci-bastion-dynamic-port-forwarding-session.md#troubleshooting).

#### License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](../../LICENSE.txt) for more details.
