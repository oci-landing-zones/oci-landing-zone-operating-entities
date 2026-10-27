# Connectivity catalog maintenance

`connectivity-catalog.json` is a curated Studio selection list, not a complete OCI inventory. Review it monthly and when OCI announces relevant provider, region, realm or CPE changes. This instruction does not create a scheduled job.

## Evidence and scope

- Start with Oracle's [FastConnect partners by region](https://www.oracle.com/cloud/networking/fastconnect/partners/) matrix and [verified CPE device guides](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/CPElist.htm). Use OCI service guides for customer-facing links.
- A marketing label proves neither the exact `provider_name` / `provider_service_name` strings nor a CPE vendor lookup value. Require primary evidence for those runtime strings: Oracle metadata, service documentation, or a version-pinned OCI-maintained module example. Keep the supporting URLs in each entry's `sources`.
- Optional trusted public metadata exports must identify their source, realm, region and retrieval date. Extract only verified public catalog facts. Access to every realm, tenancy credentials and live authenticated queries are not prerequisites for this review.
- Verify coverage separately for each realm and region. Do not infer sovereign/government coverage from commercial coverage. Missing entries and empty region arrays mean unverified by this catalog, not unsupported by OCI.

## Update procedure

1. Read the current JSON, `../services/connectivityCatalog.ts`, its tests, and the hybrid add-on contract before changing entries.
2. Check existing claims and sources. Add or correct only evidence-backed names and realm/region coverage. Preserve stable `key` values unless the represented service changes; `label` is display text, not a lookup value. Provider names must satisfy the factory's printable-ASCII and whitespace rules.
3. Keep the existing schema: `verified_on`; `provider_services` entries with `key`, `label`, `provider_name`, `provider_service_name`, `regions` and `sources`; `cpe_vendors` entries with `name`, `label` and `sources`. CPE vendor selection uses the downstream module's first matching shape and does not identify an exact model.
4. Advance `verified_on` (`YYYY-MM-DD`) only after actually reviewing the catalog's current entries and coverage claims. Do not refresh the date merely because code, formatting or an unrelated source changed. Keep evidence links current; leave uncertain coverage unlisted and explain any remaining gaps in the review result.
5. Check filtering by realm/region, selection preservation, missing coverage, and the manual identifier fallback. Add a focused regression case when changing a selection rule or correcting a mapping.

## Identifiers and deployment

The catalog contains **zero OCIDs by design**. Prefer portable CPE vendor names and provider/service names: the existing Networking module resolves them during deployment using its OCI provider context. This does not guarantee that a named service is available in another location.

Never copy an OCID between realms or regions. Explicit customer-entered provider/device identifiers belong in the customer's private model/source configuration, not this catalog. Keep manual identifier entry available for missing or unverified catalog choices. Do not add secrets, tenant identifiers, customer configuration or authentication material to catalog data or sources.

## Checks

From `addons/oci-landingzone-studio`, run:

```sh
bun run test src/services/connectivityCatalog.test.ts src/generator/generate.test.ts src/wizard/steps/ConnectivityEditor.test.tsx
bun run typecheck
bun run lint
bun run build
```

Do not run OCI plan/apply jobs or modify upstream repositories to maintain this list.
