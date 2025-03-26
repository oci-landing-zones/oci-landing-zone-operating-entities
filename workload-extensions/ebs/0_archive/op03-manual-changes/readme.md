# Manual Changes

The following manual changes are required to be performed using the OCI Console.

## **1. Required Steps**

Attach the following Route tables to the DMZ VCN Subnets:

| |  | | 
|---|---|---|
|**ID**   |	**Subnet**	 |**Route Table Name**	 |	
|RT.05	|dmz-mgmt-subnet	|dmz1-mgmt-subnet-rtable|
|RT.06	|dmz-indoor-subnet  |dmz1-indoor-subnet-rtable|
|RT.07	|dmz-ha-subnet      |dmz1-ha-subnet-rtable|
|RT.08  |dmz-outdoor-subnet |dmz1-outdoor-subnet-rtable|

## **2. Optional Steps**

Remove the previous versions of the Route tables from the DMZ VCN:

| |  | 
|---|---|
|**ID**  |**Route Table Name**	 |	
|RT.01	|dmz-mgmt-subnet-rtable|
|RT.02	|dmz-indoor-subnet-rtable|
|RT.03	|dmz-ha-subnet-rtable|
|RT.04  |dmz-outdoor-subnet-rtable|


&nbsp; 

# License

Copyright (c) 2025 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
