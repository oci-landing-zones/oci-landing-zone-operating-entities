// Fixed positions preserve numeric order independently of graph-layout engines.
// Run from the repository root: node design/diagrams/generate_oci_architecture.js
const fs = require('fs');
const path = require('path');
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const parts = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1500" viewBox="0 0 1600 1500" role="img" aria-labelledby="title desc">',
  '<title id="title">FinOps platform: shared foundation, OCI provider and OAC</title>',
  '<desc id="desc">FinOps V2 architecture. Shared schema and Common Core support all database modules. OCI includes the mandatory ingestion, tag catalog/profile and account context baseline, plus optional tag values, Budgets, Cloud Advisor, Anomalies and Forecast. The OAC database reporting module publishes costs and selected tags. The separate OAC service consumes that reporting interface and OCI module datasets. All arrows use the same style and show V2 data consumption, not installation order.</desc>',
  '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#52617a"/></marker></defs>',
  '<rect width="1600" height="1500" fill="white"/>',
  '<g font-family="Arial, sans-serif" fill="#202b42">',
];
function text(x, y, value, size = 19) {
  parts.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}">${escape(value)}</text>`);
}
function group(x, y, width, height, title, fill, stroke) {
  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${fill}" stroke="${stroke}"/>`);
  text(x + width / 2, y + 28, title, 21);
}
function edge(d, arrow = true) {
  parts.push(`<path d="${d}" fill="none" stroke="#52617a" stroke-width="1.8"${arrow ? ' marker-end="url(#arrow)"' : ''}/>`);
}
function label(x, y, value) {
  const width = value.length * 7.5 + 14;
  parts.push(`<rect x="${x - width / 2}" y="${y - 15}" width="${width}" height="21" rx="4" fill="white"/>`);
  text(x, y, value, 14);
}
function node(id, x, y, width, height, lines, green = false) {
  parts.push(`<g id="${id}" data-x="${x}" data-y="${y}">`);
  parts.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${green ? '#e9f6ef' : '#f0edff'}" stroke="${green ? '#6f9f88' : '#9478e8'}" stroke-width="1.5"/>`);
  const first = y + height / 2 - (lines.length - 1) * 12 + 6;
  lines.forEach((line, i) => text(x + width / 2, first + i * 24, line, 18));
  parts.push('</g>');
}
group(20, 20, 1560, 1040, 'Oracle Autonomous Database (ADB)', '#ffffff', '#a4b5cb');
group(60, 70, 1480, 165, 'Shared foundation - required by all database modules', '#f0f6fc', '#93b1cf');
node('SCHEMA', 100, 125, 420, 80, ['00 Schema and access', 'FOCUSPLATFORM and OAC reader']);
node('CORE', 590, 125, 910, 80, ['01 Common Core - provider-neutral', 'Provider registry | Daily reconciliation | Execution audit', 'Shared schedule time zone | Optional operational notifications']);
text(800, 265, 'OCI provider and OAC database modules use the shared schema and core shown above.', 17);
group(60, 290, 1480, 515, 'OCI provider', '#ffffff', '#b6c2d6');
group(80, 345, 1440, 165, 'Mandatory OCI functional baseline', '#faf8ff', '#b8a8eb');
group(80, 590, 1440, 180, 'Optional OCI extensions', '#f7faff', '#bdcddd');
group(100, 880, 1400, 150, 'OAC database reporting module', '#f6fcf9', '#9bc7b7');
group(300, 1130, 1000, 260, 'Oracle Analytics Cloud (OAC) service - outside ADB', '#f6fcf9', '#9bc7b7');

// Solid arrows show data consumption; foundation prerequisites apply to all modules.
edge('M310 475 V530 H205 V650');
edge('M800 475 V555 H255 V650');
edge('M100 437 H45 V860 H465 V965 H520');
edge('M590 437 H565 V575 H372 V840 H1135 V965 H1080');
edge('M800 1000 V1085 H235 V1210 H350');
// All OCI module datasets share one collection line and one visual style.
// The gap at x372 is a crossing with the selected-profile path, not a join.
edge('M230 735 V810 H366 M378 810 H1525', false);
edge('M515 735 V810', false);
edge('M800 735 V810', false);
edge('M1085 735 V810', false);
edge('M1370 735 V810', false);
edge('M1500 437 H1525 V1335 H1250');
[515, 800, 1085, 1370, 1525].forEach(x => parts.push("<circle cx='" + x + "' cy='810' r='3' fill='#52617a'/>"));

label(310, 526, 'FOCUS rows');
label(655, 551, 'Tag catalog');
label(450, 856, 'FOCUS rows');
label(710, 836, 'Selected profile');
label(500, 1081, 'Cost-detail interface');
label(1435, 1105, 'OCI module data');

node('ING', 100, 400, 420, 75, ['00 FOCUS ingestion', 'Landing and remediation']);
node('TAG', 590, 400, 420, 75, ['01a FinOps tag catalog', 'and reporting profile']);
node('ACCOUNT', 1080, 400, 420, 75, ['02 Tenancy/account context', 'and contracts']);
const optional = [
  ['VALUES', ['01b All defined-tag values', 'Separate historical table']],
  ['BUDGET', ['03 Budgets']],
  ['ADVISOR', ['04 Cloud Advisor']],
  ['ANOMALY', ['05 Cost Anomalies']],
  ['FORECAST', ['06 Native Forecast']],
];
// Distribute all optional modules evenly across the available row.
const optionalLeft = 100;
const optionalRight = 1500;
const optionalWidth = 260;
const optionalGap = (optionalRight - optionalLeft - optional.length * optionalWidth) / (optional.length - 1);
optional.forEach(([id, lines], i) => node(id, optionalLeft + i * (optionalWidth + optionalGap), 650, optionalWidth, 85, lines));
node('COST', 520, 930, 560, 70, ['Cost detail with selected tag values'], true);
node('OAC_COST', 350, 1180, 900, 60, ['Cost and selected-tag datasets', 'Reporting interface'], true);
node('OAC_MODULES', 350, 1290, 900, 60, ['OCI module datasets', 'Account context | Budgets | Advisor | Anomalies | Forecast | Tag values'], true);
text(800, 1430, 'Workbook V2: costs, selected tags and datasets from every installed OCI module.', 18);
text(800, 1460, 'Arrows show data consumption, not installation order.', 17);
parts.push('</g></svg>');
fs.writeFileSync(path.join(__dirname, '02-oci-provider.svg'), parts.join('\n') + '\n');
