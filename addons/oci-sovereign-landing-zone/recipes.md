# Cloud Guard Recipes

**RECIPE 1**

| category           | description                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| Deny Public Access | Object Storage buckets in a security zone can't be public.                                       |
| Deny Public Access | Databases in a security zone can't be assigned to public subnets. They must use private subnets. |


**RECIPE 2**
| category           | description                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Include            | RECIPE 1 Statements                                                                                                                                                            |
| Require Encryption | Block volumes in a security zone must use a customer-managed master encryption key in the Vault service. They can't use the default encryption key managed by Oracle.          |
| Require Encryption | Boot volumes in a security zone must use a customer-managed master encryption key in the Vault service. They can't use the default encryption key managed by Oracle.           |
| Require Encryption | Object Storage buckets in a security zone must use a customer-managed master encryption key in the Vault service. They can't use the default encryption key managed by Oracle. |
| Require Encryption | File systems in the security zone must use a customer-managed master encryption key in the Vault service. They can't use the default encryption key managed by Oracle.         |


**RECIPE 3**
| category                       | description                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Include                        | RECIPE 1 Statements                                                                                |
| Include                        | RECIPE 2 Statements                                                                                |
| Restrict Resource Modification | You can't delete a VCN in the security zone.                                                       |
| Restrict Resource Modification | You can't delete VCN security list in the security zone.                                           |
| Restrict Resource Modification | You can't delete a VCN network security group in the security zone.                                |
| Restrict Resource Movement     | You can't move a subnet in a security zone to a compartment that is not in the same security zone. |


**RECIPE 4**

| category           | description                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| Include            | RECIPE 1 Statements                                                           |
| Include            | RECIPE 2 Statements                                                           |
| Include            | RECIPE 3 Statements                                                           |
| Deny Public Access | Subnets in a security zone can't be public. All subnets must be private.      |
| Deny Public Access | You can't add an internet gateway to a VCN within the security zone.          |
| Deny Public Access | Load balancers in a security zone can't be public. All load balancers must be | private. |
| Deny Public Access | Deny public network access in cloud shell.                                    |


**RECIPE 5**

| category                      | description                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Include                       | RECIPE 1 Statements                                                                                                              |
| Include                       | RECIPE 2 Statements                                                                                                              |
| Include                       | RECIPE 3 Statements                                                                                                              |
| Include                       | RECIPE 4 Statements                                                                                                              |
| Restrict Resource Association | You can't attach a block storage volume in a security zone to a compute instance that isn't in the same security zone.           |
| Restrict Resource Association | You can't attach a block storage volume to a compute instance in a security zone if the volume isn't in the same security zone.  |
| Restrict Resource Association | You can't attach a boot volume in a security zone to a compute instance that isn't in the same security zone.                    |
| Restrict Resource Association | You can't attach a boot volume to a compute instance in a security zone if the volume isn't in the same security zone.           |
| Restrict Resource Association | You can't launch a compute instance in a security zone if its boot volume isn't in the same security zone.                       |
| Restrict Resource Association | You can't launch a compute instance using a boot volume in a security zone if the instance isn't in the same security zone.      |
| Restrict Resource Association | You can't move a block volume to a security zone if it's attached to a compute instance that isn't in the same security zone.    |
| Restrict Resource Association | You can't move a boot volume to a security zone if it's attached to a compute instance that isn't in the same security zone.     |
| Restrict Resource Association | You can't export a file system in the security zone through a mount target that isn't in the same security zone.                 |
| Restrict Resource Association | You can't export a file system through a mount target in a security zone if the file system isn't in the same security zone.     |
| Restrict Resource Association | You can't create a mount target that uses a subnet in a security zone if the mount target isn't in the same security zone.       |
| Restrict Resource Movement    | You can't move a compute instance in a security zone to a compartment that is not in the same security zone.                     |
| Restrict Resource Movement    | You can't move a compute instance to a security zone from a compartment that is not in the same security zone.                   |
| Restrict Resource Movement    | You can't move a block volume in a security zone to a compartment that is not in the same security zone.                         |
| Restrict Resource Movement    | You can't move a boot volume in a security zone to a compartment that is not in the same security zone.                          |
| Restrict Resource Movement    | You can't move a bucket  from a security zone to a standard compartment.                                                         |
| Restrict Resource Movement    | You can't move a database from a security zone to a standard compartment.                                                        |
| Restrict Resource Movement    | You can't move a database from a standard compartment to a security zone if its Data Guard association isn't in a security zone. |
| Restrict Resource Movement    | You can't move a file system in the security zone to a compartment that is not in the same security zone.                        |
| Restrict Resource Movement    | You can't move a mount target in the security zone to a compartment that is not in the same security zone.                       |


&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
