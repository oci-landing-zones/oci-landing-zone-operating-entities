# Landing Zone Diagram Conventions

Use these conventions when creating editable Excalidraw diagrams for generated landing zone artifacts.
By default, create only the `.excalidraw` file. Do not create `.svg`, `.png`, `.dot`, Mermaid, or other preview/export files unless the user explicitly asks for those formats.

## Baseline Example

- Use this section as the repo-local visual baseline for compartment diagrams with IAM access information.
- A finished compartment diagram must include both the compartment hierarchy and the right-side `Access groups` panel unless the user explicitly asks for a compartment-only diagram.
- The `Access groups` panel is part of the standard, not an optional enhancement. Do not stop after drawing only compartment boxes and arrows.
- Keep IAM/compartment diagrams and Network diagrams as separate diagram types. Do not apply IAM access-panel rules to network-only diagrams, and do not apply network VCN/subnet styling to IAM compartment diagrams.

## Source

- Use generated JSON, especially `iam.json`, as the source of truth for compartment hierarchy.
- Preserve parent-child hierarchy. Do not draw sibling compartments as if they were children of each other.
- Include `TENANCY-ROOT` as the top visual root by default when `policies_configuration` assigns policies to `TENANCY-ROOT`. Place the landing-zone root compartment below it and connect `TENANCY-ROOT` to the landing-zone root with a parent-child arrow.
- For compartments, draw direct branches from the real parent:
  - `cmp-landingzone` -> `cmp-lz-network`
  - `cmp-landingzone` -> `cmp-lz-platform`
  - `cmp-landingzone` -> `cmp-lz-security`
  - `cmp-landingzone` -> `cmp-lz-prod`
  - `cmp-landingzone` -> `cmp-lz-test`
  - `cmp-lz-prod` -> `cmp-lz-prod-network`
  - `cmp-lz-prod` -> `cmp-lz-prod-platform`
  - `cmp-lz-prod-platform` -> `cmp-lz-prod-platform-oke`
  - `cmp-lz-prod` -> `cmp-lz-prod-projects`
  - `cmp-lz-prod` -> `cmp-lz-prod-security`

## Color Registry

| Meaning | Fill color | Stroke color | Notes |
|---|---:|---:|---|
| Tenancy root / landing-zone root | `#eef2ff` | `#5b6472` | Root or enclosing compartments, including `TENANCY-ROOT`. |
| Environment compartment | `#e8f7ee` | `#5b6472` | Example: `cmp-lz-prod`, `cmp-lz-test`. |
| Platform compartment, including OKE | `#e9ecef` | `#5b6472` | Example: OKE platform compartment. |
| Network / security / projects child compartments | `#fff9db` | `#5b6472` | Regular environment child compartments. |
| Shared child compartments | `#ffec99` | `#5b6472` | Shared network/platform/security. |
| Group boundary | `transparent` | `#c5cad3` | Visual grouping only, not an OCI compartment. |
| Default neutral box | `#f7f9fc` | `#5b6472` | Use only when no stronger semantic color applies. |
| Connector arrows | `transparent` | `#7b8494` | Use arrows for parent-child links. |

## Excalidraw Layout

