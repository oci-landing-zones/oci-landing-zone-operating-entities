/**
 * OCI network icons (teal) — gateways, network firewall, load balancer.
 * One SVG source per icon, consumed by the React Flow canvas and embedded as
 * image cells in the .drawio export so both render the identical glyph.
 */

const TEAL = '#2A5B66';

/** Internet Gateway: circle, vertical through-arrows outward, horizontal arrows inward. */
export const IGW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="13.5" fill="#ffffff" stroke="${TEAL}" stroke-width="2.4"/>
  <g stroke="${TEAL}" stroke-width="2.4" fill="${TEAL}">
    <line x1="24" y1="7" x2="24" y2="41"/>
    <polygon points="24,1 19.8,8.4 28.2,8.4" stroke="none"/>
    <polygon points="24,47 19.8,39.6 28.2,39.6" stroke="none"/>
    <line x1="3" y1="24" x2="16.5" y2="24"/>
    <polygon points="21.5,24 14.5,20 14.5,28" stroke="none"/>
    <line x1="45" y1="24" x2="31.5" y2="24"/>
    <polygon points="26.5,24 33.5,20 33.5,28" stroke="none"/>
  </g>
</svg>`;

/** NAT Gateway: circle, single vertical arrow out the top, horizontal arrows inward. */
export const NATGW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <circle cx="24" cy="24" r="13.5" fill="#ffffff" stroke="${TEAL}" stroke-width="2.4"/>
  <g stroke="${TEAL}" stroke-width="2.4" fill="${TEAL}">
    <line x1="24" y1="7" x2="24" y2="36"/>
    <polygon points="24,1 19.8,8.4 28.2,8.4" stroke="none"/>
    <line x1="6" y1="24" x2="16.5" y2="24"/>
    <polygon points="21.5,24 14.5,20 14.5,28" stroke="none"/>
    <line x1="42" y1="24" x2="31.5" y2="24"/>
    <polygon points="26.5,24 33.5,20 33.5,28" stroke="none"/>
  </g>
</svg>`;

/** Service Gateway: stacked double circle, vertical + horizontal arrows inward. */
export const SGW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <path d="M 12.5 36.5 A 14.5 14.5 0 1 1 36.6 12.7" fill="none" stroke="${TEAL}" stroke-width="2.4"/>
  <circle cx="26" cy="25" r="13.5" fill="#ffffff" stroke="${TEAL}" stroke-width="2.4"/>
  <g stroke="${TEAL}" stroke-width="2.2" fill="${TEAL}">
    <line x1="26" y1="16" x2="26" y2="34"/>
    <polygon points="26,12 22.4,18.4 29.6,18.4" stroke="none"/>
    <polygon points="26,38 22.4,31.6 29.6,31.6" stroke="none"/>
    <line x1="14.5" y1="25" x2="20" y2="25"/>
    <polygon points="24.2,25 18,21.5 18,28.5" stroke="none"/>
    <line x1="37.5" y1="25" x2="32" y2="25"/>
    <polygon points="27.8,25 34,21.5 34,28.5" stroke="none"/>
  </g>
</svg>`;

/** OCI Network Firewall: brick wall with a flame-in-circle badge. */
export const FIREWALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <g fill="none" stroke="${TEAL}" stroke-width="2.4" stroke-linejoin="round">
    <rect x="5" y="5" width="38" height="38" rx="1.5"/>
    <line x1="5" y1="14.5" x2="14" y2="14.5"/><line x1="34" y1="14.5" x2="43" y2="14.5"/>
    <line x1="5" y1="24" x2="11" y2="24"/><line x1="37" y1="24" x2="43" y2="24"/>
    <line x1="5" y1="33.5" x2="14" y2="33.5"/><line x1="34" y1="33.5" x2="43" y2="33.5"/>
    <line x1="17" y1="5" x2="17" y2="9"/><line x1="31" y1="5" x2="31" y2="9"/>
    <line x1="12" y1="39.5" x2="12" y2="43"/><line x1="24" y1="39.5" x2="24" y2="43"/><line x1="36" y1="39.5" x2="36" y2="43"/>
  </g>
  <circle cx="24" cy="24" r="10.5" fill="#ffffff" stroke="${TEAL}" stroke-width="2.4"/>
  <path d="M24 16.8c.4 2.4-.6 3.8-1.9 5.3-1.3 1.5-2.3 3-2.3 4.9 0 2.6 1.9 4.4 4.2 4.4s4.2-1.8 4.2-4.4c0-1.3-.5-2.4-1.2-3.5-.3.9-.8 1.5-1.5 1.9.4-2.9-.3-6.4-1.5-8.6z" fill="${TEAL}"/>
</svg>`;

