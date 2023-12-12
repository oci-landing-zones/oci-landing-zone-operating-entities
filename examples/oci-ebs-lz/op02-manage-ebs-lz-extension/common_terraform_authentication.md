## Terraform Authentication

For authenticating against the OCI tenancy Terraform needs the following information:

```
"fingerprint": "<PEM key fingerprint>",
"private_key_path": "<path to the private key that matches the fingerprint above>",
"region": "<your region>",
"tenancy_id": "<tenancy OCID>",
"user_id": "<user OCID>",
"home_region": "<home region>",
"private_key_password": "<private key pwd>"
```

The information above can be collected from the OCI  Console by following the instructions below:

- Make sure that you have an **OCI API key setup**:
  - See https://docs.oracle.com/iaas/Content/API/Concepts/apisigningkey.htm for directions on creating an API signing key.
  - See https://docs.oracle.com/iaas/Content/Identity/Tasks/managingcredentials.htm on how to manage API keys in the OCI UI or API.
- Copy your **tenancy OCID** (bottom part of OCI screen, after Tenancy OCID: heading),
- Copy your **OCI user account OCID** (OCI Console > Identity > Users).
- Copy the required **API key fingerprint** and **private key path** (below).
- Fill in the full path to the SSH public and private keys (this can be used when creating new instances)
  - See https://docs.oracle.com/iias/Content/GSG/Tasks/creatingkeys.htm for directions on how to **create this key pair**.

You'll need to make a local (same folder location) copy of the [oci-credentials.tfvars.json.template](shared/oci-credentials.tfvars.json.template) to [oci-credentials.tfvars.json](oci-credentials.tfvars.json.template) and edit the newly created file to provide the collected values above.

The new, edited [oci-credentials.tfvars.json](shared/oci-credentials.tfvars.json.template) file should look similar to the below:
```
{
    "fingerprint": "25:84:69:40:2f:5b:d1:25:0f:eb:f3:41:ee:cb:16:03",
    "private_key_path": "~/.oci/oci_api_key.pem",
    "tenancy_ocid": "ocid1.tenancy.oc1....",
    "user_ocid": "ocid1.user.oc1....",
    "home_region": "eu-frankfurt-1",
    "private_key_password": ""
}
```
&nbsp; 