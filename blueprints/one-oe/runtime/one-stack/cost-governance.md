# Cost governance tags

One-OE uses one governance file, `oneoe_governance.json`, for the
`tagns-lz-cost-governance` namespace, the six tag definitions, and six required Tag Defaults. The IAM, Hub A/B/C/E
network, security, and observability files assign the six tags explicitly to
resources that support them.

## Tag values

| Tag | Initial value |
|---|---|
| `tag-lz-cost-center` | `tobedefined` |
| `tag-lz-business-unit` | `tobedefined` |
| `tag-lz-owner` | `tobedefined` |
| `tag-lz-platform` | `network` for network resources, `security` for security resources, `observability` for observability resources, and `tobedefined` for other IAM resources |
| `tag-lz-environment` | `shared`, `prod`, or `preprod`, according to functional scope |
| `tag-lz-project` | `proj1` for project-specific resources; otherwise `notapply` |

Network compartments also use `platform=network`: `CMP-LZ-NETWORK-KEY`,
`CMP-LZ-PROD-NETWORK-KEY`, and `CMP-LZ-PREPROD-NETWORK-KEY`. Security compartments
use `platform=security`: `CMP-LZ-SECURITY-KEY`, `CMP-LZ-PROD-SECURITY-KEY`, and
`CMP-LZ-PREPROD-SECURITY-KEY`. Other IAM resources retain `platform=tobedefined`.

The public load balancer serves production and uses `environment=prod`, even
though it resides in the shared hub. Shared project networks and subnets use
`project=notapply`; project-specific NSGs use `project=proj1`. Existing IAM role tags
are preserved. Components without their own tagging fields, such as listeners,
backends, and NSG rules, do not receive a `defined_tags` field.

All CIS security variants use `platform=security`, including Vaults and keys when
the selected CIS2 security file creates them. Security configuration defaults
also tag module-created resources such as cloned Cloud Guard recipes.
Observability, including flow logs, uses `platform=observability`.

## One plan and one apply

Use [Orchestrator v2.4.1](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/releases/tag/v2.4.1)
with this governance file. This release supports Tag Defaults targeting logical
compartments created in the same apply, and manages tag namespaces, definitions,
and defaults through the tenancy home-region provider. Earlier ordering, such as
v2.2.0, cannot create these Tag Defaults against new same-stack compartments in
one apply.

Use `oneoe_governance.json` together with `oneoe_iam.json`, the selected hub network
file, and the security and observability files required by the chosen deployment
guide. Only include the variants appropriate to that deployment. Tagging does
not itself add Vault, change the CIS level, or require a security file that the
selected deployment intentionally omits.

Stage reviewed files in a customer-controlled private Object Storage bucket and
consume them through the pinned orchestrator workflow. Terraform CLI is also
supported. For a fresh deployment, no compartment dependency output needs to be
exported and re-imported just to create these Tag Defaults.

The orchestrator establishes the following dependencies in a single apply:

```text
Tag namespaces and tag definitions
                    ↓
          Propagation wait
                    ↓
Compartments with all six tags explicitly assigned
                    ├── Mandatory Tag Defaults for their target compartments
                    └── Networking, load balancers, Vault, buckets, and other
                        services according to their resource dependencies
```

Compartments must carry explicit tags because their Tag Defaults are created
after them. Downstream services do not wait for Tag Defaults or their propagation
in v2.4.1, so their configuration must also assign the tags explicitly. Resources
created before defaults take effect are not backfilled later. The tag definitions
and namespaces themselves are not assigned cost tags that do not exist yet; the
governance file avoids that bootstrap dependency.

## Mandatory Tag Defaults

Each of the six definitions contains a block equivalent to:

```json
"tag_defaults": {
  "TAG-LZ-PLATFORM-KEY-REQUIRED": {
    "compartment_ids": ["CMP-LANDINGZONE-KEY"],
    "default_value": "tobedefined",
    "is_user_required": true
  }
}
```

The orchestrator resolves `CMP-LANDINGZONE-KEY` from the compartment it creates.
The six defaults use `is_user_required: true`: resources created in the landing-zone
hierarchy must supply values for all six tags. The `default_value` fields remain
`tobedefined` (`notapply` for project), as required by the input schema; this mode
does not automatically fill missing values. Explicit values such as `network`,
`security`, `observability`, `prod`, and `preprod` are preserved.
`tobedefined`, `network`, `security`, and `observability` are accepted platform values, along with the
other values declared in the definition.

The defaults are inherited within `cmp-landingzone` and its descendants. They
do not apply to tenancy-root resources or sibling compartments. They are not
retroactive and do not prevent later tag modifications by authorized users.

## Validation

Before applying, check the complete plan for six explicit tags on every taggable
resource and six required Tag Defaults targeting the new landing-zone compartment.
After applying, inspect the effective tags and confirm that all six defaults have
`is-required=true`. Test that a new resource without all six explicit cost tags
is rejected and that creation with valid values succeeds.
Remove temporary test resources afterward.

