# OCI Open LZ Runtime View

The **examples** section presents **OCI Open LZ Runtime View**, i.e., the **day two execution** of the operations scenarios introduced in [OCI Open LZ Operations View](../../design/OCI_Open_LZ.pdf).

&nbsp; 

## Operation Scenarios / Running Examples

The operations scenarios are one of the most important elements of this blueprint, as they represent the use cases and its key activities on the OCI Open LZ that create or update resources. 

An operation scenario is normally triggered by a service request, on a ticketing system. In a more formal definition, it should be seen as an operational process, which is a set of correlated activities executed as one unit of work, with its own frequency. The owner of each scenario will be the cloud operations team which has associated OCI Groups and Policies that allow the management of those resources. 

In the current version, four operations scenarios are presented with their **runtime configurations**, ready for execution:
1. [**OP.01 – Manage Shared Services:**](/examples/oci-open-lz/op01_manage_shared_services/readme.md) Creates or changes the shared elements of the landing zone and applies posture management.
2. [**OP.02 – Manage OE:**](/examples/oci-open-lz/op02_manage_oes/oe01/readme.md) Onboards or changes an OE, creating the OE structures that will be used by the OE to create resources.
3. [**OP.03 – Manage Department:**](/examples/oci-open-lz/op03_manage_department/readme.md) Creates and changes a new department structure to receive department projects.
4. [**OP.04 - Manage Project Environment:**](/examples/oci-open-lz/op04_manage_projects/readme.md) Creates or changes a project with the related environments and application layers.
5. **OP.05 – Manage PoC Project:** Creates or changes a PoC project in the OE Sandbox environment.
