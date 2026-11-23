# **OCI Security Zones**

## **An OCI Open LZ Add-on for Environment Security Zones**

&nbsp;

**Table of Contents**

- [1. Overview](#1-overview)
- [2. Security Zone Configuration](#2-security-zone-configuration)
- [3. Prerequisites](#3-prerequisites)
- [4. Configuration and Deployment](#4-configuration-and-deployment)
- [5. Customization](#5-customization)
- [License](#license)

&nbsp;

## 1. Overview

The OCI Security Zones add-on extends the [One-OE Landing Zone](../../blueprints/one-oe/runtime/one-stack/readme.md) with optional Security Zones for selected environments.

The blueprint applies **Recipe 01** to the landing-zone compartment. This add-on applies **Recipe 02** to an environment compartment and its subcompartments, using a separate deployment stack. Shared network, platform and security compartments continue to inherit the blueprint's baseline.

<p align="center">
  <img src="./images/security-zones.png" width="980" alt="One-OE Security Zones: Recipe 01 on the landing-zone compartment and optional Recipe 02 on an environment compartment">
</p>

The example illustrates Recipe 02 applied to production. Select the environments that require these additional restrictions and review the corresponding CIS level before deployment.

&nbsp;

## 2. Security Zone Configuration

Choose **one** configuration per independent add-on stack, with the same CIS level as the landing-zone baseline. These files are alternatives, not deployment phases. Each file creates one recipe and one zone; do not load several files with the same `security_zones_configuration` root into one operation.

| Scope | CIS Level 1 | CIS Level 2 | Existing target compartment |
|---|---|---|---|
| Recipe 02 — environment example | [Configuration](./security_zones_environment_cis1.json) | [Configuration](./security_zones_environment_cis2.json) | `CMP-LZ-PROD-KEY` |

Each configuration creates one customer-managed recipe in `CMP-LZ-SECURITY-KEY` and one zone on the selected target. The environment example targets `prod`; customize its source profile for another environment. By default, subcompartments inherit their parent's zone, unless separately configured. The add-on uses existing compartments; it does not create IAM policies, networks, workloads, Vaults, keys or a separate Cloud Guard configuration block.

Recipe 01 remains owned by the base One-OE stack. The add-on does not publish a landing-zone baseline or a shared-network zone; it creates only the selected environment zone with Recipe 02.

The deployable files use the [OCI Landing Zone Orchestrator](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/v2.2.0) and its `security_zones_configuration` input.

### 2.1. CIS Benchmark Level

The Security Zones module shipped with [Orchestrator v2.2.0](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/v2.2.0) resolves the baseline policies by name:

- **Level 1** prevents public Object Storage buckets and public database instances.
- **Level 2** includes Level 1 and requires customer-managed Vault keys for applicable block volumes, boot volumes, buckets and file systems. Provision those keys and the required IAM permissions separately before creating or updating protected resources.

These recipes enforce the module's selected controls. They are not a complete implementation or certification of the CIS benchmark. See the pinned [Security Zones module](https://github.com/oci-landing-zones/terraform-oci-modules-security/tree/v0.2.3/security-zones) for its exact policy set.

Recipe 02 adds 26 environment restrictions to the selected CIS baseline, covering network modification, resource movement, resource association and public network access. For the full policy lists, see [Security Zone Recipes — CIS Level 1](./sz_recipes_cis1.md) and [Security Zone Recipes — CIS Level 2](./sz_recipes_cis2.md).

&nbsp;

## 3. Prerequisites

1. **Existing compartments.** Complete the landing zone first and obtain its `compartments_output.json`. The selected target and security compartment keys must exist in that dependency file. The recipe's placement compartment and the zone's protected compartment have different purposes.
2. **Cloud Guard already enabled.** Verify its reporting region and the operator's [required permissions](https://docs.oracle.com/en-us/iaas/Content/security-zone/using/get-started.htm). The backing Security Zones module can enable Cloud Guard when disabled. This add-on requires it to be enabled beforehand so the new stack does not take responsibility for tenancy-level activation.
3. **A reviewed target compartment.** Check its existing Security Zone association, descendants, resources and Cloud Guard targets. Creating a zone replaces relevant existing Cloud Guard targets and creates a Security Zone target; review any custom detector configuration first. See [Oracle's Security Zones overview](https://docs.oracle.com/en-us/iaas/Content/security-zone/using/security-zones.htm).
4. **A dedicated stack/state.** The add-on must exclusively own its recipes and zones. The base stack continues owning its compartments and other resources.

> [!IMPORTANT]
> The current One-OE blueprint owns Recipe 01 and its landing-zone zone. A child compartment can inherit that baseline and then receive its own separately managed zone. Its own recipe replaces the inherited policy set, so the additional recipes include the selected CIS baseline. Do not create a duplicate zone where an explicit child zone is already managed, or manage the same recipe/zone in two Terraform states. Earlier One-OE versions and workload-extension configurations can already own the additional zones. This add-on does not detach them or migrate state automatically. Removing a managed zone from a base configuration can schedule its destruction; do not use that as an implicit migration procedure.

### 3.1. Region Settings

The published example uses `eu-frankfurt-1` for `reporting_region`. Review this value against the tenancy's actual Cloud Guard configuration. **This field does not set the stack's deployment region**: the Orchestrator's root `region` input configures the provider used to create the recipe and zone.

Oracle lists Security Zones and recipes as [regional resources](https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm), while compartments span regions. This add-on deploys the selected configuration through one regional provider. It does not prove that an association protects resources in other regions, nor automatically create associations in Primary or DR. When the same compartment contains resources in multiple regions, verify the supported association and enforcement behavior with Oracle before adding another stack. The existing regional DR configuration remains unchanged.

&nbsp;

## 4. Configuration and Deployment

### 4.1. OCI Resource Manager

Use a dedicated Resource Manager stack with the pinned [Orchestrator v2.2.0 `rms-facade`](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/v2.2.0/rms-facade) source. Stage the reviewed configuration and dependency file in a customer-controlled **private OCI Object Storage bucket**, accessible from the stack. Keep that bucket's location consistent with the facade's Object Storage provider configuration.

Set the tenancy, deployment region and authorized execution identity for that stack. For a private bucket source, configure:

| Input | Example / purpose |
|---|---|
| `configuration_source` | `ocibucket` |
| `oci_configuration_bucket` | Name of the customer's private configuration bucket |
| `oci_configuration_objects` | For example `["security-zones/security_zones_environment_cis2.json"]`; select the intended recipe and CIS level |
| `oci_dependency_objects` | `["landing-zone/compartments_output.json"]` |

Replace the example object paths with the actual uploaded objects. The facade reads the dependency's top-level `compartments` block. Keep dependency files separate from configuration files, and do not load the base stack's full security file into this stack. Loading both CIS alternatives does not merge them into independent recipes. The supplied examples use one separate stack per selected zone; a combined stack requires one deliberately composed configuration with all its recipes and targets.

Review validation, plan and apply as separate steps:

1. **Validate:** verify JSON syntax, the chosen module version, external compartment keys, Cloud Guard status and exclusive resource ownership.
2. **Plan:** run a plan on the new stack. Confirm the intended recipe and zone, their compartments, CIS level and provider region. Stop if it proposes compartment/workload changes, tenancy-level Cloud Guard activation, unexpected replacements or changes to resources owned elsewhere.
3. **Apply:** apply only the reviewed plan. Afterwards, inspect the zone's associated compartments and Cloud Guard findings. In an approved test compartment, verify that an operation violating an enabled policy is denied and an allowed operation succeeds. Source validation alone does not establish enforcement in OCI.

For dependency-file handling, see the [Resource Manager multi-stack guide](../../commons/content/orm_bp.md).

### 4.2. Terraform CLI

Use a dedicated checkout/workspace and backend for the pinned Orchestrator root. Keep tenancy, region, authentication and backend settings in your approved local configuration. Supply the selected JSON file with `-var-file`, and supply the dependency as the root input `compartments_dependency`, pointing to the local `compartments_output.json` file. Run `terraform validate`, then save and review a `terraform plan` before applying it. Never reuse the base landing zone's state for this independent stack.

&nbsp;

## 5. Customization

The [configuration sources](../../gen/addons/oci-security-zones/) reference the standard One-OE compartment keys. Additional policy OCIDs are resolved from the selected realm's repository constants. To publish a different environment example, update [`profiles.libsonnet`](../../gen/addons/oci-security-zones/profiles.libsonnet) and regenerate with `bash gen/generate.sh`. The publication adapter accepts:

| Source field | Meaning |
|---|---|
| `cis_level` | Explicit numeric `1` or `2` |
| `realm` | Supported realm for policy OCIDs; default `oc1` |
| `environment_name` | Required; used in recipe and zone names, for example `prod` |
| `reporting_region` | Reviewed Cloud Guard reporting region |
| `recipe_compartment_id` | Existing non-root compartment key or compartment OCID for the recipe |
| `target_compartment_id` | Existing non-root compartment key or compartment OCID to protect |

These fields belong to the publication profile, not to a new Blueprint Factory configuration block. Literal compartment OCIDs do not need key resolution; referenced keys require the compartment dependency. Do not edit the committed generated JSON files directly.

Choose one CIS variant for each environment deployment. Recipe 02 retains its environment-based resource keys when changing the CIS level, but its policies change. Review every level change as a lifecycle and security change, not a second add-on deployment over the same compartment. Earlier environment examples used recipe keys beginning `SZ-RCP-LZ-03-`; the new `SZ-RCP-LZ-02-` keys can produce replacements in an existing state and require a separately reviewed migration.

&nbsp;

## License

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0. See [LICENSE](../../LICENSE.txt).
