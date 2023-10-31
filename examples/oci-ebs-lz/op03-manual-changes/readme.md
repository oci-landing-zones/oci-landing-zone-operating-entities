Attach the following Route tables to the DMZ-vcn Subnets:

| |  | | 
|---|---|---|
|**ID**   |	**Subnet**	 |**Route Table Name**	 |	
|RT.05	|dmz-mgmt-subnet	|	ebslz-dmz1-mgmt-subnet-rtable|
|RT.06	|dmz-indoor-subnet|ebslz-dmz1-indoor-subnet-rtable|
|RT.07	|dmz-ha-subnet|ebslz-dmz1-ha-subnet-rtable|
|RT.08  |dmz-outdoor-subnet|ebslz-dmz1-outdoor-subnet-rtable|


(Optional ) Remove previous versions of Route tables from DMZ-vcn:

| |  | 
|---|---|
|**ID**  |**Route Table Name**	 |	
|RT.01	|	ebslz-dmz-mgmt-subnet-rtable|
|RT.02	|ebslz-dmz-indoor-subnet-rtable|
|RT.03	|	ebslz-dmz-ha-subnet-rtable|
|RT.04  |ebslz-dmz-outdoor-subnet-rtable|
