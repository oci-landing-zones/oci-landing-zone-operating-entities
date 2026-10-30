import { emptyLzModel, envNetworkDefaults } from '../model/defaults';
import type { HubKind } from '../model/types';
import { providerServicesForRegion } from '../services/connectivityCatalog';
import { emptyHybridConnectivity, newVpn } from '../services/hybridConnectivity';
import { hubKindDefaults } from '../services/hubKinds';
import { newPlatform } from '../services/platforms';

export function complexHybridModel(hubKind: HubKind = 'hub_b') {
  const model = emptyLzModel();
  model.network = { hubKind, ...hubKindDefaults(hubKind) };
  model.foundation.notifications!.default = 'ops@example.com';
  model.environments = ['prod', 'preprod', 'dev'].map((name, index) => ({
    id: `environment-${index + 1}`, name, securityZone: index === 0, network: envNetworkDefaults(index, name),
  }));
  model.platforms = [newPlatform('oke_simple', [], model.environments)];
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.customer_premises_equipments['backup-router'] = { ip_address: '203.0.113.10' };
  const vpn = hybrid.ipsecs.backup = { ...newVpn('backup-router'), remote_cidrs: ['172.21.0.0/16'] };
  for (const [key, customer, oracle] of [
    ['tunnel_1', '172.20.1.1/30', '172.20.1.2/30'], ['tunnel_2', '172.20.1.5/30', '172.20.1.6/30'],
  ] as const) {
    vpn.tunnels_management[key] = {
      routing: 'BGP', ike_version: 'V2', secretMode: 'oci',
      bgp_session_info: { customer_bgp_asn: '65001', customer_interface_ip: customer, oracle_interface_ip: oracle },
    };
  }
  hybrid.fast_connect_virtual_circuits.primary = {
    type: 'PRIVATE', remote_cidrs: ['172.21.0.0/16'], bandwidth_shape_name: '1 Gbps', customer_asn: '65010',
    provider_service_id: providerServicesForRegion(model.foundation.realm, model.foundation.region).find((provider) => provider.label === 'Equinix / Fabric')!.ocid,
    cross_connect_mappings: { primary: { customer_bgp_peering_ip: '172.22.0.1/30', oracle_bgp_peering_ip: '172.22.0.2/30' } },
  };
  return model;
}
