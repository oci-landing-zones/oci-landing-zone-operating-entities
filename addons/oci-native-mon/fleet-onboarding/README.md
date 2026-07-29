# Fleet Onboarding Adapter

This root composes the pinned database-observability engine into an OCI Landing
Zone execution context. It is an internal LZ adapter and owns no credentials,
backend, or customer resource discovery.

Use the release's fleet renderer to produce complete wave roots. This adapter
is useful when an LZ composition supplies dependency maps directly:

Use `run-fleet.sh` for offline validation and saved-plan generation, then upload
the unchanged target root to the Landing Zone's OCI Resource Manager execution
boundary for deployment.

Do not apply without an explicit OCI context, Resource Manager stack/state,
reviewed customer inputs, and change approval. Keep each fleet wave in a
distinct state.
The engine source is pinned to the full `v0.3.1` release commit; upgrades
require a reviewed pull request and refreshed plan.

The root deliberately declares no backend because OCI Resource Manager owns
state for this LZ automation. Local plan generation uses `-backend=false` and
is not authorization to apply locally.
The fleet renderer copies the root-level `schema.yaml` into every generated
wave so the resulting ZIP opens with Landing Zone guidance in the Resource
Manager stack workflow.
