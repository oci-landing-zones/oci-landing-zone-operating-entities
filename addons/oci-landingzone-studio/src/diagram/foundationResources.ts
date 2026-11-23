import type { DiagramNode } from '../model/types';
import type { ResourceKind } from '../services/generatedResources';
import { resourceIconSvg } from './resourceGroups';

export type FoundationResource = NonNullable<DiagramNode['foundationResource']>;

export const FOUNDATION_RESOURCES: Record<FoundationResource, { label: string; description: string; icon?: ResourceKind }> = {
  iam: { label: 'Compartments & IAM', description: 'Compartment and identity collections in the generated IAM JSON', icon: 'identitydomain' },
  governance: { label: 'Tags', description: 'Tag namespaces and definitions in the generated governance JSON', icon: 'requiredtags' },
  budgets: { label: 'Budgets', description: 'Budgets present in the generated governance JSON', icon: 'budgets' },
  cloudguard: { label: 'Cloud Guard', description: 'Cloud Guard configuration in the generated security JSON' },
  networking: { label: 'VCNs & subnets', description: 'VCNs and their network resources in the generated network JSON' },
  securityzones: { label: 'Security Zones', description: 'Security zones and recipes in the generated security JSON', icon: 'securityrecipes' },
  vault: { label: 'Vaults & keys', description: 'Vaults and encryption keys in the generated security JSON', icon: 'vault' },
  scanning: { label: 'Vulnerability Scanning', description: 'Scanning recipes and targets in the generated security JSON', icon: 'scanning' },
  bastion: { label: 'Bastion', description: 'Bastions in the generated security JSON', icon: 'bastion' },
  events: { label: 'Events', description: 'Event rules in the generated observability JSON', icon: 'events' },
  notifications: { label: 'Notifications', description: 'Notification topics in the generated observability JSON', icon: 'notifications' },
  logging: { label: 'Log groups', description: 'Log groups and logs in the generated observability JSON', icon: 'flowlogs' },
  alarms: { label: 'Alarms', description: 'Alarms in the generated observability JSON' },
  serviceconnectors: { label: 'Service Connectors', description: 'Service connectors in the generated observability JSON' },
  buckets: { label: 'Object Storage buckets', description: 'Service connector buckets in the generated observability JSON' },
  oke: { label: 'OKE clusters', description: 'Cluster configurations in the generated OKE JSON' },
};

const CUSTOM_ICONS: Partial<Record<FoundationResource, string>> = {
  // Oracle OCI Architecture Diagram Toolkit v24.2 — Identity and Security / Cloud Guard.
  cloudguard: '<g transform="translate(0.25 3) scale(0.5)" fill="#2A5B66" stroke="none"><g transform="translate(1 1) scale(0.83 0.4)"><path d="M86.96 38.74C84.79 36.04 82.61 33.78 80.22 32.88C77.83 31.98 75.87 28.83 75.01 24.32C71.31 9.46 64.14 0 56.1 0C50.22 0 44.56 4.96 40.66 13.96C39.13 17.57 36.97 19.37 34.57 18.47C31.52 18.02 28.71 18.92 26.09 21.62C21.1 26.13 17.39 35.59 16.31 46.85C15.87 51.35 14.35 55.41 12.39 57.66C5.44 65.32 0.88 79.28 0.23 95.5L0 99.1L21.31 99.1L21.31 92.34L3.7 92.34C4.78 79.73 8.49 69.37 13.92 63.06C16.96 59.91 18.91 54.05 19.57 47.75C20.44 38.74 23.48 31.08 27.4 27.48C29.57 25.68 31.97 24.77 34.14 25.23C37.4 26.13 40.66 23.42 42.83 18.47C46.09 10.81 51.1 6.76 55.88 6.76C62.62 6.76 68.92 14.41 71.75 27.48C73.27 33.78 75.87 37.84 79.13 39.64C81.31 40.54 83.05 42.34 85.01 44.59C92.83 54.95 95.88 75.68 91.74 93.24L76.09 93.24L76.09 100L94.14 100L94.57 98.2C100 77.03 96.52 50.9 86.96 38.74L86.96 38.74"/></g><g transform="translate(21 19) scale(0.41 0.54)"><path d="M0 16.33L0 51.67C1.33 70.67 19.29 88 48.69 99.33L50 100L51.31 99.33C80.68 88 98.23 70.67 100 51.67L100 16L50 0L0 16.33L0 16.33M93.4 51.67C92.09 68 77.64 83 53.07 93.33L53.07 89L53.07 40.67L46.49 40.67L46.49 89L46.49 93.33C21.93 83 7.47 68 6.14 51.67L6.14 19.67L46.49 6.67L46.49 10.67L46.49 34.67L53.07 34.67L53.07 10.67L53.07 6.67L93.4 19.67L93.4 51.67L93.4 51.67"/></g></g>',
  networking: '<circle cx="22" cy="7" r="4"/><circle cx="7" cy="35" r="4"/><circle cx="37" cy="35" r="4"/><circle cx="22" cy="35" r="4"/><path d="M20 11 9 31m15-20 11 20M22 11v20M11 35h7m8 0h7"/>',
  alarms: '<path d="M9 31h26l-4-6V17a9 9 0 0 0-18 0v8ZM18 36a4 4 0 0 0 8 0M22 4v4"/>',
  serviceconnectors: '<rect x="3" y="15" width="10" height="14" rx="2"/><rect x="31" y="15" width="10" height="14" rx="2"/><path d="M13 22h18m-6-6 6 6-6 6"/>',
  buckets: '<ellipse cx="22" cy="9" rx="15" ry="5"/><path d="m7 9 4 26c1 7 21 7 22 0l4-26M11 35c0-6 22-6 22 0"/>',
  oke: '<path d="m22 3 17 10v19L22 42 5 32V13Zm0 10 9 5v10l-9 5-9-5V18ZM5 13l8 5m18 0 8-5M22 33v9"/>',
};
const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The live diagram and draw.io use the same generated-resource glyphs. */
export function foundationResourceSvg(kind: FoundationResource, width: number): string {
  const resource = FOUNDATION_RESOURCES[kind];
  const icon = resource.icon ? resourceIconSvg(resource.icon)
    : `<svg width="36" height="36" viewBox="0 0 44 44"><g fill="none" stroke="#2A5B66" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${CUSTOM_ICONS[kind]}</g></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="84" viewBox="0 0 ${width} 84"><title>${escapeXml(resource.description)}</title><g transform="translate(${(width - 36) / 2} 8)">${icon}</g><text x="${width / 2}" y="66" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="600" fill="#3f4750">${escapeXml(resource.label)}</text></svg>`;
}
