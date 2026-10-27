import data from '../data/connectivity-catalog.json';
import type { CpeConfig, FastConnectConfig } from '../model/hybridConnectivity';

interface ProviderService {
  key: string;
  label: string;
  provider_name: string;
  provider_service_name: string;
  regions: Record<string, string[]>;
  sources: string[];
}

export const connectivityCatalog: {
  verified_on: string;
  cpe_vendors: { name: string; label: string; sources: string[] }[];
  provider_services: ProviderService[];
} = data;

export function providerServicesForRegion(realm: string, region: string): ProviderService[] {
  return connectivityCatalog.provider_services.filter((service) => service.regions[realm]?.includes(region));
}

export function knownProviderService(circuit: FastConnectConfig): ProviderService | undefined {
  return connectivityCatalog.provider_services.find((service) =>
    service.provider_name === circuit.provider_service?.provider_name
    && service.provider_service_name === circuit.provider_service.provider_service_name);
}

export function selectProviderService(circuit: FastConnectConfig, choice: string, realm: string, region: string): FastConnectConfig {
  const service = providerServicesForRegion(realm, region).find((service) => service.key === choice);
  if (choice !== '' && choice !== 'ocid' && !service) return circuit;
  const next = { ...circuit };
  delete next.provider_service;
  delete next.provider_service_id;
  if (choice === 'ocid') next.provider_service_id = circuit.provider_service_id ?? '';
  if (service) next.provider_service = { provider_name: service.provider_name, provider_service_name: service.provider_service_name };
  return next;
}

export function selectCpeDevice(cpe: CpeConfig, choice: string): CpeConfig {
  if (choice !== 'ocid' && !connectivityCatalog.cpe_vendors.some((vendor) => vendor.name === choice)) return cpe;
  const next = { ...cpe };
  delete next.cpe_device_shape_vendor_name;
  delete next.cpe_device_shape_id;
  if (choice === 'ocid') next.cpe_device_shape_id = cpe.cpe_device_shape_id ?? '';
  else if (choice !== 'Other') next.cpe_device_shape_vendor_name = choice;
  return next;
}

export function providerSelectionError(circuit: FastConnectConfig, realm: string, region: string): string | undefined {
  if (circuit.provider_service && circuit.provider_service_id !== undefined) return 'Choose a named provider service or an OCID, rather than both.';
  const known = knownProviderService(circuit);
  if (circuit.provider_service && !known) return 'This saved service is not in the maintained list. Choose a known service or enter its provider service OCID for this location.';
  if (known && !known.regions[realm]?.includes(region)) return `This service is not in the maintained list for ${realm} / ${region}. Choose another service or enter an OCID verified for this location.`;
  if (circuit.provider_service_id) {
    const parts = circuit.provider_service_id.split('.');
    if (parts[0] !== 'ocid1' || parts[1] !== 'providerservice') return 'Enter a provider service OCID, rather than a circuit or physical connection OCID.';
    if (parts[2] !== realm || (parts[3] && parts[3] !== region)) return `Use a provider service OCID from ${realm} / ${region}. The saved OCID belongs to another location.`;
  }
}

export function cpeDeviceError(cpe: CpeConfig, realm: string): string | undefined {
  if (cpe.cpe_device_shape_id !== undefined && cpe.cpe_device_shape_vendor_name !== undefined) return 'Choose a device vendor or a device shape identifier, rather than both.';
  if (cpe.cpe_device_shape_vendor_name !== undefined && !connectivityCatalog.cpe_vendors.some((vendor) => vendor.name === cpe.cpe_device_shape_vendor_name)) return 'This vendor is not in the maintained list. Enter its device shape identifier or choose Other / generic.';
  if (cpe.cpe_device_shape_id !== undefined) {
    if (!cpe.cpe_device_shape_id.trim()) return 'Enter a device shape identifier, or choose Other / generic.';
    if (cpe.cpe_device_shape_id.startsWith('ocid1.') && cpe.cpe_device_shape_id.split('.')[1] !== 'cpedeviceshape') return 'Enter a device shape identifier, rather than a CPE or another resource OCID.';
    if (cpe.cpe_device_shape_id.startsWith('ocid1.') && cpe.cpe_device_shape_id.split('.')[2] !== realm) return `Use a device shape identifier verified for ${realm}.`;
  }
}
