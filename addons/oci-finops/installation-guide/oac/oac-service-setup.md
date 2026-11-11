# Prepare the OAC service manually

The SQL add-on uses the existing ADB supplied by the Landing Zone. Use the environment's existing Oracle Analytics Cloud service, or have its administrator create one manually in OCI Console before workbook setup. Service provisioning is separate from the Python installer.

## Contents

- [Create the service if needed](#create-the-service-if-needed)
- [Connect OAC to the existing private ADB](#connect-oac-to-the-existing-private-adb)

## Create the service if needed

1. In OCI Console, open **Analytics Cloud**, select the approved compartment and choose **Create Instance**.
2. Set the instance name, edition, capacity and license using the environment's approved choices.
3. Review identity-domain and administrator settings. Select the required network access and existing subnet/NSGs for a private endpoint.
4. Review the settings, create the instance and wait until it is available.

Follow Oracle's [Create a Service using the Console](https://docs.oracle.com/en/cloud/paas/analytics-cloud/acoci/create-service-using-console.html) for current fields and permissions. Public versus private network access is a provisioning choice; confirm it before creation.

## Connect OAC to the existing private ADB

The installation host's database route and OAC's database route are separate. For a private ADB source, configure the appropriate Private Access Channel and register its private source with the environment's network/DNS settings. Follow Oracle's [private-source connectivity workflow](https://docs.oracle.com/en-us/iaas/analytics-cloud/doc/connect-private-sources-private-access-channel.html).

Once service and connectivity are ready, [import the workbook and configure the target database connection](oac-workbook-import.md), using the dedicated [OAC reader](../../design/00-schema-bootstrap.md#created-objects-and-access). Verify access from the intended [consumer account](oac-user-onboarding.md).
