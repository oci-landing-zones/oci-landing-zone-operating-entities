# Cost tags across extensions and add-ons

Goal: apply the six cost-governance tags to resources created over One-OE, preserving authorization tags, environment and project scope.

- [x] Add a shared context-aware tag projection for generated artifacts. Cover network, IAM, security, observability and workload resource collections; exclude references, rules and tag definitions.
- [x] Integrate the projection into generic composition and standalone extension/add-on publications. Include OKE cluster, pool, nodes, PVC and service load-balancer tags.
- [x] Update static inputs separately where no declarative generator source exists, and FinOps Terraform tag propagation.
- [x] Regenerate published artifacts with canonical jsonnet. Check tag coverage, allowed values and preservation of non-tag configuration.
- [x] Run repository tests and document downstream OCVS limitations. No apply as part of this change; commit and push to tags-updates were subsequently requested.

Classification: network resources use network; security uses security; observability uses observability; workload resources use the platform; IAM uses tobedefined except platform, network and security compartments. Resource environment and project follow the rendered scope rather than blindly inheriting the destination compartment.

Validation: canonical publication generation completed (resumed after fixing OCVS identifier maps); 272 JSON files and 7,309 cost-tag blocks validated. Six projection tests and five artifact/static coverage tests passed. The five integration fixtures reported by the full suite were revalidated after the reference-map fix and expected cost-tag snapshot updates. No unrelated non-tag changes were found in generated artifact comparison. FinOps Terraform formatting passed; provider-backed FinOps validation was not run.
