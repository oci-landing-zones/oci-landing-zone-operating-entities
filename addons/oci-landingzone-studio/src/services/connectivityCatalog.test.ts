import { expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import type { FastConnectConfig } from '../model/hybridConnectivity';
import { buildConfig } from './lzConfig';
import { emptyHybridConnectivity, validateHybridConnectivity } from './hybridConnectivity';
import { connectivityCatalog, cpeDeviceError, providerSelectionError, providerServicesForRegion, selectCpeDevice, selectProviderService } from './connectivityCatalog';
import { findRegion } from './regions';
import { fastConnectProviderServices } from '../data/fastConnectProviderServices';

it('keeps catalogue facts sourced and scopes any verified provider OCIDs', () => {
  expect(connectivityCatalog.verified_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  for (const entry of connectivityCatalog.cpe_vendors) {
    expect(entry.sources.length).toBeGreaterThan(0);
    for (const url of entry.sources) expect(new URL(url).protocol).toBe('https:');
  }
});

it('offers only verified provider OCIDs for the exact realm and region', () => {
  for (const region of ['eu-frankfurt-1', 'eu-amsterdam-1', 'uk-london-1', 'me-dubai-1']) {
    expect(providerServicesForRegion('oc1', region).length).toBeGreaterThan(0);
  }
  expect(providerServicesForRegion('oc19', 'eu-frankfurt-2')).toEqual([]);
  expect(providerServicesForRegion('oc19', 'eu-frankfurt-1')).toEqual([]);
  expect(providerServicesForRegion('oc1', 'eu-madrid-1')).toEqual([]);
  for (const [realm, regions] of Object.entries(fastConnectProviderServices)) {
    for (const [region, services] of Object.entries(regions)) {
      expect(findRegion(realm, region)).not.toBeNull();
      expect(new Set(services.map((s) => s.ocid)).size).toBe(services.length);
      for (const service of services) {
        expect(service.label.trim()).not.toBe('');
        expect(service.ocid).toMatch(new RegExp(`^ocid1\\.providerservice\\.${realm}\\.${region}\\.[a-z0-9]+$`));
        expect(providerSelectionError({ type: 'PRIVATE', provider_service_id: service.ocid }, realm, region)).toBeUndefined();
      }
    }
  }
});

it('rejects unsupported provider names until a service OCID is selected', () => {
  const circuit: FastConnectConfig = { type: 'PRIVATE' };
  Object.assign(circuit, { provider_service: { provider_name: 'Equinix', provider_service_name: 'Fabric' } });
  expect(providerSelectionError(circuit, 'oc1', 'eu-frankfurt-1')).toContain('Provider names are no longer supported');
  const service = providerServicesForRegion('oc1', 'eu-frankfurt-1')[0];
  const selected = selectProviderService(circuit, service.ocid, 'oc1', 'eu-frankfurt-1');
  expect(selected).not.toHaveProperty('provider_service');
  expect(selected.provider_service_id).toBe(service.ocid);
  expect(providerSelectionError(selected, 'oc1', 'eu-frankfurt-1')).toBeUndefined();
});

it('keeps manual service IDs available and checks the selected realm and region', () => {
  const manual: FastConnectConfig = { type: 'PRIVATE', provider_service_id: 'ocid1.providerservice.oc19.eu-madrid-2.example' };
  expect(providerSelectionError(manual, 'oc19', 'eu-madrid-2')).toBeUndefined();
  expect(providerSelectionError(manual, 'oc1', 'eu-frankfurt-1')).toContain('another location');
  expect(providerSelectionError(manual, 'oc19', 'eu-frankfurt-2')).toContain('another location');
  expect(providerSelectionError({ type: 'PRIVATE', provider_service_id: 'ocid1.virtualcircuit.oc1..example' }, 'oc1', 'eu-frankfurt-1')).toContain('rather than a circuit');
});

it('exports provider OCIDs while rejecting a mismatched location', () => {
  const model = emptyLzModel();
  const h = model.hybridConnectivity = emptyHybridConnectivity();
  const service = providerServicesForRegion('oc1', 'eu-frankfurt-1')[0];
  h.fast_connect_virtual_circuits.primary = { type: 'PRIVATE', provider_service_id: service.ocid, remote_cidrs: ['172.20.0.0/16'] };
  h.customer_premises_equipments.office = { ip_address: '203.0.113.10', cpe_device_shape_vendor_name: 'Fortinet' };
  expect(validateHybridConnectivity(model)).toEqual([]);
  expect(buildConfig(model).hybrid_connectivity?.fast_connect_virtual_circuits.primary.provider_service_id).toBe(service.ocid);
  expect(buildConfig(model).hybrid_connectivity?.customer_premises_equipments.office.cpe_device_shape_vendor_name).toBe('Fortinet');
  model.foundation.realm = 'oc19';
  model.foundation.region = 'eu-madrid-2';
  expect(validateHybridConnectivity(model).join(' ')).toContain('another location');
  const manual = h.fast_connect_virtual_circuits.primary = { type: 'PRIVATE', remote_cidrs: ['172.20.0.0/16'], provider_service_id: 'ocid1.providerservice.oc19.eu-madrid-2.example' };
  expect(validateHybridConnectivity(model)).toEqual([]);
  expect(buildConfig(model).hybrid_connectivity?.fast_connect_virtual_circuits.primary.provider_service_id).toBe(manual.provider_service_id);
});

it('accepts UUID device identifiers and rejects blank, conflicting or wrong-realm selectors', () => {
  const cpe = { ip_address: '203.0.113.10' };
  expect(cpeDeviceError(cpe, 'oc19')).toBeUndefined();
  expect(cpeDeviceError({ ...cpe, cpe_device_shape_id: '51d06bb2-cbf6-44df-8e7b-3e8bf1750c47' }, 'oc19')).toBeUndefined();
  expect(cpeDeviceError({ ...cpe, cpe_device_shape_id: '' }, 'oc1')).toContain('Enter a device shape identifier');
  expect(cpeDeviceError({ ...cpe, cpe_device_shape_id: 'ocid1.cpedeviceshape.oc1..example' }, 'oc19')).toContain('verified for oc19');
  expect(cpeDeviceError({ ...cpe, cpe_device_shape_id: 'ocid1.cpe.oc1..example' }, 'oc1')).toContain('rather than a CPE');
  expect(cpeDeviceError({ ...cpe, cpe_device_shape_vendor_name: 'Unverified' }, 'oc1')).toContain('Enter its device shape identifier');
  expect(cpeDeviceError({ ...cpe, cpe_device_shape_id: 'shape', cpe_device_shape_vendor_name: 'Fortinet' }, 'oc1')).toContain('rather than both');
});

it('selects verified service IDs and retains manual values without mutating the design', () => {
  const cpe = { ip_address: '203.0.113.10', cpe_device_shape_id: 'specific-shape' };
  const named = selectCpeDevice(cpe, 'Fortinet');
  expect(named).toEqual({ ip_address: cpe.ip_address, cpe_device_shape_vendor_name: 'Fortinet' });
  expect(cpe.cpe_device_shape_id).toBe('specific-shape');
  expect(selectCpeDevice(named, 'ocid')).toEqual({ ip_address: cpe.ip_address, cpe_device_shape_id: '' });
  expect(selectCpeDevice(named, 'Other')).toEqual({ ip_address: cpe.ip_address });
  expect(selectCpeDevice(cpe, 'ocid').cpe_device_shape_id).toBe('specific-shape');
  const manual: FastConnectConfig = { type: 'PRIVATE', provider_service_id: 'ocid1.providerservice.oc1.eu-frankfurt-1.example', provider_service_key_name: 'activation-reference' };
  const service = providerServicesForRegion('oc1', 'eu-frankfurt-1')[0];
  const selected = selectProviderService(manual, service.ocid, 'oc1', 'eu-frankfurt-1');
  expect(selected.provider_service_id).toBe(service.ocid);
  expect(selected).not.toHaveProperty('provider_service');
  expect(selected.provider_service_key_name).toBe('activation-reference');
  expect(manual.provider_service_id).toBe('ocid1.providerservice.oc1.eu-frankfurt-1.example');
  expect(selectProviderService(selected, 'ocid', 'oc1', 'eu-frankfurt-1').provider_service_id).toBe(selected.provider_service_id);
  expect(selectProviderService(selected, '', 'oc1', 'eu-frankfurt-1').provider_service_id).toBeUndefined();
  expect(selectProviderService(manual, service.ocid, 'oc19', 'eu-madrid-2')).toBe(manual);
});
