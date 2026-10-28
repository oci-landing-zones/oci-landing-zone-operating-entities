# Connectivity catalog maintenance

`connectivity-catalog.json` contains curated CPE device vendors. `fastConnectProviderServices.ts` contains verified regional provider-service OCIDs used by Studio's dropdown. Neither is a complete OCI inventory. Review them monthly and when OCI announces relevant provider, region, realm or CPE changes. This instruction does not create a scheduled job.

## Evidence and scope

- Use Oracle's [verified CPE device guides](https://docs.oracle.com/en-us/iaas/Content/Network/Reference/CPElist.htm), service documentation or version-pinned OCI-maintained module examples to verify vendor lookup strings. Keep supporting URLs in each vendor's `sources`.
- For provider-service constants, use `ListFastConnectProviderServices` in each exact realm and region. Include only offerings supporting `PRIVATE`. Retain the retrieval date and source operation with the constants. Labels may trim display whitespace; selections must export the returned OCID unchanged.
- Never infer identifiers from provider names, marketing coverage, or another region's OCIDs. Unlisted regions use manual OCID entry.
- Store only public provider-service identifiers. Never include tenancy identifiers, customer configuration, secrets or authentication material.

## Update procedure

1. Read the current data, `../services/connectivityCatalog.ts`, its tests, and the hybrid add-on contract.
2. Add only verified entries. Keep the constants keyed by realm and region, and keep the vendor JSON schema: `verified_on` and `cpe_vendors` entries with `name`, `label` and `sources`.
3. Advance a verification date only after actually reviewing the corresponding data. Leave uncertain entries unlisted and explain remaining gaps in the review result.
4. Check exact realm/region filtering, identifier selection, wrong-location validation and manual fallback. CPE vendor selection uses the downstream module's first matching shape; use manual identifiers for an exact model.

## Checks

From `addons/oci-landingzone-studio`, run:

```sh
bun run test src/services/connectivityCatalog.test.ts src/generator/generate.test.ts src/wizard/steps/ConnectivityEditor.test.tsx
bun run typecheck
bun run lint
bun run build
```

Do not run OCI plan/apply jobs or modify upstream repositories to maintain these lists.
