# Diagram design rules

The diagram presents the generated landing zone as a readable architecture drawing. The same graph and resource blocks drive Studio and the Draw.io download. Configuration changes must preserve these rules across deployment scopes, hub models, environments, projects, platforms and visible layers.

## Composition

- Foundation is a compartment overview. Environment cards use content-measured, readable widths and one vertical column. Cards share the same left edge and stack in configuration order with a 12px gap and their actual content heights.
- Shared network, security and platform compartments have equal widths and align on the same left edge. Their heights follow their contents. Shared and environment sections align at the top.
- Environment cards in the same view have equal widths. Generated child compartments reserve enough space for their resource groups before the cards are positioned.
- Network views retain the hub, attachment and environment topology. Route-table lanes and connector channels reserve their own space. A height limit must never hide real networks, routes or generated resources.
- Containers fit their actual child extents with consistent title space, padding and gaps. Repeated sibling cards do not overlap, and growth must not leave obsolete outer bounds or unnecessary empty tails.
- Attachment pills fit the complete generated label using the shared font, weight and terminal padding in both canvas and export. The stack uses its longest actual label; cluster sizing includes the DRG caption and physical fan lanes. A fixed width or an ellipsis is not a substitute for reserved readable text bounds.
- DRG captions are measured visible content below the glyph. Their bounds stay inside the compartment and remain obstacles to connector lines, including lines whose terminal belongs to that DRG. Glyph connection ports stay on the glyph boundary.

## Resource blocks and hierarchy

- Service groups use up to three columns, with a minimum 180px cell width. Long names wrap and grow their blocks; names are never clipped or shortened to pass a size check.
- Resource blocks have no semantic display order. Measured heights determine compact shortest-column placement, with stable IDs breaking equal-height ties. Each column uses a 12px gap without reserving the height of an unrelated taller block. Compartment height follows the lowest occupied block plus padding.
- Icons and complete heading blocks share a vertical centre. Text remains inside the block and resource rows retain consistent line spacing.
- Shared compartments use `#FAF8D6`. Yellow compartments within environments use `#FCF9BD`. Environment wrappers remain green; environment platform compartments retain `#999999` with white text, and project compartments retain their distinct neutral hierarchy.
- The palette is resolved once from semantic compartment scope and reused by the canvas, minimap and export.
- Names, resource entries, owners and ancestor relationships come from the selected final Blueprint Factory outputs. Layout must not invent, omit or move resources to improve appearance.

## Routing and updates

- Structural links use orthogonal geometry computed after final layout. DRG attachment links retain endpoint dots at both ends. Opposing endpoint extensions share the available gap. Clear terminal approaches must not reverse into those extensions.
- Structural routing prioritizes avoiding unrelated resource and compartment interiors, including generated service blocks. Its actual endpoints, associated port dots, owning resources and ancestor containers are the only ownership exceptions; touching a box boundary is allowed. Table-card interiors remain obstacles even when the card is the connection's target. Ports may move to an unobstructed border position when no fixed port was specified. Constrained layouts may retain unavoidable intersections; routing must render the best available path instead of failing the diagram.
- All generated table cards remain visible in routing mode. Gateway, shared VCN ingress and DRG/RPC attachment tables stay left of the shared network; shared subnet tables stay to its right, and environment subnet tables stay right of the environments. Within each fixed column, placement considers the complete owner set and nearby free vertical space. Attachment sizing and connection routing cannot change a table's column. Canonical owner dots stay on their actual resources.
- Each table has one dedicated annotation rail and one entry at its card boundary. All its owner branches join that rail; shared portions are drawn once. Rails of different tables stay distinct where their vertical spans overlap, so a junction cannot imply an association with a different table. After the initial straight outward terminal escape, annotation branches avoid their own resource body and label as well as other resources. Complete logical association paths remain available for verification and export.
- A branch may join its rail at an existing clear corridor instead of returning to its source height. A join outside the original height range must clear other reserved rails; its selected extent is reserved before routing later tables. Complete visible table connections rank crossings and overlapping runs before length plus the shared 24px cost per corner. Shared strokes count once; shortcuts preserve owner clearance and terminal directions.
- Structural paths are routed together to reduce perpendicular crossings and shared collinear runs. Corner and T contacts count too; actual shared endpoint junctions do not. Separate attachment-to-DRG links must keep distinct physical segments even when they share the same DRG. A common terminal point is allowed; a shared trunk would imply a connection that does not exist. Perpendicular crossings remain a best-effort preference rather than an absolute zero-crossing rule.
- Contact measurements exclude intentional same-table annotation junctions and the initial outward port escape where an annotation meets its own physical connection. Later crossings still count even when links share an owner. Clear text and distinct physical connections take priority if preserving them requires an additional point crossing.
- Packet paths reuse the same physical attachment geometry. Each numbered marker, packet pause and effective-rule highlight resolves to its shared processing anchor.
- Selecting a flow changes presentation without recalculating route geometry. Review exports the selected Diagram view layers for the current generated snapshot, even when the form shows a clean overview.
- Initial display publishes one complete generated snapshot already fitted to its viewport. Pending changes keep the previous complete snapshot and its matching model together; pending content cannot be edited or exported as current.

## Automatic checks

`bun run test` runs the diagram layout policy and quality matrix as part of Studio's existing CI test step. Run the focused matrix with `bun run test -- src/diagram/layoutQuality.test.ts`.

The matrix covers Foundation and network stages, zero and multiple environments, all supported hubs, complete and DR scope, disabled Projects VCNs, platforms, long generated names, table layers and active flows. It checks geometry, ownership, readable widths, shared alignment, compact bounds, composition, palette and routing anchors. Independent measurements bound ordinary hub line contacts and verify clear resource interiors in feasible fixtures, without rejecting unavoidable crossings globally. Mutation cases prove that deliberately clipped attachment labels, shared physical trunks, broken widths, overlaps, inventories, missing connector paths and anchors are rejected. Shared text estimates are backed by browser checks of actual rendered label bounds and terminal clearance at readable zoom levels.

Browser inspection remains necessary for typography and the full composition at desktop and phone sizes. Geometry tests complement that inspection; containment alone does not establish that a diagram is readable.