/** Load Balancer: ellipse with one inbound arrow and a three-arrow fan out. */
export const LB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <g stroke="${TEAL}" stroke-width="2.4" fill="${TEAL}">
    <ellipse cx="17" cy="24" rx="6.5" ry="13" fill="#ffffff"/>
    <line x1="2" y1="24" x2="11" y2="24"/>
    <polygon points="16.5,24 9.5,20 9.5,28" stroke="none"/>
    <line x1="20" y1="21" x2="38" y2="6.5"/>
    <polygon points="42,3.5 34.6,5.4 39.6,11.4" stroke="none"/>
    <line x1="22" y1="24" x2="40" y2="24"/>
    <polygon points="45,24 38,20 38,28" stroke="none"/>
    <line x1="20" y1="27" x2="38" y2="41.5"/>
    <polygon points="42,44.5 39.6,36.6 34.6,42.6" stroke="none"/>
  </g>
</svg>`;

const OSN_BROWN = '#BB501C';

/**
 * Oracle Services Network (OSN): five ring-nodes in a pentagon plus a centre
 * ring, wired as a wheel — the OCI "services mesh" glyph. Ring (outlined)
 * circles, not filled dots. Sits in the lower-right corner of every VCN.
 */
export const OSN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">
  <g fill="none" stroke="${OSN_BROWN}" stroke-width="2.1">
    <line x1="22" y1="9" x2="34.4" y2="18"/><line x1="34.4" y1="18" x2="29.6" y2="32.5"/>
    <line x1="29.6" y1="32.5" x2="14.4" y2="32.5"/><line x1="14.4" y1="32.5" x2="9.6" y2="18"/>
    <line x1="9.6" y1="18" x2="22" y2="9"/>
    <line x1="22" y1="22" x2="22" y2="9"/><line x1="22" y1="22" x2="34.4" y2="18"/>
    <line x1="22" y1="22" x2="29.6" y2="32.5"/><line x1="22" y1="22" x2="14.4" y2="32.5"/>
    <line x1="22" y1="22" x2="9.6" y2="18"/>
  </g>
  <g fill="#ffffff" stroke="${OSN_BROWN}" stroke-width="2.1">
    <circle cx="22" cy="9" r="3.9"/><circle cx="34.4" cy="18" r="3.9"/>
    <circle cx="29.6" cy="32.5" r="3.9"/><circle cx="14.4" cy="32.5" r="3.9"/>
    <circle cx="9.6" cy="18" r="3.9"/><circle cx="22" cy="22" r="4.2"/>
  </g>
</svg>`;

const DRG_TEAL = '#2D5967';

/**
 * Dynamic Routing Gateway (DRG): teal ring with a vertical double-arrow pointing
 * outward and two horizontal arrows pointing inward — the OCI DRG glyph.
 */
export const DRG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
  <circle cx="20" cy="20" r="18" fill="#ffffff" stroke="${DRG_TEAL}" stroke-width="2.8"/>
  <g stroke="${DRG_TEAL}" stroke-width="2.6" fill="${DRG_TEAL}">
    <line x1="20" y1="11.5" x2="20" y2="28.5"/>
    <polygon points="20,6 15.8,12 24.2,12" stroke="none"/>
    <polygon points="20,34 15.8,28 24.2,28" stroke="none"/>
    <line x1="7" y1="20" x2="13" y2="20"/>
    <polygon points="17.4,20 12,16.6 12,23.4" stroke="none"/>
    <line x1="33" y1="20" x2="27" y2="20"/>
    <polygon points="22.6,20 28,16.6 28,23.4" stroke="none"/>
  </g>
</svg>`;

/**
 * Compute/VM endpoint: a server face — rounded outer box, a 2×3 grid of vents,
 * and a status bar with an LED. Drawn at the shared 48×48 footprint so the same
 * width/height swap the other icons use resizes it cleanly.
 */
export const VM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="8" y="6" width="32" height="36" rx="3" fill="#ffffff" stroke="${TEAL}" stroke-width="2.6"/>
  <g fill="none" stroke="${TEAL}" stroke-width="2.2">
    <rect x="13" y="13" width="6" height="6" rx="0.6"/><rect x="21" y="13" width="6" height="6" rx="0.6"/><rect x="29" y="13" width="6" height="6" rx="0.6"/>
    <rect x="13" y="21" width="6" height="6" rx="0.6"/><rect x="21" y="21" width="6" height="6" rx="0.6"/><rect x="29" y="21" width="6" height="6" rx="0.6"/>
    <rect x="13" y="30" width="22" height="6" rx="1.5"/>
  </g>
  <circle cx="31" cy="33" r="1.4" fill="${TEAL}"/>
</svg>`;
