# OCI FinOps Setup Guide

Set up the FinOps add-on in the following order:

1. **[Deploy the Landing Zone extension](../deployment/FinOps_LandingZone_addon/README.md).** Extend an existing One-OE Landing Zone with the FinOps infrastructure.
2. **[Configure FinOps](configuration.md).** Prepare database credentials and Secrets, install the database modules, and configure OAC reporting and user access.

## Documentation folders

| Folder | Contents |
| --- | --- |
| [infrastructure/](infrastructure/) | Landing Zone deployment guidance using Terraform modules and the Orchestrator. |
| [database-modules/](database-modules/) | Python installation, ADB Resource Principal prerequisites, verification and maintenance. |
| [oac/](oac/) | OAC service setup, database connectivity, workbook import and user access. |

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
