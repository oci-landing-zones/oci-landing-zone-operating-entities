import { expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import type { FastConnectConfig } from '../model/hybridConnectivity';
import { buildConfig } from './lzConfig';
import { emptyHybridConnectivity, validateHybridConnectivity } from './hybridConnectivity';
import { connectivityCatalog, cpeDeviceError, providerSelectionError, providerServicesForRegion, selectCpeDevice, selectProviderService } from './connectivityCatalog';
import { findRegion } from './regions';

const equinix: FastConnectConfig = { type: 'PRIVATE', provider_service: { provider_name: 'Equinix', provider_service_name: 'Fabric' } };

it('keeps catalogue facts sourced, scoped and free of resource identifiers', () => {
  expect(connectivityCatalog.verified_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(new Set(connectivityCatalog.provider_services.map((s) => s.key)).size).toBe(connectivityCatalog.provider_services.length);
  expect(JSON.stringify(connectivityCatalog)).not.toContain('ocid1.');
  for (const entry of [...connectivityCatalog.provider_services, ...connectivityCatalog.cpe_vendors]) {
    expect(entry.sources.length).toBeGreaterThan(0);
    for (const url of entry.sources) expect(new URL(url).protocol).toBe('https:');
  }
  for (const service of connectivityCatalog.provider_services) {
    for (const [realm, regions] of Object.entries(service.regions)) {
      expect(new Set(regions).size).toBe(regions.length);
      for (const region of regions) expect(findRegion(realm, region)).not.toBeNull();
    }
  }
});

it('prioritizes documented Frankfurt choices and never falls back across realms', () => {
  expect(providerServicesForRegion('oc1', 'eu-frankfurt-1').map((s) => s.key)).toEqual(['equinix-fabric', 'megaport-vxc']);
  expect(providerServicesForRegion('oc19', 'eu-frankfurt-2').map((s) => s.key)).toEqual(['equinix-fabric']);
  expect(providerServicesForRegion('oc19', 'eu-frankfurt-1')).toEqual([]);
  expect(providerServicesForRegion('unknown', 'eu-frankfurt-1')).toEqual([]);
  expect(providerServicesForRegion('oc1', 'unknown')).toEqual([]);
});

it('requires review when a known service is moved to an unverified location', () => {
  expect(providerSelectionError(equinix, 'oc1', 'eu-frankfurt-1')).toBeUndefined();
  expect(providerSelectionError(equinix, 'oc19', 'eu-frankfurt-2')).toBeUndefined();
  expect(providerSelectionError(equinix, 'oc19', 'eu-madrid-2')).toContain('not in the maintained list');
  expect(providerSelectionError({ ...equinix, provider_service_id: 'ocid1.providerservice.oc1..example' }, 'oc1', 'eu-frankfurt-1')).toContain('rather than both');
  expect(providerSelectionError({ type: 'PRIVATE', provider_service: { provider_name: 'Unlisted', provider_service_name: 'Unverified' } }, 'oc19', 'eu-madrid-2')).toContain('enter its provider service OCID');
});

it('keeps manual service IDs available and checks the selected realm and region', () => {
  const manual: FastConnectConfig = { type: 'PRIVATE', provider_service_id: 'ocid1.providerservice.oc19.eu-madrid-2.example' };
  expect(providerSelectionError(manual, 'oc19', 'eu-madrid-2')).toBeUndefined();
  expect(providerSelectionError(manual, 'oc1', 'eu-frankfurt-1')).toContain('another location');
  expect(providerSelectionError(manual, 'oc19', 'eu-frankfurt-2')).toContain('another location');
  expect(providerSelectionError({ type: 'PRIVATE', provider_service_id: 'ocid1.virtualcircuit.oc1..example' }, 'oc1', 'eu-frankfurt-1')).toContain('rather than a circuit');
});

it('preserves portable names and manual identifiers in exports while rejecting a stale location', () => {
  const model = emptyLzModel();
  const h = model.hybridConnectivity = emptyHybridConnectivity();
  h.fast_connect_virtual_circuits.primary = { ...equinix, remote_cidrs: ['172.20.0.0/16'] };
  h.customer_premises_equipments.office = { ip_address: '203.0.113.10', cpe_device_shape_vendor_name: 'Fortinet' };
  expect(validateHybridConnectivity(model)).toEqual([]);
  expect(buildConfig(model).hybrid_connectivity?.fast_connect_virtual_circuits.primary.provider_service).toEqual(equinix.provider_service);
  expect(buildConfig(model).hybrid_connectivity?.customer_premises_equipments.office.cpe_device_shape_vendor_name).toBe('Fortinet');
  model.foundation.realm = 'oc19';
  model.foundation.region = 'eu-madrid-2';
  expect(validateHybridConnectivity(model).join(' ')).toContain('not in the maintained list');
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

it('removes stale identifiers when selecting names and retains manual values without mutating the design', () => {
  const cpe = { ip_address: '203.0.113.10', cpe_device_shape_id: 'specific-shape' };
  const named = selectCpeDevice(cpe, 'Fortinet');
  expect(named).toEqual({ ip_address: cpe.ip_address, cpe_device_shape_vendor_name: 'Fortinet' });
  expect(cpe.cpe_device_shape_id).toBe('specific-shape');
  expect(selectCpeDevice(named, 'ocid')).toEqual({ ip_address: cpe.ip_address, cpe_device_shape_id: '' });
  expect(selectCpeDevice(named, 'Other')).toEqual({ ip_address: cpe.ip_address });
  expect(selectCpeDevice(cpe, 'ocid').cpe_device_shape_id).toBe('specific-shape');
  const manual: FastConnectConfig = { type: 'PRIVATE', provider_service_id: 'ocid1.providerservice.oc1.eu-frankfurt-1.example', provider_service_key_name: 'activation-reference' };
  const selected = selectProviderService(manual, 'equinix-fabric', 'oc1', 'eu-frankfurt-1');
  expect(selected.provider_service_id).toBeUndefined();
  expect(selected.provider_service).toEqual(equinix.provider_service);
  expect(selected.provider_service_key_name).toBe('activation-reference');
  expect(manual.provider_service_id).toContain('ocid1.');
  expect(selectProviderService(selected, 'ocid', 'oc1', 'eu-frankfurt-1').provider_service).toBeUndefined();
  expect(selectProviderService(selected, '', 'oc1', 'eu-frankfurt-1').provider_service).toBeUndefined();
  expect(selectProviderService(manual, 'equinix-fabric', 'oc19', 'eu-madrid-2')).toBe(manual);
});
