# OCI Open Landing Zone Multi-OE Blueprints

Multi-OE onboards several operating entities into one tenancy. The generic model keeps shared landing-zone services at the top level and nests the One-OE environment, platform, and project structure beneath an additional compartment for each OE.

## Available models

| Model | Design | Deployment |
|---|---|---|
| Generic Multi-OE | [Draw.io source](/blueprints/multi-oe/generic/design/OCI_Open_LZ_Multi-OE-Blueprint.drawio) | [Generator-owned integrated runtime](/blueprints/multi-oe/generic/runtime/readme.md) |
| Service provider | [Design guide](/blueprints/multi-oe/service-providers/design/readme.md) | [Runtime guide](/blueprints/multi-oe/service-providers/runtime/readme.md) |

The generic runtime publishes one integrated Terraform working set with Hub A, B, C, and E alternatives. It uses qualified environment names to support repeated environment and project names across OEs.

The service-provider model remains separate. It covers pod and application-level multi-tenant patterns for managed service providers; application multi-tenancy here does not mean deploying customer workloads into separate OCI tenancies.

## Legacy generic paths

`blueprints/multi-oe/generic_v1` and `blueprints/multi-oe/generic_v2` are replaced by `blueprints/multi-oe/generic/runtime`. This is a repository-path change, not a Terraform-state migration.

# License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
