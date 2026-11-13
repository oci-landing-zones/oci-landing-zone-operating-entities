# Prepare the OAC service manually

Create or reuse Oracle Analytics Cloud (OAC), then connect it to the Landing Zone's private ADB. The Python installer does not create OAC.

## Contents

- [Before starting](#before-starting)
- [Create the service if needed](#create-the-service-if-needed)
- [Connect OAC to the existing private ADB](#connect-oac-to-the-existing-private-adb)

## Before starting

- ADB and the FinOps database modules are ready.
- You have permission to create/manage OAC and use its network resources.
- Confirm the compartment, region, identity domain, capacity, license and user access path. For private user access, prepare client routing and DNS; this is separate from OAC's database connection.
- Use Enterprise Edition for a Private Access Channel (PAC). See the [network requirements](../../deployment/landing-zone-extension/one-oe-integration.md#private-network).

## Create the service if needed

1. In OCI Console, open **Analytics Cloud → Create Instance** and select the approved compartment.
2. Enter the name, edition, capacity and license; verify the identity domain and administrators.
3. Select public or private user access. For a private endpoint, select the intended VCN, subnet and NSGs.
4. Review, create and wait until the instance is available. Confirm its URL is reachable from the intended user's network.

If reusing an instance, verify the same settings. See Oracle's [service creation procedure](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/create-service-using-console.html).

## Connect OAC to the existing private ADB

1. Configure a **Private Access Channel** for OAC using the intended VCN/subnet and NSGs.
2. Register the ADB private hostname/domain and complete the DNS, routing and security rules described in the [private-source workflow](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/connect-private-sources-private-access-channel.html).
3. [Import the workbook and test its ADB connection](oac-workbook-import.md) using the [OAC reader](../../design/00-schema-bootstrap.md#created-objects-and-access).

The installation host's route to ADB does not prove that OAC can connect. Complete the [consumer access test](oac-user-onboarding.md#verify-access) before sharing dashboards.
