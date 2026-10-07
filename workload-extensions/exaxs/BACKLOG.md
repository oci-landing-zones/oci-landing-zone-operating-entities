# ExaDB-XS Documentation Backlog

These two open items need a product-specific review before the ExaDB-XS use cases are considered complete. They do not authorize changes to IAM policies or diagrams by themselves.

## 1. Review Delegate Access Control

**Status:** Open

The [ExaDB-D use cases](../exacs/exacs_use_cases/readme.md#42-operator-access-control) describe Operator Access Control. The [ExaDB-XS use cases](exaxs_use_cases/readme.md) have no corresponding access-control section. Oracle documents Delegate Access Control (DAC) for ExaDB-XS, but its scope and placement in these use cases need review.

- Confirm which ExaDB-XS resources and operator activities DAC covers, its prerequisites, and whether it is optional for each use case.
- Decide whether to add a DAC section and, if so, describe resource ownership, compartment placement, IAM responsibilities, audit events, and notifications using ExaDB-XS terminology.
- Keep the DAC design distinct from the ExaDB-D Operator Access Control example. The single-stack generator includes ExaDB-XS IAM for Vaults and VM Clusters, but does not generate DAC-specific grants.

**Done when:** The documentation records the decision and, if DAC is included, provides a source-backed design for the applicable use cases.

**References:** [Oracle DAC changes](https://docs.oracle.com/en-us/iaas/delegate-access-control/doc/changes-in-delac.html); [preparing for DAC](https://docs.oracle.com/en-us/iaas/delegate-access-control/doc/preparing-for-delac.html).

## 2. Verify the GI software image shown in the diagrams

**Status:** Open

The ExaDB-XS use case diagrams show a **GI SW Image** icon. The [diagram interpretation](exaxs_use_cases/readme.md#3-design-decisions) notes that Oracle's ExaDB-XS guidance establishes customer-created *database* software images, but does not establish the pictured GI image as a customer-managed ExaDB-XS resource.

- Verify whether customers can create or select a GI software image for ExaDB-XS VM Cluster provisioning or maintenance.
- If supported, document its lifecycle, placement, and required permissions. If unsupported, remove or replace the icon in the ExaDB-XS diagrams and update the accompanying explanation.

**Done when:** An ExaDB-XS-specific Oracle source supports the diagram and text, or the unsupported icon has been corrected.

**Reference:** [Oracle ExaDB-XS software image guidance](https://docs.oracle.com/en/engineered-systems/exadata-database-exascale/exdxs/ecc-manage-images.html).
