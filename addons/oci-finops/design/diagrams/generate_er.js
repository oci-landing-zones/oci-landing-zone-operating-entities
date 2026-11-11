// Generate portable ER diagrams for Markdown viewers that do not render Mermaid.
// Run from the add-on directory (addons/oci-finops/): node design/diagrams/generate_er.js
const fs = require('fs');
const path = require('path');

const diagrams = {
  '01-common-core': {
    width: 1600, height: 1010,
    nodes: [
      ['provider', 'FINOPS_CORE_PROVIDER', 60, 130, ['PK  PROVIDER_CODE', 'UQ  LANDING_TABLE', 'UQ  API_PACKAGE']],
      ['run', 'FINOPS_CORE_RUN', 1120, 130, ['PK  RUN_ID', 'STATUS']],
      ['providerRun', 'FINOPS_CORE_PROVIDER_RUN', 590, 430, ['PK/FK  RUN_ID', 'PK/FK  PROVIDER_CODE', 'STATUS']],
      ['pipelineRun', 'FINOPS_CORE_PIPELINE_RUN', 590, 720, ['PK/FK  RUN_ID', 'PK/FK  PROVIDER_CODE', 'PK  PIPELINE_NAME']],
      ['notify', 'FINOPS_CORE_NOTIFY_CONFIG', 1120, 720, ['PK  CONFIG_ID', 'TOPIC_OCID']],
    ],
    edges: [
      ['provider', 'providerRun', 'FK', 'bottom', 'left', '1', '0..*'],
      ['run', 'providerRun', 'FK', 'bottom', 'right', '1', '0..*'],
      ['providerRun', 'pipelineRun', 'FK', 'bottom', 'top', '1', '0..*'],
    ],
  },
  '02-oci-ingestion': {
    width: 1900, height: 1250,
    nodes: [
      ['cursor', 'OCI_FOCUS_FAIL_SCAN_CURSOR', 40, 130, ['PK  PIPELINE_NAME', 'GENERATION_NO', 'LAST_CUTOFF']],
      ['fail', 'OCI_FOCUS_FAIL_FILE', 650, 130, ['PK  PIPELINE_NAME', 'PK  GENERATION_NO', 'PK  SOURCE_NAME_HASH']],
      ['manual', 'OCI_FOCUS_REMED_MANUAL', 1260, 130, ['PK  MANUAL_ID', 'FILE IDENTITY', 'RESOLUTION_STATUS']],
      ['scanRun', 'OCI_FOCUS_FAIL_SCAN_RUN', 40, 405, ['PK  RUN_ID', 'PIPELINE_NAME', 'GENERATION_NO']],
      ['remed', 'OCI_FOCUS_REMED_FILE', 650, 405, ['PK/FK  PIPELINE_NAME', 'PK/FK  GENERATION_NO', 'PK/FK  SOURCE_NAME_HASH']],
      ['recovery', 'OCI_FOCUS_COPY_RECOVERY', 1260, 405, ['PK  RECOVERY_ID', 'FILE IDENTITY', 'DECISION']],
      ['stage', 'OCI_FOCUS_REMED_STAGE', 40, 680, ['49 RAW CSV COLUMNS', 'SHARED SINGLE-FILE STAGE']],
      ['remedRun', 'OCI_FOCUS_REMED_RUN', 650, 680, ['PK  RUN_ID', 'PIPELINE_NAME', 'FILES_FULL / PARTIAL / ERROR']],
      ['landing', 'OCI_FOCUS_REPORTS', 1260, 680, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', '49 TYPED CSV COLUMNS']],
      ['target', 'OCI_FOCUS_REMED_TARGET_CONFIG', 40, 955, ['PK  TARGET_TABLE', 'ENABLED']],
    ],
    edges: [['fail', 'remed', 'FK', 'bottom', 'top', '1', '0..1']],
  },
  '02-oci-tags': {
    width: 1600, height: 1100,
    nodes: [
      ['namespace', 'OCI_TAG_NAMESPACE', 60, 130, ['PK  TAG_NAMESPACE_ID', 'NAMESPACE_NAME']],
      ['definition', 'OCI_TAG_DEFINITION', 1120, 130, ['PK/FK  TAG_NAMESPACE_ID', 'PK  TAG_NAME']],
      ['profile', 'OCI_TAG_PROFILE', 60, 445, ['PK  PROFILE_NAME', 'PK  PROFILE_VERSION', 'FK  TAG_NAMESPACE_ID']],
      ['item', 'OCI_TAG_PROFILE_ITEM', 1120, 445, ['PK/FK  PROFILE_NAME', 'PK/FK  PROFILE_VERSION', 'FK  TAG_NAMESPACE_ID', 'PK/FK  TAG_NAME']],
      ['selection', 'OCI_TAG_PROFILE_SELECTION', 60, 765, ['PK  SELECTION_ID', 'FK  PROFILE_NAME', 'FK  PROFILE_VERSION']],
    ],
    edges: [
      ['namespace', 'definition', 'FK', 'right', 'left', '1', '0..*'],
      ['namespace', 'profile', 'FK', 'bottom', 'top', '1', '0..*'],
      ['profile', 'item', 'FK', 'right', 'left', '1', '0..*'],
      ['definition', 'item', 'FK', 'bottom', 'top', '1', '0..*'],
      ['profile', 'selection', 'FK', 'bottom', 'top', '1', '0..1'],
    ],
  },
  '02-oci-tag-values': {
    width: 1900, height: 1130,
    nodes: [
      ['landing', 'OCI_FOCUS_REPORTS', 40, 130, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', 'TAGS JSON']],
      ['processing', 'OCI_TAG_VALUE_PROCESSING', 650, 130, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', 'PROCESSED_AT']],
      ['value', 'OCI_TAG_VALUE', 1260, 130, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', 'PK  TAG_NAMESPACE_NAME', 'PK  TAG_NAME']],
      ['namespace', 'OCI_TAG_NAMESPACE', 40, 450, ['PK  TAG_NAMESPACE_ID', 'NAMESPACE_NAME']],
      ['definition', 'OCI_TAG_DEFINITION', 650, 450, ['PK/FK  TAG_NAMESPACE_ID', 'PK  TAG_NAME']],
      ['config', 'OCI_TAG_VALUE_CONFIG', 40, 765, ['PK  CONFIG_ID', 'NEXT_DAY', 'MAX_ROWS_PER_RUN']],
      ['run', 'OCI_TAG_VALUE_RUN', 650, 765, ['PK  RUN_ID', 'STATUS', 'ROWS_PROCESSED']],
      ['work', 'OCI_TAG_VALUE_WORK_KEYS', 1260, 765, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', 'TEMPORARY TABLE']],
    ],
    edges: [
      ['landing', 'processing', 'logical', 'right', 'left', '1', '0..1'],
      ['landing', 'value', 'logical', 'top', 'top', '1', '0..*'],
      ['namespace', 'definition', 'FK', 'right', 'left', '1', '0..*'],
      ['definition', 'value', 'logical', 'right', 'bottom', '0..*', '0..*'],
      ['config', 'run', 'logical', 'right', 'left', '1', '0..*'],
    ],
  },
  '02-oci-account-contracts': {
    width: 2100, height: 1190, boxWidth: 500,
    nodes: [
      ['source', 'OCI_ACCOUNT_SOURCE', 50, 130, ['PK  CONFIG_ID', 'TENANCY_OCID', 'HOME_REGION']],
      ['contextRun', 'OCI_ACCOUNT_CONTEXT_RUN', 760, 130, ['PK  RUN_ID', 'STATUS']],
      ['entity', 'OCI_ACCOUNT_ENTITY', 1470, 130, ['PK  VERSION_ID', 'FK  LAST_SEEN_RUN_ID', 'ENTITY_TYPE + ENTITY_ID']],
      ['contractCfg', 'OCI_ACCOUNT_CONTRACT_CONFIG', 50, 470, ['PK  SUBSCRIPTION_ID', 'TENANCY_OCID', 'ENDPOINT_REGION']],
      ['contractRun', 'OCI_ACCOUNT_CONTRACT_RUN', 760, 470, ['PK  SYNC_RUN_ID', 'FK  SUBSCRIPTION_ID', 'STATUS']],
      ['subscription', 'OCI_ACCOUNT_CONTRACT_SUBSCRIPTION_SNAP', 1470, 470, ['PK/FK  SYNC_RUN_ID', 'SUBSCRIPTION_ID', 'IS_CURRENT']],
      ['service', 'OCI_ACCOUNT_CONTRACT_SERVICE_SNAP', 760, 830, ['PK/FK  SYNC_RUN_ID', 'PK  SERVICE_ID', 'IS_CURRENT']],
      ['commitment', 'OCI_ACCOUNT_CONTRACT_COMMITMENT_SNAP', 1470, 830, ['PK/FK  SYNC_RUN_ID', 'PK  COMMITMENT_ID', 'SERVICE_ID']],
    ],
    edges: [
      ['source', 'contractCfg', 'logical', 'bottom', 'top', '1', '0..*'],
      ['contextRun', 'entity', 'FK', 'right', 'left', '1', '0..*'],
      ['contractCfg', 'contractRun', 'FK', 'right', 'left', '1', '0..*'],
      ['contractRun', 'subscription', 'FK', 'right', 'left', '1', '0..1'],
      ['contractRun', 'service', 'FK', 'bottom', 'top', '1', '0..*'],
      ['contractRun', 'commitment', 'FK', 'bottomRight', 'left', '1', '0..*'],
    ],
  },
  '02-oci-budgets': {
    width: 2100, height: 1070, boxWidth: 620,
    nodes: [
      ['config', 'OCI_BUDGET_CONFIG', 50, 130, ['PK  CONFIG_ID', 'TENANCY_OCID / HOME_REGION', 'IS_SYNC_ENABLED']],
      ['run', 'OCI_BUDGET_SYNC_RUN', 760, 130, ['PK  SYNC_RUN_ID', 'STATUS', 'BUDGETS_READ / ALERT_RULES_READ']],
      ['budget', 'OCI_BUDGET_SNAP', 1470, 130, ['PK/FK  SYNC_RUN_ID', 'PK  BUDGET_ID', 'TARGET_TYPE / TARGETS_JSON']],
      ['alert', 'OCI_BUDGET_ALERT_RULE_SNAP', 760, 570, ['PK/FK  SYNC_RUN_ID + BUDGET_ID', 'PK  ALERT_RULE_ID', 'TYPE / THRESHOLD / RECIPIENTS']],
      ['landing', 'OCI_FOCUS_REPORTS', 1470, 570, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', 'BILLEDCOST / BILLINGCURRENCY']],
    ],
    edges: [
      ['config', 'run', 'logical', 'right', 'left', '1', '0..*'],
      ['run', 'budget', 'FK', 'right', 'left', '1', '0..*'],
      ['budget', 'alert', 'FK', 'bottom', 'right', '1', '0..*'],
      ['landing', 'budget', 'logical', 'top', 'bottom', '0..*', '0..*'],
    ],
  },
  '02-oci-cloud-advisor': {
    width: 2180, height: 1120, boxWidth: 610,
    nodes: [
      ['config', 'OCI_ADVISOR_CONFIG', 50, 130, ['PK  CONFIG_ID', 'UQ  TENANCY_OCID + ENDPOINT_REGION']],
      ['run', 'OCI_ADVISOR_SYNC_RUN', 785, 130, ['PK  SYNC_RUN_ID', 'STATUS', 'RECOMMENDATIONS_READ / ACTIONS_READ']],
      ['recommendation', 'OCI_ADVISOR_RECOMMENDATION', 1520, 130, ['PK  RECOMMENDATION_ID', 'FK  LAST_SEEN_RUN_ID']],
      ['action', 'OCI_ADVISOR_RESOURCE_ACTION', 50, 550, ['PK  RESOURCE_ACTION_ID', 'FK  LAST_SEEN_RUN_ID', 'RECOMMENDATION_ID (logical)']],
      ['recommendationSnap', 'OCI_ADVISOR_RECOMMENDATION_SNAP', 785, 550, ['PK/FK  SYNC_RUN_ID', 'PK  RECOMMENDATION_ID']],
      ['actionSnap', 'OCI_ADVISOR_RESOURCE_ACTION_SNAP', 1520, 550, ['PK/FK  SYNC_RUN_ID', 'PK  RESOURCE_ACTION_ID', 'RECOMMENDATION_ID (logical)']],
    ],
    edges: [
      ['config', 'run', 'logical', 'right', 'left', '1', '0..*'],
      ['run', 'recommendation', 'FK', 'right', 'left', '1', '0..*'],
      ['run', 'action', 'FK', 'bottom', 'top', '1', '0..*'],
      ['run', 'recommendationSnap', 'FK', 'bottom', 'top', '1', '0..*'],
      ['run', 'actionSnap', 'FK', 'bottomRight', 'top', '1', '0..*'],
      ['recommendation', 'action', 'logical', 'bottom', 'right', '0..1', '0..*'],
    ],
  },
  '02-oci-cost-anomalies': {
    width: 1740, height: 960, boxWidth: 700,
    nodes: [
      ['config', 'OCI_ANOMALY_CONFIG', 50, 130, ['PK  CONFIG_ID', 'TENANCY_OCID', 'LOOKBACK_DAYS']],
      ['run', 'OCI_ANOMALY_SYNC_RUN', 990, 130, ['PK  SYNC_RUN_ID', 'STATUS', 'WINDOW_START / WINDOW_END']],
      ['monitor', 'OCI_ANOMALY_MONITOR_SNAP', 50, 540, ['PK/FK  SYNC_RUN_ID', 'PK  MONITOR_ID']],
      ['event', 'OCI_ANOMALY_EVENT_SNAP', 990, 540, ['PK/FK  SYNC_RUN_ID', 'PK  EVENT_ID', 'MONITOR_ID (logical)']],
    ],
    edges: [
      ['config', 'run', 'logical', 'right', 'left', '1', '0..*'],
      ['run', 'monitor', 'FK', 'bottom', 'top', '1', '0..*'],
      ['run', 'event', 'FK', 'bottom', 'top', '1', '0..*'],
      ['monitor', 'event', 'logical', 'right', 'left', '0..1', '0..*'],
    ],
  },
  '02-oci-forecast': {
    width: 1740, height: 960, boxWidth: 700,
    nodes: [
      ['config', 'OCI_FORECAST_CONFIG', 50, 130, ['PK  CONFIG_ID', 'HISTORY_DAYS', 'HORIZON_DAYS']],
      ['run', 'OCI_FORECAST_RUN', 990, 130, ['PK  SYNC_RUN_ID', 'AS_OF_DAY', 'STATUS']],
      ['request', 'OCI_FORECAST_REQUEST', 50, 540, ['PK/FK  SYNC_RUN_ID', 'PK  QUERY_LEVEL / REQUEST_KIND', 'PK  CHUNK_NO']],
      ['point', 'OCI_FORECAST_POINT', 990, 540, ['PK  POINT_ID', 'FK  SYNC_RUN_ID', 'UQ  POINT GRAIN']],
    ],
    edges: [
      ['config', 'run', 'logical', 'right', 'left', '1', '0..*'],
      ['run', 'request', 'FK', 'bottom', 'top', '1', '0..*'],
      ['run', 'point', 'FK', 'bottom', 'top', '1', '0..*'],
      ['request', 'point', 'logical', 'right', 'left', '0..1', '0..*'],
    ],
  },
  '03-oac-cost-detail': {
    width: 1740, height: 1570, boxWidth: 700,
    nodes: [
      ['capabilities', 'MV_CAPABILITIES_TABLE', 50, 130, ['STATEMENT_ID', 'CAPABILITY_NAME', 'POSSIBLE']],
      ['run', 'OAC_OCI_FOCUS_COST_DETAIL_RUN', 990, 130, ['PK  RUN_ID', 'RUN_KIND / STATUS', 'MV_NAME / PROFILE_VERSION']],
      ['profileItem', 'OCI_TAG_PROFILE_ITEM', 50, 475, ['PK  PROFILE NAME + VERSION', 'PK  NAMESPACE ID + TAG NAME', 'UQ  DISPLAY_ORDER = SLOT n']],
      ['tagColumn', 'OAC_OCI_FOCUS_COST_DETAIL_TAG_COLUMN', 990, 475, ['PK/FK  RUN_ID', 'PK  DISPLAY_ORDER = SLOT n', 'MV_COLUMN_NAME = TAG_n', 'NAMESPACE ID + TAG NAME']],
      ['landing', 'OCI_FOCUS_REPORTS', 50, 830, ['PK  CHARGEPERIODSTART', 'PK  OCI_REFERENCENUMBER', 'TAGS JSON SOURCE']],
      ['mv', 'OAC_OCI_FOCUS_COST_DETAIL_MV_V<n>', 990, 830, ['DERIVED MATERIALIZED VIEW', '48 FOCUS FIELDS + TAG_1..TAG_N', 'TAGS JSON KEY = namespace.tag']],
      ['synonym', 'OAC_OCI_FOCUS_COST_DETAIL', 50, 1190, ['SYNONYM TO PUBLISHED MV', 'STABLE OAC DATASET NAME']],
      ['slotView', 'OAC_OCI_FOCUS_TAG_SLOT_V', 990, 1190, ['DERIVED VIEW OF PUBLISHED SLOTS', 'SLOT_NUMBER -> TAG_n', 'NAMESPACE + TAG + DISPLAY_LABEL']],
    ],
    edges: [
      ['run', 'tagColumn', 'FK', 'bottom', 'top', '1', '0..*'],
      ['capabilities', 'run', 'logical', 'right', 'left', '0..*', '0..*'],
      ['profileItem', 'tagColumn', 'logical', 'right', 'left', '0..1', '0..*'],
      ['landing', 'mv', 'logical', 'right', 'left', '1', '0..*'],
      ['tagColumn', 'mv', 'logical', 'bottom', 'top', '0..*', '1'],
      ['mv', 'synonym', 'logical', 'bottom', 'right', '1', '0..1'],
      ['synonym', 'slotView', 'logical', 'right', 'left', '1', '0..*'],
      ['tagColumn', 'slotView', 'logical', 'bottomRight', 'top', '0..*', '0..*'],
    ],
  },
};

const flows = {
  '02-oci-tag-values-flow': [
    ['OCI_TAG_VALUE_HOURLY', 'Start bounded catch-up and obtain the module lock'],
    ['OCI_FOCUS_REPORTS', 'Select unprocessed charge keys for a charge day'],
    ['OCI_TAG_VALUE_WORK_KEYS', 'Hold at most 500 keys in the session batch'],
    ['OCI_TAG_VALUE', 'Insert nonblank cataloged defined-tag values'],
    ['OCI_TAG_VALUE_PROCESSING', 'Mark every examined charge, including zero-value rows'],
    ['OCI_TAG_VALUE_RUN / OCI_TAG_VALUE_CONFIG', 'Commit the batch and advance the cursor only when safe'],
  ],
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}

for (const [name, diagram] of Object.entries(diagrams)) {
  const boxWidth = diagram.boxWidth || 420;
  const boxHeight = node => 60 + node[4].length * 29;
  const byId = Object.fromEntries(diagram.nodes.map(node => [node[0], node]));
  if (Object.keys(byId).length !== diagram.nodes.length) {
    throw new Error(`${name}: an entity appears more than once`);
  }
  for (const node of diagram.nodes) {
    const [, title, x, y, attributes] = node;
    if (x < 0 || y < 100 || x + boxWidth > diagram.width || y + boxHeight(node) > diagram.height ||
        title.length > Math.floor((boxWidth-30)/11) ||
        attributes.some(attribute => attribute.length > Math.floor((boxWidth-30)/10))) {
      throw new Error(`${name}: entity box does not fit: ${title}`);
    }
  }
  for (const [from, to] of diagram.edges) {
    if (!byId[from] || !byId[to]) throw new Error(`${name}: relationship references a missing entity`);
  }
  const port = (node, side) => {
    const [, , x, y] = node;
    const h = boxHeight(node);
    return {
      top: [x + boxWidth / 2, y], bottom: [x + boxWidth / 2, y + h],
      bottomRight: [x + boxWidth * 0.8, y + h],
      left: [x, y + h / 2], right: [x + boxWidth, y + h / 2],
    }[side];
  };
  const cardinality = (point, side, label) => {
    const [x, y] = point;
    const offset = {top: [10, -12], bottom: [10, 20],
      bottomRight: [10, 20], left: [-42, -10], right: [8, -10]}[side];
    return `<text class="cardinality" x="${x + offset[0]}" y="${y + offset[1]}">${escapeXml(label)}</text>`;
  };
  const chunks = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diagram.width}" height="${diagram.height}" viewBox="0 0 ${diagram.width} ${diagram.height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(name)} entity relationships</title>`,
    `<desc id="desc">${name === '03-oac-cost-detail' ? 'Entity relationship diagram with tables and derived reporting objects.' : 'Entity relationship diagram: every table appears once with primary and foreign key columns.'} Solid links are declared foreign keys; dashed links are logical associations.</desc>`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    '<style>text{font-family:Arial,Helvetica,sans-serif;fill:#17283a}.title{font-size:27px;font-weight:700}.entity{font-family:Consolas,Menlo,monospace;font-size:19px;font-weight:700}.attribute{font-family:Consolas,Menlo,monospace;font-size:17px}.legend{font-size:17px;fill:#40566e}.cardinality{font-size:18px;font-weight:700;fill:#203e57}.card{fill:#f0f6fc;stroke:#476987;stroke-width:2}.header{fill:#dcebf8}.fk{stroke:#276749;stroke-width:3;fill:none}.logical{stroke:#97621d;stroke-width:3;stroke-dasharray:9 6;fill:none}</style>',
    `<text class="title" x="40" y="48">${escapeXml(name.replace(/^[0-9]+-/, '').replace(/-/g, ' '))} — ${name === '02-oci-ingestion' ? 'physical ERD' : 'ERD'}</text>`,
    '<text class="legend" x="40" y="82">PK = primary key · FK = declared foreign key · UQ = unique key · solid green = FK · dashed amber = logical link</text>',
  ];
  diagram.edges.forEach(([from, to, kind, fromSide, toSide, fromCard, toCard]) => {
    const source = port(byId[from], fromSide);
    const target = port(byId[to], toSide);
    const [x1, y1] = source, [x2, y2] = target;
    let d = `M ${x1} ${y1} L ${x2} ${y2}`;
    if (fromSide === 'top' && toSide === 'top') {
      d = `M ${x1} ${y1} L ${x1} 105 L ${x2} 105 L ${x2} ${y2}`;
    }
    chunks.push(`<path class="${kind.toLowerCase()}" d="${d}"/>`);
    chunks.push(cardinality(source, fromSide, fromCard));
    chunks.push(cardinality(target, toSide, toCard));
  });
  diagram.nodes.forEach(node => {
    const [, title, x, y, attributes] = node;
    const h = boxHeight(node);
    chunks.push(`<rect class="card" x="${x}" y="${y}" width="${boxWidth}" height="${h}" rx="8"/>`);
    chunks.push(`<path class="header" d="M ${x+2} ${y+48} L ${x+boxWidth-2} ${y+48} L ${x+boxWidth-2} ${y+3} L ${x+3} ${y+3} Z"/>`);
    chunks.push(`<line x1="${x}" y1="${y+50}" x2="${x+boxWidth}" y2="${y+50}" stroke="#476987" stroke-width="2"/>`);
    chunks.push(`<text class="entity" x="${x+17}" y="${y+33}">${escapeXml(title)}</text>`);
    attributes.forEach((attribute, index) => {
      chunks.push(`<text class="attribute" x="${x+18}" y="${y+78+index*29}">${escapeXml(attribute)}</text>`);
    });
  });
  chunks.push('</svg>');
  fs.writeFileSync(path.join(__dirname, `${name}.svg`), chunks.join('\n') + '\n');
}

for (const [name, steps] of Object.entries(flows)) {
  const width = 1240;
  const height = 90 + steps.length * 118;
  const chunks = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${escapeXml(name)} workflow</title>`,
    '<desc id="desc">Top-to-bottom workflow. Detailed success, failure and recovery decisions are described in the accompanying text.</desc>',
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    '<style>text{font-family:Arial,Helvetica,sans-serif;fill:#17283a}.title{font-size:22px;font-weight:700}.name{font-family:Consolas,Menlo,monospace;font-size:18px;font-weight:700}.detail{font-size:16px;fill:#40566e}.box{fill:#f0f6fc;stroke:#476987;stroke-width:2}.line{stroke:#476987;stroke-width:3}</style>',
    `<text class="title" x="45" y="43">${escapeXml(name.replace(/^[0-9]+-/, '').replace(/-/g, ' '))}</text>`,
  ];
  steps.forEach(([object,detail],index) => {
    const y = 70 + index * 118;
    chunks.push(`<rect class="box" x="120" y="${y}" width="1000" height="82" rx="8"/>`);
    chunks.push(`<text class="name" x="145" y="${y+31}">${escapeXml(index+1)}. ${escapeXml(object)}</text>`);
    chunks.push(`<text class="detail" x="145" y="${y+60}">${escapeXml(detail)}</text>`);
    if (index < steps.length-1) {
      chunks.push(`<line class="line" x1="620" y1="${y+82}" x2="620" y2="${y+116}"/>`);
      chunks.push(`<path d="M 612 ${y+106} L 620 ${y+116} L 628 ${y+106}" fill="none" class="line"/>`);
    }
  });
  chunks.push('</svg>');
  fs.writeFileSync(path.join(__dirname, `${name}.svg`), chunks.join('\n') + '\n');
}