Orchestrator v2.4.1 includes a built-in `moved` block for existing Tag Default
resources, from `module.oci_lz_tags[0].oci_identity_tag_default.these` to
`module.oci_lz_tag_defaults[0].oci_identity_tag_default.these`. It preserves their OCI identities when configuration keys and target
compartments are unchanged; no manual state commands are needed in that case.
Review the upgrade plan to confirm there are no unintended replacements.

Managed compartment keys take precedence over matching external dependency keys.
Review collisions before upgrading: a changed target or `compartment_ids`
reference can require replacement and a separately reviewed state migration.

## Workload extensions and add-ons

The shared generator projection applies the same six tags to the One-OE base,
workload extensions, and generated add-on publications. Standalone multi-stack
extensions also tag their new resources; references to resources owned by the
foundation do not create or retag those resources. Existing role and platform
access-control tags are preserved.

Environment and project values follow the resource's scope. For example, the hub
load balancer can have `environment=prod` while its compartment remains shared.
Custom environment and project names from the configuration are included in the
generated governance validators. Static TBAC examples also use `project=proj2`.
OKE publishes separate tags for clusters, pools, nodes, PVC volumes and Kubernetes
service load balancers. Service load balancers use `platform=network` and retain
`tagns-lz-oke.platform`, which is required by their authorization policies.

Static add-on inputs without a corresponding Jsonnet source carry explicit tags
or supported module defaults. The illustrative values `tobedefined`, `notapply`, `CC12345`,
`email.address@example.com`, `proj1`, and `proj2` must be reviewed for the customer's
organization. OpenShift and Secure Desktops currently use `platform=tobedefined` because
no platform values for them are defined in this cost namespace. Archived and
training exercise files are not part of the maintained deployment set.

### Downstream module limitations

Tags present in a JSON input do not prove that every resource created internally
by its Terraform module receives them. Review the complete plan before using an
extension with required Tag Defaults. In particular:

- OCVS module `v1.1.0` accepts tag inputs but does not assign them to its SDDC or
  VLAN resources. Those resources require a downstream module correction; the
  generated OCVS payload alone does not resolve this limitation.
- Compute/storage module `v0.2.9` does not expose/pass tags for the primary VNIC
  and boot volume created implicitly with an instance. Tagging the instance in
  DB Observability and other add-ons does not cover those implicit resources.

These module paths require corrections and complete plan verification before
using required tags. Required defaults do not fill missing values, so a tagged
input alone is not proof that every implicit resource will receive its labels.

Existing deployments are not modified by editing these files. Review a migration
plan that updates resource values and tag validators together; changing a Tag
Default does not rewrite tags already present on existing resources.

## Monthly budgets

`budgets_configuration` is a sibling of `tags_configuration` in the published
`oneoe_governance.json`. Its publication source is
`gen/blueprints/one-oe/runtime/one-stack/budgets.libsonnet`.

| Target | Value | Monthly amount |
|---|---|---:|
| Compartment | `cmp-landingzone` and its children | 10000 |
| `tag-lz-cost-center` | `CC12345` | 5000 |
| `tag-lz-business-unit` | `IT` | 5000 |
| `tag-lz-business-unit` | `Finance` | 5000 |
| `tag-lz-business-unit` | `Retail` | 5000 |
| `tag-lz-environment` | `prod` | 3000 |
| `tag-lz-environment` | `preprod` | 2000 |
| `tag-lz-project` | `proj1` | 500 |

An additional monthly budget of 10000 targets the complete `cmp-landingzone`
compartment hierarchy, including its child compartments. It uses target type
`COMPARTMENT` and the dependency key `CMP-LANDINGZONE-KEY`, which the Orchestrator
resolves to the deployed compartment OCID. Its scope is the Landing Zone, not the
entire tenancy.

Amounts use the tenancy's rate-card currency. Each budget starts on day 1 of the
month and has an actual-spend alert at 80%, addressed to
`email.address@example.com`. Replace this example recipient before relying on
email delivery. These are independent views of spending and must not be added:
the same resource can count toward a project, environment, business unit, and
cost-center budget simultaneously, as well as the overall Landing Zone budget.
Shared-resource spending is not included in
the `prod` or `preprod` targets unless the resource has that environment value.

Tag targets have the form `namespace.key.value`. The target selects the spending
being measured; the budget's own `defined_tags` label the budget resource. Budget
and alert metadata contain all six cost tags, using the module's inherited tags
for the alert. The budgets are created in the tenancy root.

The `IT`, `Finance`, `Retail`, and `CC12345` budgets only count resources assigned their respective values. This
budget configuration does not replace `tobedefined` on existing resource inputs.
Confirm the organization and resource assignments before relying on those
budgets. Budgets generate alerts; they do not stop resources or enforce spending
caps. See [OCI Budgets](https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/budgetsoverview.htm).

`is_cost_tracking` can remain false: OCI Budgets supports all defined tags, as
explained in the [June 2024 release note](https://docs.oracle.com/en-us/iaas/releasenotes/changes/04a707f1-e63f-4808-8662-d61a54f3a4ca/index.htm).
