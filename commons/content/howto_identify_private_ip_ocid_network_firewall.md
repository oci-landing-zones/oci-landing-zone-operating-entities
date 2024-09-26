# How to identify Private IP OCID of an OCI Network Firewall

With OCI CLI:

```
$ oci network private-ip list --ip-address <Network firewall IP> --subnet-id <Network Firewall Subnet>
```

E.g.:

```
$ oci network private-ip list --ip-address 10.0.0.10 --subnet-id ocid1.subnet.oc1...
{
  "data": [
    {
      "availability-domain": "FHff:EU-FRANKFURT-1-AD-1",
      "compartment-id": "ocid1.compartment...",
      "defined-tags": {
        "Oracle-Tags": {
          "CreatedBy": "default/...",
          "CreatedOn": "2024-09-16T08:52:58.337Z"
        }
      },
      "display-name": "nfw-fra-lzp-hub-dmz",
      "freeform-tags": {},
      "hostname-label": "nfw-fra-lzp-hub-dmz",
      "id": "ocid1.privateip.oc1.eu-frankfurt-1.abtheljrwac5mwh4fai526d4umxtregierqyhukzogbtx77s43o772rnxiua",
      "ip-address": "10.0.0.10",
      "is-primary": true,
      "subnet-id": "ocid1.subnet...",
      "time-created": "2024-09-16T08:52:58.462000+00:00",
      "vlan-id": null,
      "vnic-id": "ocid1.vnic..."
    }
  ]
}
````

Gather the **"id"** contents of the return JSON information "ocid1.privateip....".
