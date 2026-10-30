import { fastConnectProviderServices } from '../data/fastConnectProviderServices';
import type { FastConnectConfig } from '../model/hybridConnectivity';

export function providerServicesForRegion(realm: string, region: string) {
  return fastConnectProviderServices[realm]?.[region] ?? [];
}

export function selectProviderService(circuit: FastConnectConfig, choice: string, realm: string, region: string): FastConnectConfig {
  const service = providerServicesForRegion(realm, region).find((service) => service.ocid === choice);
  if (choice !== '' && choice !== 'ocid' && !service) return circuit;
  const next = { ...circuit };
  if ('provider_service' in next) delete next.provider_service;
  delete next.provider_service_id;
  if (choice === 'ocid') next.provider_service_id = circuit.provider_service_id ?? '';
  if (service) next.provider_service_id = service.ocid;
  return next;
}

export function providerSelectionError(circuit: FastConnectConfig, realm: string, region: string): string | undefined {
  if ('provider_service' in circuit) return 'Select a provider service or enter its OCID. Provider names are no longer supported.';
  if (circuit.provider_service_id) {
    const parts = circuit.provider_service_id.split('.');
    if (parts[0] !== 'ocid1' || parts[1] !== 'providerservice') return 'Enter a provider service OCID, rather than a circuit or physical connection OCID.';
    if (parts[2] !== realm || (parts[3] && parts[3] !== region)) return `Use a provider service OCID from ${realm} / ${region}. The saved OCID belongs to another location.`;
  }
}
