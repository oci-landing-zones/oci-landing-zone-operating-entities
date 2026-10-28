# Cost governance tags

One-OE uses one governance file, `oneoe_governance.json`, for the cost tag namespace,
the six tag definitions, and six required Tag Defaults. The IAM, Hub A/B/C/E
network, security, and observability files assign the six tags explicitly to
resources that support them.

## Tag values

| Tag | Initial value |
|---|---|
| `tag-lz-cost-center` | `none` |
| `tag-lz-business-unit` | `none` |
| `tag-lz-owner` | `none` |
| `tag-lz-platform` | `network` for network resources, `security` for security resources, `observability` for observability resources, and `none` for other IAM resources |
| `tag-lz-environment` | `shared`, `prod`, or `preprod`, according to functional scope |
| `tag-lz-project` | `proj1` for project-specific resources; otherwise `none` |

Network compartments also use `platform=network`: `CMP-LZ-NETWORK-KEY`,
`CMP-LZ-PROD-NETWORK-KEY`, and `CMP-LZ-PREPROD-NETWORK-KEY`. Security compartments
use `platform=security`: `CMP-LZ-SECURITY-KEY`, `CMP-LZ-PROD-SECURITY-KEY`, and
`CMP-LZ-PREPROD-SECURITY-KEY`. Other IAM resources retain `platform=none`.

The public load balancer serves production and uses `environment=prod`, even
though it resides in the shared hub. Shared project networks and subnets use
`project=none`; project-specific NSGs use `project=proj1`. Existing IAM role tags
are preserved. Components without their own tagging fields, such as listeners,
backends, and NSG rules, do not receive a `defined_tags` field.

All CIS security variants use `platform=security`, including Vaults and keys when
the selected CIS2 security file creates them. Security configuration defaults
also tag module-created resources such as cloned Cloud Guard recipes.
Observability, including flow logs, uses `platform=observability`.

## One plan and one apply

This governance file requires the Tag Default ordering implemented in the
orchestrator's [`feature/tag-order`](https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/tree/feature/tag-order)
branch. The revision selected for this validation is
`aeec73b7b3742d457c1ce14cc2f496d2bd9d8e7a`. Pin and review the orchestrator revision
used by a deployment; earlier ordering, such as v2.2.0, cannot create these Tag
Defaults against new same-stack compartments in one apply.

Use `oneoe_governance.json` together with `oneoe_iam.json`, the selected hub network
file, and the security and observability files required by the chosen deployment
guide. Only include the variants appropriate to that deployment. Tagging does
not itself add Vault, change the CIS level, or require a security file that the
selected deployment intentionally omits.

Stage reviewed files in a customer-controlled private Object Storage bucket and
consume them through the pinned orchestrator workflow. Terraform CLI is also
supported. For a fresh deployment, no compartment dependency output needs to be
exported and re-imported just to create these Tag Defaults.

The orchestrator orders a single apply as follows:

```text
Namespaces and tag definitions
          ↓ propagation wait
Compartments with explicit tags
          ↓
Required Tag Defaults
          ↓ propagation wait
IAM services, network, security, observability, and workloads
          (following their other resource dependencies)
```

Compartments must carry explicit tags because their Tag Defaults are created
after them. The tag definitions and namespaces themselves are not assigned cost
tags that do not exist yet; the governance file avoids that bootstrap dependency.

## Required Tag Defaults

Each of the six definitions contains a block equivalent to:

```json
"tag_defaults": {
  "TAG-LZ-PLATFORM-KEY-REQUIRED": {
    "compartment_ids": ["CMP-LANDINGZONE-KEY"],
    "default_value": "none",
    "is_user_required": true
  }
}
```

The orchestrator resolves `CMP-LANDINGZONE-KEY` from the compartment it creates.
The schema requires `default_value`, but `is_user_required: true` selects the
user-applied value requirement. It does not select automatic filling with `none`.
`none`, `network`, `security`, and `observability` are accepted platform values, along with the
other values declared in the definition.

The requirement is inherited within `cmp-landingzone` and its descendants. It
does not apply to tenancy-root resources or sibling compartments. It is not
retroactive and does not prevent later tag modifications by authorized users.

## Validation

Before applying, check the complete plan for six explicit tags on every taggable
resource and six required Tag Defaults targeting the new landing-zone compartment.
After applying, inspect the effective tags and confirm that all six defaults have
`is-required=true`. Test that creating a resource inside the hierarchy without a
required tag fails, and that creation with all six tags succeeds. Remove temporary
test resources afterward.

Existing deployments upgrading to the changed orchestrator ordering must review
its state-address migration instructions before applying. Moving Tag Defaults
between Terraform resource addresses must not unintentionally recreate them.

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
or supported module defaults. The illustrative values `none`, `CC12345`,
`email.address@example.com`, `proj1`, and `proj2` must be reviewed for the customer's
organization. OpenShift and Secure Desktops currently use `platform=none` because
no platform values for them are defined in this cost namespace. Archived and
training exercise files are not part of the maintained deployment set.

### Downstream module limitations

Tags present in a JSON input do not prove that every resource created internally
by its Terraform module receives them. Review the complete plan before using an
extension under required Tag Defaults. In particular:

- OCVS module `v1.1.0` accepts tag inputs but does not assign them to its SDDC or
  VLAN resources. Those resources require a downstream module correction; the
  generated OCVS payload alone does not resolve this limitation.
- Compute/storage module `v0.2.9` does not expose/pass tags for the primary VNIC
  and boot volume created implicitly with an instance. Tagging the instance in
  DB Observability and other add-ons does not cover those implicit resources.

These paths have not been certified for deployment with required tags until the
module limitations are corrected and their complete resource plans are verified.
Do not turn off required tags or treat a tagged input as proof of compliance.
