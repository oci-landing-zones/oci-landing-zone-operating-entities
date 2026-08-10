# One-OE DR Observability Design

## Goal

Publish the One-OE DR observability configuration for Amsterdam from Jsonnet sources. It must create the regional observability resources for the existing DR hub and PROD VCN, while creating a bucket that serves only as the destination of Object Storage replication from Frankfurt.

## Scope

- Publish four generated artifacts in `addons/oci-lz-dr/one-oe/`:
  - `oneoe_bcdr_observability_cis1_pre.json`
  - `oneoe_bcdr_observability_cis1.json`
  - `oneoe_bcdr_observability_cis2_pre.json`
  - `oneoe_bcdr_observability_cis2.json`
- Add matching thin Jsonnet entrypoints under `gen/addons/oci-lz-dr/one-oe/`.
- Reuse the existing Amsterdam One-OE DR profile: Hub `10.0.192.0/21`, PROD `10.0.200.0/21`, and no preproduction environment.
- Add regression tests for generated-source parity, AMS-only regional resources, the bucket, and the absence of a Service Connector.
- Update the One-OE DR README with the staged deployment order and the manual replication prerequisites.

## Resource model

Each BCDR artifact starts from the matching One-OE observability surface:

- `cis1_pre` and `cis2_pre` omit flow logs.
- `cis1` and `cis2` add flow logs for the AMS hub and PROD VCNs.
- Event rules, alarms, notification topics, and log groups are emitted for the Amsterdam profile only; no `preprod` resources are emitted.

The BCDR overlay changes the One-OE service-connector section as follows:

- It retains a single bucket in the security compartment for every CIS level. The bucket is created by the BCDR observability stack and is the target of Frankfurt-to-Amsterdam Object Storage replication.
- It removes `service_connectors`. A replication destination bucket becomes read-only after the replication policy is enabled, so an AMS Service Connector cannot use that bucket as a write target.
- CIS 1 applies its normal bucket baseline.
- CIS 2 applies the normal customer-managed encryption setting. The resource key `KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY` must resolve to the key available through the replicated Vault in Amsterdam.

## Deployment prerequisites and boundaries

The BCDR stack creates the destination bucket. It does not create either replication policy or the Vault replica.

Manual post-deployment configuration required:

1. Replicate the CIS 2 Vault and key from Frankfurt to Amsterdam, when CIS 2 is selected.
2. Supply the key exposed by the AMS replica through the Orchestrator `kms_dependency` input, under `keys.KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY`.
3. Configure the Object Storage replication policy on the Frankfurt source bucket to use the AMS bucket created by the BCDR stack.
4. Add the destination-bucket activation and failover procedure to the DR runbook. The bucket is read-only while it is a replication destination.

The BCDR observability artifacts do not create an AMS Service Connector and therefore do not independently export AMS audit logs to Object Storage. This is intentional for the one-bucket replication design.

## Implementation boundaries

Use an add-on-local Jsonnet overlay rather than changing `gen/builders/observability.libsonnet`. The core builder continues to define the standard One-OE behavior, including the Service Connector; the BCDR add-on owns the regional replication-specific exception.

The generated JSON files are derived artifacts and must be regenerated from the new entrypoints. No generated JSON is edited by hand.

## Validation

- Render each new Jsonnet entrypoint and compare it with its published JSON artifact.
- Assert `0-shared` and `1-prod` flow-log targets only in final artifacts, with no preproduction target.
- Assert the BCDR bucket exists for every CIS level and `service_connectors` is empty.
- Assert CIS 2 retains the KMS key reference.
- Run the direct Jsonnet fixtures, the focused observability tests, the full test suite, JSON validation, and `git diff --check`.
