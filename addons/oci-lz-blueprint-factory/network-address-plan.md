# Common network address plan

The [shared catalog](../../gen/data/network-address-plan.json) owns repository reference CIDRs and future reservations for Blueprint Factory and Landing Zone Studio. A reservation does not create a VCN or enable a workload extension. Explicit customer CIDRs remain authoritative; existing deployments and saved Studio designs are not renumbered.

## Foundation and shared scopes

| Scope | CIDR | Usage |
|---|---|---|
| Hub | `10.0.0.0/21` | Published foundation default |
| EBS platform | `10.0.8.0/21` | Reserved only |
| OKE platform | `10.0.16.0/21` | Reserved only |
| Shared ExaCS | `10.0.24.0/21` | Published UC1 default |
| Shared ExaDB-XS | `10.0.32.0/21` | Published UC1 default |
| Prod projects | `10.0.64.0/21` | Published foundation default |
| Preprod projects | `10.0.128.0/21` | Published foundation default |

## Environment platform reservations

| Platform | Prod | Preprod | Dev | UAT |
|---|---|---|---|---|
| EBS | Unassigned | Unassigned | `10.1.72.0/21` | `10.1.136.0/21` |
| OKE | `10.0.80.0/21` | `10.0.144.0/21` | `10.1.80.0/21` | `10.1.144.0/21` |
| OCVS | `10.0.88.0/21` | `10.0.152.0/21` | `10.1.88.0/21` | `10.1.152.0/21` |
| ExaCS | `10.0.104.0/21` | `10.0.168.0/21` | Unassigned | Unassigned |
| ExaDB-XS | `10.0.112.0/21` | `10.0.176.0/21` | Unassigned | Unassigned |

ExaCS and ExaDB-XS environment profiles use their prod/preprod entries when the selected use case includes environment networks. UC1 creates only the shared platform network; environment reservations remain unused. The OCVS published profile uses the prod entry. Other table entries remain reservations unless explicitly selected in a supported configuration. EBS entries reserve address space only; they do not add an EBS extension.

## OKE automatic sizing

OKE keeps its automatic `small` profile at `/20`. The `/21` table entries are reservations only and must not be passed to the automatic profile as deployable VCNs. The published OKE default remains `10.0.80.0/20`, which overlaps the OCVS prod reservation `10.0.88.0/21`. These two defaults therefore cannot be deployed together unchanged. Review and allocate non-overlapping VCNs before combining them; the table does not reserve a second half for each automatic OKE block.

## Studio allocation

Studio imports this same catalog for initial hub/project networks, the initial OCVS prod VCN, and allocation settings. Its existing instance and environment offset rules still derive later VCNs from the stored base; environment names do not automatically select the reservation table. Use explicit per-environment overrides when adopting a reserved range. OKE keeps automatic `/20` sizing. Custom and shared platform allocation pools are also catalog-owned.

Studio supports only the platform types exposed in its picker. Catalog entries for ExaCS, ExaDB-XS, and EBS do not add Studio support for them.

## Maintenance

Edit `gen/data/network-address-plan.json` first, update this reference table, and regenerate the affected published JSON using `JSONNET_BIN=jsonnet bash gen/generate.sh`. Do not hand-edit generated JSON. Validate catalog reservations, profile consumers, and Studio tests before publishing changes. The catalog is a repository reference plan, not a live tenancy IPAM inventory.
