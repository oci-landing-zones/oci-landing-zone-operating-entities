# Required OCI IAM Policy and Dynamic Group

## Creating a Dynamic Group for function
To create a dynamic group for function, use the following statement:
```
All {resource.type = 'fnfunc', resource.id = '<function-ocid>'}
```

## Policy Statement
```
Allow dynamic-group <dynamic-group-name> to manage objects in compartment <compartment-name> where target.bucket.name = '<bucket-name>'
```
## Creating a Dynamic Group for Autonomous Database Resource Principal
To create a dynamic group for Autonomous Database resource principals, use the following statement:
```
ALL {resource.type = 'autonomousdatabase', resource.id = '<autonomousdb-ocid>'}
```
## IAM Policy to Allow Autonomous Database Resource Principal to Access Objects
```
Allow dynamic-group <dynamic-group-name> to read objects in compartment <compartment-name> where target.bucket.name = '<bucket-name>'
```

## Creating a Dynamic Group for Resource Scheduler
To create a dynamic group for Resource Scheduler, use the following statement:
```
ALL {resource.type = 'resourceschedule', resource.id = '<resourcescheduler-ocid>'}
```
## IAM Policy to Allow Resource Scheduler to manage finops function resource
```
Allow dynamic-group <dynamic-group-name> to manage functions in compartment <compartment-name> where target.function.id = '<finops function-ocid>'
```