- Prefer a branch layout over a vertical chain for compartment diagrams.
- Keep shared compartments together, environment compartments as group headers, and environment children below each environment.
- Every child compartment box must be visually below its real parent compartment box. Treat a child whose top edge is not below the parent's bottom edge as a layout failure, even if the connector line is technically attached.
- For One-OE compartment diagrams with shared and environment groups, treat Shared as the first visual level below the landing-zone compartment. Place environment groups such as Production and Test below Shared, from left to right.
- In One-OE compartment diagrams, keep the shared `network`, `platform`, and `security` row centered under `cmp-landingzone`: `cmp-lz-platform` should share the same horizontal center as `cmp-landingzone`, with `cmp-lz-network` and `cmp-lz-security` balanced symmetrically to the left and right.
- Keep sibling compartment boxes visually separated. Use enough horizontal spacing between siblings so labels breathe and curved arrows do not crowd or cross each other.
- Treat any compartment box overlap as a layout failure. Before calling a diagram finished, verify that no compartment rectangles intersect and keep at least 40 px of horizontal and vertical breathing room between unrelated boxes on the same visual level.
- Align a parent with its child only when the parent has exactly one child. In that case, place the child directly below the parent, centered on the same vertical axis, with enough vertical spacing for a clear arrow.
- When a parent has exactly two children, place both children below the parent, one to the lower left and one to the lower right, balanced around the parent's center.
- Prefer curved or rounded connectors because they look closer to the hand-drawn Excalidraw style, as long as the curves do not create confusing crossings.
- Use three-point arrows by default: start point, one intermediate control/bend point, and end point. Avoid long multi-point connector paths unless the user explicitly asks for more detailed routing.
- When a parent has three or more children, distribute them in a balanced branch layout below the parent, keep sibling boxes aligned on the same row when possible, and route the curved connectors with enough spacing to avoid overlapping or crossing arrows.
- When two nearby branches both have grandchildren on the same row, reserve separate horizontal lanes for those grandchildren. Do not let a platform leaf box overlap a projects leaf box just because their parents are adjacent.
- OKE should be nested under the environment platform branch, not directly under the environment root unless the generated `iam.json` says so.
- Keep the first text line equal to the generated compartment `name` value, except for the synthetic tenancy root box, which should be labeled `TENANCY-ROOT`. For compartment diagrams, include policy statement counts by default when the source IAM JSON has policies assigned to that compartment or to `TENANCY-ROOT`. Add the count as a compact secondary line inside the same box, using the bare number unless the user asks for a descriptive label.

## Target Result Checklist

- Draw `TENANCY-ROOT` above `cmp-landingzone` when tenancy-root policies exist, and show its policy statement count as a bare number below the label.
- Keep `cmp-lz-network`, `cmp-lz-platform`, and `cmp-lz-security` visually centered as a balanced row below `cmp-landingzone`, with `cmp-lz-platform` centered under `cmp-landingzone`.
- Keep shared platform children under their real parent. For example, `cmp-lz-shared-exacc` must sit directly below `cmp-lz-platform`, centered on the same vertical axis when it is the only child.
- Keep environment roots such as `cmp-lz-preprod` and `cmp-lz-prod` below the shared row and balanced left/right under `cmp-landingzone`.
- Keep environment child compartments below their environment parent. Keep grandchildren such as EXACC DB/infra and project DB compartments in separate horizontal lanes so boxes never overlap.
- Keep paired high-level arrows, such as `cmp-landingzone` to `preprod` and `cmp-landingzone` to `prod`, routed at matching bend heights when possible, but never at the cost of crossing compartment boxes. For One-OE diagrams with a shared row, route these environment arrows through upper side lanes outside the `network`, `platform`, and `security` boxes, then down into the environment boxes; do not let them pass through the shared row boxes.
- For IAM group visibility, add a side panel rather than drawing many crossing connectors through the compartment tree. Order group cards by policy scope: first `TENANCY-ROOT`, then `cmp-landingzone`, then more specific child compartments.
- In the group side panel, show a user icon, the group name, and the compartments the group can work with, including the statement count per compartment.
- Mark every group that relies on tag-based policy conditions with a compact `TBAC` tag. Detect this from policy statements that reference compartment tags, such as `target.resource.compartment.tag...` or `sets-intersect(target.resource.compartment.tag...)`; do not limit the tag to Network and Security groups.
- Match the right-side panel style from the ExaCC baseline: a transparent boundary box, title `Access groups`, compact subtitle, scope section headers, two-column cards when space allows, user icon shapes on each card, compartment/count text below the group name, and `TBAC` tags aligned on the card for tag-conditioned access.
- Before finishing, validate: every child top edge is below the parent bottom edge, no compartment boxes overlap, all arrows have exactly three points, and no arrow crosses a compartment box other than its bound source or target.

## Network Diagram Standard

Use this standard when the user asks for a network graph, VCN/subnet graph, or a diagram based on a network JSON such as `oneoe_network_hub_a.json`. This is distinct from the IAM/compartment diagram standard above.

