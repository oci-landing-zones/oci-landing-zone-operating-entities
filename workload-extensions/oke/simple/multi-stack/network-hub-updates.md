# Hub E Routing Notes <!-- omit from toc -->

The published simple multi-stack OKE package is based on **Hub E**. It is a quickstart-style example for adding one OKE platform VCN as a spoke to an existing Hub E landing zone.

For Hub A, Hub B, Hub C, or more customized routing models, use config-driven generation with `oke_simple` instead of treating this published simple multi-stack package as a generic hub-model adapter.

## Hub E Assumptions

- The Hub E landing zone already exists.
- The Hub DRG key is `DRG-FRA-LZ-HUB-KEY` in the published Frankfurt example.
- The Hub DRG spokes route table key is `DRGRT-FRA-LZ-SPOKES-KEY`.
- The OKE platform VCN is `10.0.80.0/20` in the published example.
- The OKE platform VCN uses its own NAT gateway and service gateway.
- The Hub LB subnet remains available for OKE-created public load balancers, but this quickstart does not create a hub-level OCI L7 Load Balancer.

## Published Multi-Stack Network Output

The generated `oke_network.json` contains only the OKE platform network category and injects an OKE VCN attachment into the existing Hub DRG. It does not publish Hub A firewall route-table updates or a hub-level OCI L7 Load Balancer.

The OKE VCN attachment uses:

```text
DRG: DRG-FRA-LZ-HUB-KEY
DRG route table: DRGRT-FRA-LZ-SPOKES-KEY
Attached VCN: VCN-FRA-LZ-PREPROD-PLATFORM-OKE-KEY
OKE VCN CIDR: 10.0.80.0/20
```

## When To Use Config-Driven Generation

Use config-driven generation when the target landing zone is not this simple Hub E quickstart, including:

- Hub A, Hub B, or Hub C.
- Multiple OKE clusters or environments.
- Overlay OKE networking.
- Custom OKE CIDR sizes or manual subnet maps.

&nbsp;

# License <!-- omit from toc -->

Copyright (c) 2026 Oracle and/or its affiliates.

Licensed under the Universal Permissive License (UPL), Version 1.0.

See [LICENSE](/LICENSE.txt) for more details.
