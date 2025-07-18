# Required OCI IAM Policy and Dynamic Group

These are the policies required for the Autonomous Database (ADB) to fetch FOCUS reports from the OCI **central tenancy** where the reports are stored.

## Creating a Dynamic Group for Autonomous Database Resource Principal
To create a dynamic group for Autonomous Database resource principals, use the following statement:
```
ALL {resource.type = 'autonomousdatabase', resource.id = '<finops_autonomousdb-ocid>'}
```
## IAM Policy to Allow Autonomous Database Resource Principal to Access Objects
```
define tenancy reporting as ocid1.tenancy.oc1..aaaaaaaaned4fkpkisbwjlr56u7cj63lf3wffbilvqknstgtvzub7vhqkggq
endorse dynamic-group <dynamic-group-name> to read objects in tenancy reporting
```


