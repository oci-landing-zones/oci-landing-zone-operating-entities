# Diagram design rules

The diagram presents the generated landing zone as a readable architecture drawing. The same graph and resource blocks drive Studio and the Draw.io download. Configuration changes must preserve these rules across deployment scopes, hub models, environments, projects, platforms and visible layers.

## Composition

- Foundation is a compartment overview. Environment cards use content-measured, readable widths and one vertical column. Cards share the same left edge and stack in configuration order with a 12px gap and their actual content heights.
- Shared network, security and platform compartments have equal widths and align on the same left edge. Their heights follow their contents. Shared and environment sections align at the top.
- Environment cards in the same view have equal widths. Generated child compartments reserve enough space for their resource groups before the cards are positioned.
- Network views retain the hub, attachment and environment topology. Route-table lanes and connector channels reserve their own space. A height limit must never hide real networks, routes or generated resources.
- Containers fit their actual child extents with consistent title space, padding and gaps. Repeated sibling cards do not overlap, and growth must not leave obsolete outer bounds or unnecessary empty tails.
- Attachment pills fit the complete generated label using the shared font, weight and terminal padding in both canvas and export. The stack uses its longest actual label; cluster sizing includes the DRG caption and physical fan lanes. A fixed width or an ellipsis is not a substitute for reserved readable text bounds.
- DRG captions are measured visible content below the glyph. Their bounds stay inside the compartment and remain obstacles to connector lines, including lines whose terminal belongs to that DRG. DRG connection ports sit on a white rounded square frame containing the smaller circular DRG glyph. The dotted frame provides straight-sided attachment anchors. The DRG glyph stays 48 pixels square and is centered beneath the hub VCN.

## Resource blocks and hierarchy

- Service groups use up to three columns, with a minimum 180px cell width. Long names wrap and grow their blocks; names are never clipped or shortened to pass a size check.
- Resource blocks have no semantic display order. Measured heights determine compact shortest-column placement, with stable IDs breaking equal-height ties. Each column uses a 12px gap without reserving the height of an unrelated taller block. Compartment height follows the lowest occupied block plus padding.
- Icons and complete heading blocks share a vertical centre. Text remains inside the block and resource rows retain consistent line spacing.
- Shared compartments use `#FAF8D6`. Yellow compartments within environments use `#FCF9BD`. Environment wrappers remain green; environment platform compartments retain `#999999` with white text, and project compartments retain their distinct neutral hierarchy.
- The palette is resolved once from semantic compartment scope and reused by the canvas, minimap and export.
- Names, resource entries, owners and ancestor relationships come from the selected final Blueprint Factory outputs. Layout must not invent, omit or move resources to improve appearance.

## Routing and updates

- An enabled OCI Bastion appears once inside its generated hub management subnet and VCN, including in Foundations. This is network placement; its IAM compartment remains shared security in the generated configuration. An external operator connects to the managed service through a dynamic SSH session. Do not draw a separate shared-security service block, invent an endpoint IP or show a Bastion VM. The flow stage adds destination previews.
- Bastion route choices use generated private subnet associations from project, environment-platform and shared-platform networks, including designs with project networking disabled. Platforms without generated subnets have no invented destination. Attachment-to-VCN references and matched route rows determine the path in both the live graph and Draw.io.
- The external operator uses an unboxed teal laptop glyph, a bold workstation label and a secondary connection caption. A connected cloud labelled Internet makes its external access location explicit. Studio and Draw.io share the same SVG and source connector geometry; it must not resemble a deployed compartment or VM.
- Bastion flows are labelled route previews. Their details require session, target NSG/security-rule and firewall-policy validation and state that routed spoke access is beyond Oracle's documented Bastion VCN boundary. A missing route, unresolved attachment or route that ends at an Internet gateway cannot be shown as delivery to the private target.

