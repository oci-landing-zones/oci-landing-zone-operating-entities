# DR RPC ownership implementation plan

> Execute each task with test-first checkpoints. Do not update checked-in DR JSON
> to make an equivalence failure disappear.

**Goal:** Move DR RPC network construction into the X-RPC add-on while keeping all
published DR JSON byte-identical.

**Architecture:** Preserve the current DR pair-specific algorithm as an explicit
X-RPC compatibility API. DR keeps pair validation, orchestration, profiles,
entrypoints, and published artifacts; X-RPC owns the RPC network mechanics.

**Technology:** Jsonnet, Bash, Python `unittest`, canonical `jsonnet`, optional
bounded `jrsonnet` compatibility runs.

---

## Task 1: Lock the published DR byte contract

**Files:**

- Modify: `tests/gen/test_dr_config.py`

1. Add a helper that renders one runtime `.jsonnet` source with canonical
   `jsonnet`, pipes the output through `gen/format_json.py`, and returns the exact
   formatted text.
2. Add `test_published_dr_runtime_sources_are_byte_identical_to_snapshots`.
3. Enumerate every `.jsonnet` under
   `gen/addons/oci-lz-dr/one-oe/runtime/`, resolve the matching checked-in `.json`
   under `addons/oci-lz-dr/one-oe/runtime/`, and compare complete text content.
4. Run the new test before implementation:

   ```bash
   JSONNET_BIN=jsonnet python3 -m unittest \
     tests.gen.test_dr_config.DrConfigTests.test_published_dr_runtime_sources_are_byte_identical_to_snapshots
   ```

   Expected: PASS against the current implementation. This is a characterization
   checkpoint, not the red phase.

## Task 2: Define the new X-RPC compatibility contract test-first

**Files:**

- Add: `tests/gen/testdata/direct/pass/oneoe_dr_rpc_xrpc_owner.jsonnet`
- Modify: `tests/gen/testdata/direct/pass/oneoe_dr_rpc_pair.jsonnet`
- Modify: `tests/gen/testdata/direct/pass/oneoe_dr_rpc_matrix.jsonnet`
- Modify: `tests/gen/testdata/direct/pass/oneoe_dr_rpc_hub_adapter.jsonnet`

1. Add a focused fixture importing
   `gen/addons/oci-x-rpc/dr_pair_network.libsonnet` and asserting that requester
   and acceptor methods preserve the established RPC keys and roles.
2. Point existing DR RPC fixtures at the proposed X-RPC API. Keep all existing
   assertions, especially `DRG_ATTACHMENT_ID`, exact remote destinations, and hub
   route-table selection.
3. Run the focused direct fixtures:

   ```bash
   JSONNET_BIN=jsonnet python3 -m unittest tests.gen.test_fixture_cases
   ```

   Expected: FAIL because `dr_pair_network.libsonnet` does not yet exist. Confirm
   that the failure is the missing intended module, not an unrelated fixture
   problem.

## Task 3: Introduce the X-RPC-owned DR pair builder

**Files:**

- Add: `gen/addons/oci-x-rpc/dr_pair_network.libsonnet`

1. Move the algorithm from `rpc_common.libsonnet` into the new module with only
   import-path and API-surface changes.
2. Fold the current hub selection from `rpc_hub_adapter.libsonnet` into a hidden
   helper without changing Hub A/B/C/E behavior.
3. Expose `requester(...)` and `acceptor(...)` methods with the current fixed role
   mappings and requester peer-key behavior.
4. Do not reuse the higher-level dynamic X-RPC builder where doing so would alter
   keys, routes, priorities, `match_type`, or emitted object shape.
5. Re-run focused fixture tests:

   ```bash
   JSONNET_BIN=jsonnet python3 -m unittest tests.gen.test_fixture_cases
   ```

   Expected: PASS.

## Task 4: Switch DR orchestration and entrypoints to X-RPC

**Files:**

