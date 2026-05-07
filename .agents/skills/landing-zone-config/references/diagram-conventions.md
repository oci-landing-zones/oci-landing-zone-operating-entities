# Landing Zone Diagram Conventions

Use these conventions when creating editable Excalidraw diagrams for generated landing zone artifacts.
By default, create only the `.excalidraw` file. Do not create `.svg`, `.png`, `.dot`, Mermaid, or other preview/export files unless the user explicitly asks for those formats.

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
- Keep paired high-level arrows, such as `cmp-landingzone` to `preprod` and `cmp-landingzone` to `prod`, routed at matching bend heights when possible, but never at the cost of crossing compartment boxes.
- For IAM group visibility, add a side panel rather than drawing many crossing connectors through the compartment tree. Order group cards by policy scope: first `TENANCY-ROOT`, then `cmp-landingzone`, then more specific child compartments.
- In the group side panel, show a user icon, the group name, and the compartments the group can work with, including the statement count per compartment.
- Mark every group that relies on tag-based policy conditions with a compact `TBAC` tag. Detect this from policy statements that reference compartment tags, such as `target.resource.compartment.tag...` or `sets-intersect(target.resource.compartment.tag...)`; do not limit the tag to Network and Security groups.
- Before finishing, validate: every child top edge is below the parent bottom edge, no compartment boxes overlap, all arrows have exactly three points, and no arrow crosses a compartment box other than its bound source or target.