- Physical links use orthogonal geometry computed after final layout. DRG attachment links meet attachment rectangles without endpoint dots; dots remain at the VCN and DRG endpoints. Opposing endpoint extensions share the available gap. Clear terminal approaches must not reverse into those extensions.
- VPN drawings place each configured CPE in an on-premises boundary outside the OCI region, including equipment not yet assigned to a VPN. VPNs reference the actual CPE key or existing CPE OCID; multiple VPNs sharing equipment use one router glyph. Two distinct tunnel nodes per VPN show the configured inside addresses and connect that CPE to separate DRG ports. VPN and FastConnect share one generated `hc` ingress table below the connectivity rows. All DRG route-table markers sit at the corresponding attachment's endpoint on the DRG glyph. Configuration flow previews follow Tunnel 1 through the same connection geometry; they do not infer deployed tunnel state.
- FastConnect uses the same compact external layout: customer router, one virtual circuit and one DRG attachment per circuit. Provider, bandwidth and configured BGP mappings appear on the circuit; multiple mappings do not create additional circuits or DRG attachments. Physical preparation alone has no routed connection.
- Structural routing prioritizes avoiding unrelated resource and compartment interiors, including generated service blocks. Its actual endpoints, associated port dots, owning resources and ancestor containers are the only ownership exceptions; touching a box boundary is allowed. Table-card interiors remain obstacles even when the card is the connection's target. Ports may move to an unobstructed border position when no fixed port was specified. Constrained layouts may retain unavoidable intersections; routing must render the best available path instead of failing the diagram.
- All generated table cards remain visible in routing mode. Each card uses a predefined column or compartment boundary lane, chosen automatically from its owner geometry and line contacts. Canonical owner dots stay on their actual resources.
- Route-table leaders may cross resource bodies. Each leader connects its owner dot directly to the nearest top corner of the card without an outward stub; ties choose the left corner. All route-table owner dots use the same 8-pixel diameter, including VCN, subnet, gateway and DRG dots. Cards may use the left, center and right columns or straddle any compartment boundary, while keeping titles, resource bodies and physical connections clear. Automatic table placement uses two bounded passes to choose columns and vertical order. Joint moves can insert one card into another's slot, relocate the displaced card to a different column and push neighbouring cards down; the complete arrangement must remain valid before its score is compared. No table names or service-specific ordering rules affect placement.
- Placement first avoids false shared runs. The final pass also prioritizes reducing vertical separation beyond two card widths. Within those preferences, a combined score balances resource intersections, line contacts, obscured content and distance from the owner ports. Squaring the worst leader's contact count discourages concentrating crossings on one connection to improve several others. Gaps beyond half a card width incur a growing proximity penalty, averaged per table; total line length breaks equal scores. Vertical candidates follow content boundaries, physical channels and a small set of samples spanning the available height. Cards stay clear of visible resource blocks, headings, captions, other cards and existing physical connections; crowded columns grow vertically instead of creating another column. Resource positions and physical/packet paths stay unchanged. Measurements include lines returning through their own owner bodies. Table-leader intersections are measured separately from physical-path clearance; the search does not guarantee a global optimum.
- Structural paths are routed together to reduce perpendicular crossings and shared collinear runs. Corner and T contacts count too; actual shared endpoint junctions do not. Separate attachment-to-DRG links must keep distinct physical segments even when they share the same DRG. A common terminal point is allowed; a shared trunk would imply a connection that does not exist. Perpendicular crossings remain a best-effort preference rather than an absolute zero-crossing rule.
- Contact measurements exclude intentional same-table annotation junctions and the initial outward port escape where an annotation meets its own physical connection. Later crossings still count even when links share an owner. Clear text and distinct physical connections take priority if preserving them requires an additional point crossing.
- Packet paths reuse the same physical attachment geometry. Each numbered marker, packet pause and effective-rule highlight resolves to its shared processing anchor.
- Selecting a flow changes presentation without recalculating route geometry. Review exports the complete static design and routing tables for the current generated snapshot, independently of selected Diagram view layers.
- Initial display publishes one complete generated snapshot already fitted to its viewport. Pending changes keep the previous complete snapshot and its matching model together; pending content cannot be edited or exported as current.

## Automatic checks

`bun run test` runs the diagram layout policy and quality matrix as part of Studio's existing CI test step. Run the focused matrix with `bun run test -- src/diagram/layoutQuality.test.ts`.

The matrix covers Foundation and network stages, zero and multiple environments, all supported hubs, complete and DR scope, disabled Projects VCNs, platforms, long generated names, table layers and active flows. It checks geometry, ownership, readable widths, shared alignment, compact bounds, composition, palette and routing anchors. Independent measurements bound ordinary hub line contacts and verify clear resource interiors in feasible fixtures, without rejecting unavoidable crossings globally. Mutation cases prove that deliberately clipped attachment labels, shared physical trunks, broken widths, overlaps, inventories, missing connector paths and anchors are rejected. Shared text estimates are backed by browser checks of actual rendered label bounds and terminal clearance at readable zoom levels.

Browser inspection remains necessary for typography and the full composition at desktop and phone sizes. Geometry tests complement that inspection; containment alone does not establish that a diagram is readable.

- The hub VCN attachment uses a vertical label above the DRG, with top/bottom connection ports. Other VCN attachment labels remain horizontal.

- Hub attachment links align vertically from the hub VCN to the DRG. Other VCN attachments use distinct DRG ports; dense attachment stacks keep their labels separated without enlarging the DRG.

- The vertical hub attachment rectangle is centered on its connection, with 12-pixel line segments above and below in the standard layout.

- Hub and shared VCNs are centered horizontally in the network compartment. The DRG and vertical hub attachment share that centerline; compartment width reserves space for the attachment stack on the right.

- Spoke and environment platform VCNs use equal horizontal margins in their network compartments. Route cards can overlap compartment bodies and borders while leaving their titles readable.

- Every route card also considers lanes 66 pixels from owner ports and resource edges. Placement proximity penalizes both cramped gaps below 66 pixels and excessive distance beyond 132 pixels, while preserving resource and connection clearance.

- Ingress cards stay on the left of their owner ports. Left-lane cards prefer a shared right edge 66 pixels before the leftmost owner port, with fallback positions when resources or connections obstruct alignment.

