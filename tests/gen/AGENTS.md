# Generator Test Guide

Scope: this file governs tests under `tests/gen/**`. Root `AGENTS.md` owns
repository-wide policy and `gen/AGENTS.md` owns generator architecture and
contracts.

This is the repository-specific testing approach for the Jsonnet generator.
Within `tests/gen/**`, follow this guide in preference to generic or global
testing skills and conventions when they conflict. Higher-priority system
instructions and the repository root safety and customer-use rules still
apply.

## Purpose

Generator tests preserve hard-won behavior that is consequential and easy to
miss during review. They do not restate changes that are obvious in a PR diff.

Keep the fixture framework itself tested. Fixture formatting, directive
parsing, file placement, assertion-mode exclusivity, snapshot handling, and
unique failure contracts determine whether all Jsonnet test evidence is
trustworthy.

## Test Layers

### Fixture Framework Integrity

Python is used only to implement, run, and test the fixture framework. Keep
Python limited to fixture discovery, parallel execution, directive parsing,
snapshot comparison, failure normalization, inventory checks, and framework
sentinels.

Do not implement landing-zone, topology, IAM, network, extension, publication,
or Orchestrator behavior assertions in Python. Those guarantees belong in
Jsonnet fixtures so the test logic uses the same language and object model as
the generator.

Framework tests may validate the mechanics under `tests/gen/**`, including:

- plain-language fixture headers
- `contains` and `error_contains` directive parsing
- rendered-output rather than source-text matching
- fixture placement and discovery
- exactly one assertion mode per fixture
- unique failure contracts

These tests prove that the evidence produced by the fixture suite is reliable.
They are not landing-zone behavior tests.

### Landing-Zone Outcomes

Behavior tests should render through a public Jsonnet entrypoint or config-mode
boundary and assert stable deployment outcomes:

- topology ownership, qualification, deterministic ordering, and collision
  avoidance
- IAM isolation, least privilege, and policy-chain safety
- CIDR validity, containment, overlap prevention, and routing invariants
- extension placement and cross-file dependency integrity
- unique top-level configuration ownership per deployment stage
- compatibility with the pinned downstream Orchestrator root contract

Prefer graph and set relationships over serialized object snapshots. Examples:
every referenced subnet exists; every project database tier belongs to the
qualified project; an OE-local policy cannot match peer or shared resources.
Express these relationships in Jsonnet and return focused failure arrays or
boolean summaries for the fixture runner.

### Publication Compatibility

Publication tests should cover behavior that is tedious or unreliable to
verify manually, such as semantic equality between Jsonnet source and committed
JSON or protected One-OE compatibility.

Repository-wide generated-file parity is owned by
`.github/workflows/check-generated-files.yml`, which regenerates committed
artifacts and checks the Git diff. Do not duplicate that workflow with Python
behavior tests. Add a Jsonnet publication fixture only for a subtle semantic
invariant that regeneration and diff review would not make clear.

Do not test repository changes that are obvious in the diff, such as the total
number of files, the absence of a directory, or an entrypoint's line count.

## Test Admission Rule

Add a behavior test only when all of the following are true:

1. The behavior has operational, security, compatibility, or state impact.
2. A diligent reviewer could reasonably miss the regression.
3. Verification is tedious, non-local, negative, algorithmic, or tied to an
   external contract.
4. The assertion observes a stable outcome instead of an implementation detail.

New tests are normally justified when changing:

- public config validation
- topology ownership or naming qualification
- security or IAM boundaries
- network and routing invariants
- output-family ownership or deployment sequencing
- extension dependency keys
- a pinned Orchestrator contract
- generated publication semantics
- behavior implicated by a real regression

Do not add a test merely because a helper was refactored, a local variable was
renamed, or a generated collection changed size while preserving the same
deployment behavior.

## Exact Counts

Do not assert incidental counts of NSGs, subnets, rules, policies, alarms,
events, keys, or policy statements. Assert the required and forbidden semantic
relationships instead.

An exact count is appropriate only when the number is itself an external hard
limit or the behavior under test. For example, the OCI policy-statement safety
limit is contractual; the number of generated NSGs is not.

## Guarantee Ownership

Before adding a fixture, search for an existing scenario that owns the same
guarantee. Extend that scenario when practical instead of adding another render
at a lower abstraction layer.

Document a new guarantee in the fixture header or test docstring with:

- the guarantee
- the deployment impact if it breaks
- why existing scenarios do not cover it
- the external contract or hard limit, when applicable

Use direct helper fixtures only when the helper enforces a hard invariant that
cannot be observed reliably through generated output. Do not test internal
object shapes already exercised by config-mode or published entrypoints.

## Fixture Placement

- `testdata/configs/pass`: accepted public config and generated outcomes
- `testdata/configs/fail`: rejected public config boundaries
- `testdata/direct/pass`: cross-publication or hard-invariant checks that cannot
  be expressed clearly through config-mode output
- `testdata/direct/fail`: hard internal fail-closed boundaries
- `testdata/contracts`: reusable integrated scenario inputs
- `testdata/fixture_runner`: sentinel inputs used only to test fixture mechanics

Use snapshots only when the complete serialized value is the stable contract.
Otherwise prefer focused semantic summaries or Python graph validation.

## Review Checklist

For every added or changed test, verify:

- it would catch a consequential regression
- the regression is not already obvious from the PR diff
- no existing test owns the same guarantee
- the test uses the highest practical public boundary
- assertions avoid incidental counts and helper structure
- negative security and ownership cases are covered where relevant
- failure text is pinned only at a customer-authored boundary

When substantially restructuring the suite, validate its usefulness with
temporary mutations such as breaking a dependency key, removing an OE
qualifier, broadening an IAM scope, introducing a CIDR overlap, or emitting an
unknown Orchestrator root family. Do not commit the mutations.

## Verification Commands

The local and pre-commit generator test is:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
```

Do not run the `CI=1 JSONNET_BIN=jsonnet` variant as a routine local or
pre-commit check. GitHub CI owns external-binary execution.
