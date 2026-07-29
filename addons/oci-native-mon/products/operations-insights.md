# Operations Insights

## Capability

Operations Insights is emitted only with Database Management. The add-on
creates the DBM-co-managed Database Insight contract and passes only the OPSI
private endpoint to that API.

## Platform contract

| Platform | Deployment type |
| --- | --- |
| Base Database Service VM | `VIRTUAL_MACHINE` |
| Base Database Service bare metal | `BARE_METAL` |
| Exadata Database Service | `EXACS` |

Other pairings are rejected before rendering. ExaCC and external-database OPSI
registration require a separate reviewed contract and are not emitted.

## Scale and verification

OPSI follows the same bounded wave and state boundaries as DBM. After apply,
verify that the Database Insight is active and that current capacity/SQL data
is arriving. Registration alone is not runtime proof.
