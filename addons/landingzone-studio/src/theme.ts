/**
 * Oracle Redwood / OCI palette — shared design tokens.
 *
 * Approximates Oracle's Redwood brand system and the OCI Console look so the
 * wizard reads as an Oracle product. Used by the form chrome, the React Flow
 * canvas, and the .drawio exporter so screen and export stay on-brand together.
 */

export const oracle = {
  /* Brand */
  red:        '#C74634', // Oracle brand red (Redwood)
  redDark:    '#A23829', // hover / borders
  redTint:    '#FBE9E7', // light red surface (VCN fill)

  /* Neutrals (warm) */
  ink:        '#201F1C', // primary text + dark top bar
  nav:        '#201F1C', // OCI-console-style top bar
  appBg:      '#FBF9F8', // warm off-white page background
  surface:    '#FFFFFF',
  surfaceAlt: '#F4F2F0', // subtle panel / pre background
  border:     '#D9D6D3',
  borderStrong: '#B8B4B0',
  text:       '#201F1C',
  textMuted:  '#65615C',

  /* Security Zone / "on" state (green) */
  green:      '#3a8a4e',
  greenDark:  '#2e6e3f',
  greenFill:  '#e3f3e3',

  /* Diagram accents */
  subnetName: '#AA5C32', // subnet name (warm OCI orange-red)
  cidrBlue:   '#3B5BA9', // CIDR text in network boxes
  tenancyBorder: '#B8B4B0',
  tenancyFill:   '#FFFFFF',
  vcnBorder:     '#C74634',
  vcnFill:       '#FBE9E7',
  envBorder:     '#B8B4B0',
  envFill:       '#FFFFFF',
  edge:          '#C74634',

  /* Compartment fills (diagram) */
  compYellowFill:   '#FCF3CF',
  compYellowBorder: '#C9A227',
  compGreenFill:    '#E3F3E3',
  compGreenBorder:  '#3A8A4E',
  compGrayFill:     '#EEEDEB',
  compGrayBorder:   '#9B9690',
} as const;

/** Dark "night" palette for the JSON viewer (VS Code-ish, on-brand red accents). */
export const night = {
  bg:        '#0d1117',
  bgBar:     '#161b22',
  border:    '#30363d',
  text:      '#e6edf3',
  textMuted: '#8b949e',
  key:       '#9cdcfe', // property names
  string:    '#ce9178', // string values
  number:    '#b5cea8', // numbers
  keyword:   '#569cd6', // true / false / null
  punct:     '#d4d4d4', // braces, commas, colons
  accent:    '#C74634', // Oracle red — active controls
} as const;