- The hub-bound DRG route card sits below the hub ingress card in the same left column when clear. The spoke-bound DRG route card stays to the right of the DRG; the spoke card does not participate in the shared left-card alignment.

- The hub ingress card starts beside the hub VCN bottom port, with the hub DRG card stacked 16 pixels beneath it where space permits.

- Dotted table leaders must not enter VCN interiors from outside or re-enter their VCN from a border dot. Subnet and gateway annotations may exit their owning VCN. VCN clearance takes precedence over shared column alignment.

- The hub DRG route card sits 12 pixels outside the network compartment’s left edge, with its top 12 pixels below the DRG glyph where clear, independent of shared left-column spacing.

- Spoke and OKE subnet route cards share a column 40 pixels right of their VCN, centered vertically around their owner rows. Cards shift vertically when needed to keep the column clear. The same rule applies to every environment.

- The spoke-bound DRG route card prefers a position 36 pixels below the attachment stack and beside the DRG, keeping its dotted leaders off attachment labels. Dense solid attachment fans retain a clear 12-pixel terminal approach.

- Subnet boxes have equal horizontal margins inside hub, spoke and platform VCNs.

- Oracle Services Network icons are 36 pixels square with an opaque white mesh interior and white node circles, with the SVG scaled to its wrapper and the icon center anchored to the bottom-right VCN corner in both canvas and Draw.io.

- The hub-to-DRG gap expands to fit visible nearby routing cards and the upper part of a dense attachment stack. The DRG, spoke attachments and following compartments move down together before physical and packet paths are calculated. The hub attachment label stays centered on the longer connection; VCN and DRG sizes stay unchanged. Compact layouts retain the short gap.

- Hub-link expansion considers only hub ingress cards and clearance above the attachment stack; large DRG and subnet cards do not enlarge it. Hub subnet route cards prefer one column 66 pixels right of the VCN and move downward to clear other cards.

- Clickable route-table dots show a slow expanding halo without moving their connection anchors. Locked dots do not pulse; reduced-motion users see a static halo.

- Endpoint and Flow views share a canonical layout planned with all tables and endpoint space. Opening a table only changes visibility; it does not move route cards, owner dots, physical connections or packet paths. Hidden endpoint decorations retain their reserved space in detail views.

- Right-hand wrapper padding follows the final canonical table/resource and connection extents, instead of retaining an unused reserved routing lane. Spoke/OKE cards follow owner-subnet vertical order, with 12-pixel spacing, so pods precedes workers without crossing their leader lines.

- Environment-owned subnet route cards stay strictly inside their owning environment’s vertical span. Ordered stacks compact upward as needed; overflow uses additional columns on the right, with outer wrappers fitted afterward, rather than spilling into a different environment.

- Route-card stacks are grouped by owning VCN, not by environment alone. Multi-card OKE stacks center vertically beside their own VCN independently of the projects route card; environment bounds and overflow columns still apply.

- During flow playback, the matched route row smoothly scales to 112% with a green fill, outline and shadow, then returns over 360 ms when the packet leaves that lookup. The active card rises above neighboring cards without changing layout or connector anchors. Manual steps hold the same highlight; reduced motion keeps the highlight without scaling.

- Packet travel uses a consistent 240 diagram units per second for longer paths, retaining a 1750-ms minimum for short paths. There is no maximum-duration cap that accelerates Internet flows; rule and hop dwell times remain synchronized.

- The active rule also shows a green magnified callout with larger bold text for every cell, without ellipsis. The callout smoothly appears and disappears over the matched row and does not alter layout, playback speed or connector geometry.

- Local subnet flow legs approach the VCN attachment port in the physical connection’s departure direction. This prevents a false U-turn at the VCN border while retaining canonical resource visits, hop anchors and route-rule timing.

- When an outbound subnet leg meets the attachment departure segment before the VCN port, the packet joins directly at that intersection. The redundant excursion to the border is omitted; actual routing-rule processing anchors and subsequent connection geometry remain intact.

- Review Draw.io exports always use the complete static design with all route tables and association dots/lines, regardless of live wizard layer selections. Example VM endpoints, flow paths and active rule highlighting are excluded. Export requires a ready generated preview.

- Route-table cards have a soft lower-right drop shadow in Studio and native shadows in Draw.io exports, without changing card geometry or attachment anchors.

- Hub C untrust/trust subnets show NLB distribution icons with captions “Untrust NLB” and “Trust NLB”. Two translucent illustrative firewall backends bridge a reserved 72-pixel gap between those subnets. The same symbols appear in Draw.io and do not add deployable resources.

- Translucent Hub C backend connectors terminate at unlabeled interface dots within untrust and trust. Firewall 1/2 labels sit above their symbols at the same opacity.

- Hub C backend illustrations follow the two-interface design: unlabeled interface dots sit inside untrust and trust, with orthogonal connections to the two firewall symbols between the subnets. Firewall labels sit above their symbols. All illustrative elements retain the same translucency.
