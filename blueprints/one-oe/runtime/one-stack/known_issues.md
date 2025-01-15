# **OCI Open LZ &ndash; [One-OE Blueprint](#) &ndash; Known Issues**

&nbsp; 

## Cannot delete a compartment that it is still associated to a Security Zone.

While destroying your stack you might see the following error:

```
Error: 400-InvalidParameter, Delete compartment is not allowed because compartment is still associated to a Security Zone.

Suggestion: Please update the parameter(s) in the Terraform config as per error message Delete compartment is not allowed because compartment is still associated to a Security Zone.

```

If you see it, you would need to disable Cloud Guard manually from the console:
Main Menu -> Identity and Security -> Cloud Guard -> Configuration -> Disable Cloud Guard

Then, apply remove the conflicting compartment manually and proceed with the Stack destroy operation.

&nbsp; 

## The Key Version cannot deleted because it is the current key version of the key.

While destroying your stack you will see the following error:

```
Error: 409-Conflict, The Key Version ocid1.keyversion.oc1.eu-frankfurt-1.entkhimfaafr2.bcqlm2r2dxaac.abtheljsnbgjujm7nez7fci36zmeycpcby7tn47lyv3fixgyflla37k4scnq cannot be deleted because it is the current key version of the key

Suggestion: The resource is in a conflicted state. Please retry again or contact support for help with service: Kms Key Version

Documentation: https://registry.terraform.io/providers/oracle/oci/latest/docs/resources/kms_key_version

API Reference: https://docs.oracle.com/iaas/api/#/en/key/release/KeyVersion/ScheduleKeyVersionDeletion

Request Target: POST https://entkhimfaafr2-management.kms.eu-frankfurt-1.oraclecloud.com/20180608/keys/ocid1.key.oc1.eu-frankfurt-1.entkhimfaafr2.abtheljs2ocww2ra4ypwcmizds3pummzt7ik2lesswfskznhoizs2dyld4aq/keyVersions/ocid1.keyversion.oc1.eu-frankfurt-1.entkhimfaafr2.bcqlm2r2dxaac.abtheljsnbgjujm7nez7fci36zmeycpcby7tn47lyv3fixgyflla37k4scnq/actions/scheduleDeletion

```

You won't be able to completely destroy de stack, as we're using a Vault/keys to be compliant with CIS v2 for the Object Storage bucket used for Audit log long retention.

You will need to delete manually the key and move the Vault to the root or alternative compartment.

To delete the key:
Main menu -> Key Management & Secret Management -> Vault -> Select: ***cmp-landingzone-p/cmp-lzp-security*** compartment -> Select ***key-lzp-oss-audit-bkt*** -> Select every version, 3 dots, delete -> Confirm and select deletion date as the earliest available.

To move the vault:
Main menu -> Key Management & Secret Management -> Vault -> Select: ***vlt-lzp-shared-security*** vault -> Move Resource -> root compartment.

The destroy operation will keep failing until you reach the key deletion date. If you want to re-deploy the environment we encorage to move all the ***cmp-landingzone-p*** compartment to an alternative compartment in the root.

&nbsp; 

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.


&nbsp; 
