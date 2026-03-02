# OCI Hub Jsonnet — Design & Patterns Guide

## 1. File Organization & Layers

```
gen/
├── addons/oci-hub-models/           # Standalone hub network configurations
│   ├── hub_common.libsonnet         # Shared building blocks (subnets, routes, gateways, ICMP)
│   ├── hub_lb.libsonnet             # Load balancer components (SL, NSG, L7 LB)
│   ├── hub_nfw.libsonnet            # OCI Network Firewall policies (for hubs A, B)
│   ├── subnetting.libsonnet         # IP address allocation (single source of truth)
│   ├── hub_a/                       # Dual-firewall hub (DMZ + Internal NFW)
│   ├── hub_b/                       # Single-firewall hub (one NFW)
│   ├── hub_c/                       # Third-party firewall hub (NLB-fronted)
│   └── hub_e/                       # No-firewall hub (DRG-only routing)
│
└── blueprints/one-oe/runtime/one-stack/
    ├── oneoe_compose.libsonnet      # Composes hub addon + spoke VCNs into blueprint
    ├── oneoe_spokes.libsonnet       # Spoke VCN definitions (prod/preprod)
    ├── oneoe_network_hub_*_pre.jsonnet  # Pre-deployment blueprints
    └── oneoe_network_hub_*.jsonnet      # Post-deployment blueprints (with route overlays)
```

**Design principle**: Addon files produce a complete, standalone hub config. Blueprint files compose an addon with spoke VCNs using `oneoe_compose`. This separation means addons can be used independently or composed into different blueprint layouts.

## 2. The Pre/Post Deployment Pattern

Hub infrastructure is deployed in two phases:

- **Pre-deployment** (`*_pre.jsonnet`): Creates VCN, subnets, security lists, NSGs, gateways, and route tables. Route tables that depend on firewall IPs are created with **empty rules** because firewall private IP OCIDs are unknown at plan time.
- **Post-deployment** (`*_post.libsonnet`): After firewalls are created, their private IP OCIDs are known. The post overlay injects these into route rules using `network_configuration+:` deep merge.

Hubs without firewalls (Hub E) have no post-deployment file — all routes are fully configured in the pre file.

## 3. Composition Patterns

**Object merging**: Always use `+` for merging objects. Never use Jsonnet object inheritance syntax `A { key: val }` — it's visually ambiguous with function calls. Write `A + { key: val }` instead.

**Section composition order for security lists**:
```jsonnet
security_lists:
  common._icmp_sl('sl-fra-lz-hub-lb')         // 1. LB (always present)
  + common._icmp_sl('sl-name')                // 2. ICMP-only SLs for firewall/NLB subnets (hub-specific, 0-2)
  + { 'SL-...-MGMT-KEY': common._mgmt_security_list(ip_config.bastion_ip) },  // 3. MGMT (always)
```

**Hub VCN composition**: Use `common._hub_vcn(ip_config, extra_subnets={...})` for hubs with custom subnets, or `common._hub_vcn(ip_config)` when only the shared LB + MGMT + MON + DNS subnets are needed.

## 4. Helper Function Design Pattern: `null`-Default for Optional Behavior

When a function has an optional behavior variant, use `null` as the default — not an empty array, not a fallback value. This makes the "not provided" case explicit and self-documenting:

```jsonnet
// Pattern: null = default behavior, non-null = variant behavior
_function_name(required_param, optional_variant=null)::
  ...
  if optional_variant != null then <variant behavior>
  else <default behavior>
```

**Applied examples**:
- `_icmp_ingress_rules(own_vcn_cidr, management_cidr=null)` — `null` means Echo uses own VCN; when provided, Echo uses management network with adapted description
- `_nfw_rules(extras=null)` — `null` means base rules only; when provided, extra rules are inserted after east-west and auto-renumbered
- `_internet_gateway(route_table_key=null)` — `null` means no route table binding; when provided, IGW is attached to the specified route table

**Always use named parameters** when calling functions with optional args: `_icmp_ingress_rules(vcn, management_cidr=ip.hub_vcn)`, not positional.

## 5. Why IGW Binding Varies Between Hubs

Hubs with an **ingress firewall** (A, C) need to inspect inbound internet traffic. The IGW is bound to a route table (`RT-FRA-LZ-HUB-IGW-KEY`) that routes traffic through the firewall before it reaches the LB. These route rules are injected in the post-deployment phase.

Hubs **without ingress firewall** (B, E) let the LB receive internet traffic directly. The IGW has no route table — instead, the LB route table has an inline IGW route in the pre-deployment file.

## 6. Why ICMP Uses `management_cidr`

ICMP rules serve two purposes:
- **Type 3 (Destination Unreachable)**: Always from your own VCN — hosts in your network report when packets can't be delivered
- **Type 8 (Echo/Ping)**: From the **monitoring network** — so operations teams can verify hosts are alive

For hubs, both are the hub VCN (same CIDR). For spokes, unreachable comes from the spoke VCN but ping comes from the hub VCN (where monitoring tools run). The `management_cidr` parameter captures this distinction.

## 7. How to Add a New Hub Variant

1. Define IP allocation in `subnetting.libsonnet`: `hub_x: { lb_sn, mgmt_sn, ... }`
2. Create `hub_x/addon_network_hub_x_pre.jsonnet` — use Hub B (simplest) or Hub E (no firewall) as template
3. Follow composition patterns: `+` merging, subnet order (hub-specific first), security list order (LB + FW + MGMT)
4. For ICMP: use `common._icmp_ingress_rules(ip.hub_vcn)` — no `management_cidr` needed in hubs
5. If adding firewall: use `nfw._nfw_rules()` for base rules, `nfw._nfw_rules(extras=[...])` to insert custom rules
6. If firewall needs post-deploy: create `hub_x_post.libsonnet` with a direct overlay under `network_configuration.network_configuration_categories['0-shared'].vcns['VCN-FRA-LZ-HUB-KEY'].route_tables`
7. Create blueprint files using `oneoe_compose(hub, ip.hub_x, spoke_route_tables, ...)`
8. Run `generate.sh` and diff output against expected
