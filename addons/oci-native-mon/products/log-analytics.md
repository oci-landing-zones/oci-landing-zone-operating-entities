# Log Analytics

## Capability

The add-on uses its pinned collection engine to:

- discover Oracle-defined database and listener file sources;
- validate entity, Management Agent, namespace, compartment, and log group;
- create continuous source associations only when `--apply` is supplied;
- upload reviewed historical logs through a separate guarded command; and
- prove successful associations and actual scoped Log Analytics rows.

## Product selection independence

Log Analytics can be selected without DBM or OPSI. This is the supported path
for external databases within the Landing Zone workflow and can also be used
where another LZ component owns database registration.

## Large-scale enablement

The fleet renderer creates one `0600` collection file per selected target.
Promote a representative canary before the next wave. Review classification,
masking, retention, transfer approval, and agent file permissions before
mutation.

Use the pinned release runbook:
[`scripts/log-analytics/README.md`](https://github.com/adibirzu/terraform-oci-database-observability/blob/v0.3.1/scripts/log-analytics/README.md).