- Use the network JSON as the source of truth. Extract VCNs, subnets, DRGs, and DRG attachments from `network_configuration.network_configuration_categories`.
- Add OCI hierarchy boundary boxes when drawing full network views: `OCI Region`, `OCI Tenancy`, landing-zone compartment, shared network compartment, and environment network compartments when those scopes can be inferred from the network JSON and naming.
- For network-only views, omit OCI hierarchy and compartment boundary boxes. Use a clear three-level layout: hub VCN on the first level, DRG on the second level, and environment spoke VCNs such as prod/preprod on the third level.
- Show VCNs as large transparent rectangles with red dashed borders. Do not color-fill VCN boxes, including prod/preprod environment VCNs.
- Show environment network boundary boxes as transparent dashed containers. Do not color-fill prod/preprod environment containers.
- Show subnets inside their parent VCN as transparent rectangles with dashed borders. Use red dashed borders for private subnets. Do not color-fill subnets by default, including public subnets, unless the user explicitly asks for a highlight.
- Represent VCN gateways as circles that sit on the VCN border, not as free-floating nodes fully inside the VCN.
- For hub VCNs, place gateway circles on the left VCN border. For spoke VCNs, place gateway circles on the bottom VCN border.
- Include Internet Gateway, NAT Gateway, and Service Gateway when present in the network JSON.
- Label gateway circles with a compact type prefix such as `IGW`, `NAT`, or `SGW`, plus the generated gateway `display_name`.
- Add a small auxiliary `RT` box inside or slightly overlapping the subnet border, matching the compact side-marker style used in OCI network diagrams.
- Use a soft cream/orange style for small subnet `RT` markers, such as fill `#fff7ed` and stroke/text `#9a3412`. Do not use blue for these small subnet route-table markers.
- Place each subnet's small `RT` box on the subnet edge facing the related route-table card. If the colored route-table card is to the left of the VCN, align the subnet `RT` boxes to the left edge of the affected subnets; if it is to the right, align them to the right edge. This applies to hub subnets as well as spoke subnets, for example hub `mgmt`, `mon`, and `dns` should use left-edge subnet `RT` boxes when their `mgmt` route-table card is left of the hub VCN.
- When the network JSON includes route tables, add compact route-table cards near the related VCN/subnet branches. Include the route table display name, destination, and simplified next hop (`IGW`, `NGW`, `SGW`, `DRG`, `NFW private IP`, or attachment label).
- Route-table cards are the only boxes that should use strong color fills in the default network diagram style.
- Draw a plain connector line from each route-table card to the small `RT` box of every subnet that uses that route table.
- Route-table connector lines must leave the route-table card from the colored header band, not from the white body. When several lines leave the same route-table card, distribute their start points within the colored header band so the lines remain visually distinct.
- Keep route-table connector routing simple and readable: use a three-point line with one manually placed bend. A short horizontal first segment is fine for nearby or same-row destinations, but prefer an angled bend when it separates parallel lines, avoids stacking lines on top of each other, or makes the route visually cleaner. Do not use arrowheads on these route-table connector lines; they should read as associations, not traffic direction.
- End subnet route-table connector lines at the center of the small subnet `RT` marker. End DRG route-table connector lines at the relevant VCN-to-DRG line near the DRG side or near the hub VCN edge when the route table is explicitly tied to that side.
- For hub VCN route-table cards, use thin low-emphasis connector lines from each small subnet `RT` box to the purple route-table card referenced by that subnet's `route_table_key`. Keep these connectors visually secondary and layer them behind hub subnet labels and service markers so they do not make the hub unreadable.
- For Hub A, group the purple hub route-table cards symmetrically around the hub VCN: place `natgw`, `mgmt`, and `ingress` in a left-side column, and `fw-dmz`, `lb`, and `fw-int` in a right-side column. Keep each column aligned to a common x-coordinate and vertically centered against the hub VCN area.
- When a hub variant has fewer route-table cards than Hub A or route-table cards with different row counts, remove any source-only cards and resource labels that no longer exist in the JSON, then re-space the remaining route-table cards so their full rectangle heights do not overlap. Keep a clear visible vertical gap between purple route-table cards, around 48 px when space allows. For sparse hubs such as Hub E, place the two remaining purple cards (`mgmt` on the left and `lb` on the right) farther away from the hub VCN and align their colored header bands at roughly the same height; do not force exact center alignment if a slight vertical offset reads cleaner. Hub B has one firewall route table and must not leave orphan `fw-int` labels; its FW and LB route-table cards need a visible vertical gap after the FW card grows to three rows.
- For spoke VCNs, keep route-table cards and connector lines source-accurate: draw only the route tables that exist in the network JSON, then draw thin low-emphasis connector lines from each green route-table card to the small `RT` box of each subnet whose `route_table_key` references that route table.
- Prefer pastel route-table card colors over saturated fills. Use soft lavender for hub route-table cards, soft green for spoke route-table cards, and soft red/pink for DRG route-table cards; keep title text dark enough to be readable on the pastel header.
- For side-by-side prod/preprod spoke VCNs, place the prod spoke route-table card to the left of the prod VCN and the preprod spoke route-table card to the right of the preprod VCN. Keep these external green route-table cards visibly separated from the VCN borders; use about 80-100 px of horizontal gap by default so the cards do not appear to touch or crowd the VCN.
- For hub DRG route tables such as `drgrt-fra-lz-hub`, draw a thin low-emphasis connector line from the red route-table card to the hub-to-DRG connection near the DRG edge, at the start of the line segment that goes from the DRG toward the hub VCN.
- For spoke DRG route tables such as `drgrt-fra-lz-spokes`, draw thin low-emphasis connector lines from the red route-table card to the spoke-to-DRG connection lines near the DRG edge. End these connectors near the point where each spoke line reaches the DRG, not in the middle of the spoke VCN.
- For Hub A-style diagrams, include visible markers for major in-hub services such as load balancer and OCI Network Firewall when the JSON contains them. Place the load balancer marker inside the LB subnet and each firewall marker inside its corresponding firewall subnet. Add these markers without removing the VCN, subnet, gateway, or DRG elements.
- Size Hub A load balancer and firewall markers wide and tall enough for their full labels, and keep the marker rectangle plus label fully inside the corresponding subnet: `lb` inside the LB subnet, `nfw-fra-lz-hub-dmz` inside the FW DMZ subnet, and `nfw-fra-lz-hub-int` inside the FW INT subnet.
- Show DRG attachment labels such as `vcn-hub-attach`, `vcn-prod-attach`, and `vcn-preprod-attach` when the JSON exposes DRG attachment names.
- Represent the DRG as a smaller grey circle labeled with the generated DRG `display_name` when present. Keep the DRG separated from VCN boxes so it does not visually touch or crowd hub, prod, or preprod VCNs.
- Connect each VCN to the DRG with plain lines, not arrows. Use no arrowheads for VCN-to-DRG links.
- Route each VCN-to-DRG line from the midpoint of the VCN edge facing the DRG, through the center of that VCN's DRG attachment label box, and then to the DRG. Keep these as editable three-point lines; adjust the middle point manually when needed so the spoke and hub connections fan cleanly into the DRG instead of looking like overlapping or overly rigid straight segments.
- VCN-to-DRG lines must stop at the outside edge of the DRG circle, not continue into the center of the circle.
- Do not draw VCN-to-VCN arrows for DRG connectivity; the DRG circle is the central connectivity object.
- Keep network diagrams focused on network resources. Do not add IAM group panels, policy statement counts, or TBAC tags to network-only diagrams.
- Add a concise legend with the official hub documentation link icon and a resource glossary only. Do not include styling prose in the legend.
- The resource glossary should list abbreviations and descriptions, for example: `VCN = Virtual Cloud Network`, `SN = Subnet`, `IGW = Internet Gateway`, `NGW = NAT Gateway`, `SGW = Service Gateway`, and `DRG = Dynamic Routing Gateway`.
- Add a clickable documentation icon in the legend for the hub model represented by the source file:
  - `hub_a`: `https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_a`
  - `hub_b`: `https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_b`
  - `hub_c`: `https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_c`
  - `hub_d`: `https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_d`
  - `hub_e`: `https://github.com/oci-landing-zones/oci-landing-zone-operating-entities/tree/master/addons/oci-hub-models/hub_e`
- Before finishing, validate the `.excalidraw` with `jq empty`, confirm all VCN/subnet boxes use dashed borders, confirm VCN/private-subnet borders are red, confirm subnet boxes are transparent unless explicitly highlighted, confirm route-table cards retain their colored headers/fills, and confirm VCN-to-DRG connectors are `line` elements with no arrowheads.