- Modify: `gen/landing_zone_dr_multi.jsonnet`
- Modify: requester/acceptor entrypoints under
  `gen/addons/oci-lz-dr/one-oe/runtime/`

1. Replace imports of `rpc_requester.libsonnet` and `rpc_acceptor.libsonnet` with
   the X-RPC `dr_pair_network.libsonnet` API.
2. Keep runtime entrypoints thin: import profile/base inputs, invoke exactly one
   requester or acceptor projection, and return it unchanged.
3. Run the byte contract and DR config tests:

   ```bash
   JSONNET_BIN=jsonnet python3 -m unittest tests.gen.test_dr_config
   ```

   Expected: PASS, including byte equality for every published DR artifact.

## Task 5: Remove the obsolete DR implementations

**Files:**

- Delete: `gen/addons/oci-lz-dr/one-oe/rpc_common.libsonnet`
- Delete: `gen/addons/oci-lz-dr/one-oe/rpc_hub_adapter.libsonnet`
- Delete: `gen/addons/oci-lz-dr/one-oe/rpc_requester.libsonnet`
- Delete: `gen/addons/oci-lz-dr/one-oe/rpc_acceptor.libsonnet`

1. Search for old imports before deletion:

   ```bash
   rg -n "rpc_(common|hub_adapter|requester|acceptor)" gen tests
   ```

2. Remove the four files only after all consumers use the X-RPC module.
3. Repeat the search. Expected: no live imports or references except migration
   documentation where historical paths are intentionally named.
4. Run the DR and direct-fixture suites again.

## Task 6: Document the ownership boundary

**Files:**

- Modify: `gen/addons/oci-x-rpc/AGENTS.md`
- Modify: `gen/AGENTS.md`
- Modify: `addons/oci-lz-dr/one-oe/README.md`
- Modify: `addons/oci-x-rpc/README.md`

1. Add the DR-pair compatibility module to X-RPC source priority and describe why
   it remains separate from the dynamic multi-connection builder.
2. State that DR owns pair validation/publication while X-RPC owns RPC network
   construction.
3. Do not change customer-facing deployment inputs or reintroduce Hub E into the
   published DR options.
4. Check references:

   ```bash
   rg -n "DR|RPC|dr_pair_network|Hub E" \
     gen/addons/oci-x-rpc/AGENTS.md gen/AGENTS.md \
     addons/oci-lz-dr/one-oe/README.md addons/oci-x-rpc/README.md
   ```

## Task 7: Canonical regeneration and full verification

**Files:**

- Verify only; no expected DR JSON modifications.

1. Save the pre-generation hashes of DR runtime JSON files to a temporary file.
2. Run canonical generation:

   ```bash
   JSONNET_BIN=jsonnet bash gen/generate.sh
   ```

3. Compare the post-generation DR hashes with the saved hashes. Expected: exact
   match and no DR JSON diff.
4. Run all generator tests using canonical Jsonnet:

   ```bash
   JSONNET_BIN=jsonnet python3 -m unittest discover -s tests/gen -p 'test_*.py'
   ```

5. Run focused DR tests with `jrsonnet` under a finite external timeout when the
   command is available. Expected: completion and the same assertions as canonical
   Jsonnet; report it as optional renderer compatibility, not the CI authority.
6. Validate formatting and repository diff:

   ```bash
   git diff --check
   git status --short
   ```

7. Review the final diff to ensure it contains only the planned source migration,
   tests, and documentation in addition to the user's already-existing worktree
   changes. Do not stage or commit unless explicitly requested.

## Acceptance criteria

- All published DR JSON files are byte-identical before and after the migration.
- No DR source module constructs RPC or DRG peering mechanics.
- X-RPC owns the DR pair RPC compatibility implementation.
- Current dynamic X-RPC behavior is unchanged.
- Hub E remains available to generic/custom flows but absent from published DR
  presets, and every DR pair uses the same hub model in both regions.
- Canonical generator tests pass and the focused `jrsonnet` run terminates.
- No commit is created without an explicit user request.
