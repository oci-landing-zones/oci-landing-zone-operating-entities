import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { configuredVcnCidrs } from './exadata';
import { overlaps, parseCidr } from './cidr';
import { newPlatform, platformEnvInstances } from './platforms';
import { allocateDrNetworks, refreshLinkedRpcCidrs } from './drNetworkAllocation';

describe('DR network allocation', () => {
  it('rebases cloned VCNs and subnets without modifying Primary or changing prefix sizes', () => {
    const home = emptyLzModel();
    const before = structuredClone(home);
    const dr = allocateDrNetworks(structuredClone(home), home);
    const source = configuredVcnCidrs(home);
    const allocated = configuredVcnCidrs(dr);
    expect(allocated).toHaveLength(source.length);
    expect(allocated.map((cidr) => parseCidr(cidr)!.prefix)).toEqual(source.map((cidr) => parseCidr(cidr)!.prefix));
    allocated.forEach((cidr, i) => {
      expect(source.some((other) => overlaps(cidr, other))).toBe(false);
      expect(allocated.slice(0, i).some((other) => overlaps(cidr, other))).toBe(false);
    });
    for (const network of [{ vcnCidr: dr.network.hubVcnCidr, subnets: dr.network.subnets }, ...dr.environments.map((env) => env.network)]) {
      const vcn = parseCidr(network.vcnCidr)!;
      network.subnets.forEach((subnet) => {
        const sn = parseCidr(subnet.cidr)!;
        expect(sn.start).toBeGreaterThanOrEqual(vcn.start);
        expect(sn.end).toBeLessThanOrEqual(vcn.end);
      });
    }
    expect(home).toEqual(before);
    expect(allocateDrNetworks(dr, home)).toEqual(dr);
  });

  it('pins platform instances, shared networks and Exadata while reserving Kubernetes ranges', () => {
    const home = emptyLzModel();
    home.platforms = [newPlatform('custom', [], home.environments), newPlatform('oke_simple', [], home.environments)];
    home.sharedPlatforms = [{ id: 'shared', key: 'extra', vcnCidr: '10.8.0.0/21', subnets: [{ name: 'app', cidr: '10.8.1.0/24' }] }];
    home.exadata.exacs.enabled = true;
    home.exadata.exacs.sharedVcnCidr = '10.9.0.0/21';
    const dr = allocateDrNetworks(home, home);
    const reserved = configuredVcnCidrs(home);
    configuredVcnCidrs(dr).forEach((cidr) => expect(reserved.some((other) => overlaps(cidr, other))).toBe(false));
    for (const platform of dr.platforms) {
      for (const instance of platformEnvInstances(platform, dr.environments)) {
        const vcn = parseCidr(instance.vcnCidr)!;
        instance.subnets.forEach((subnet) => {
          const sn = parseCidr(subnet.cidr)!;
          expect(sn.start).toBeGreaterThanOrEqual(vcn.start);
          expect(sn.end).toBeLessThanOrEqual(vcn.end);
        });
      }
    }
    expect(dr.platforms[1].okeParams).toEqual(home.platforms[1].okeParams);
  });

  it('refreshes routes matching the old peer inventory while preserving custom routes', () => {
    const peer = emptyLzModel(); peer.foundation.region = 'eu-amsterdam-1';
    const model = emptyLzModel(); model.foundation.drRegion = peer.foundation.region;
    model.remotePeeringConnections = [{ id: 'rpc', name: 'rpc-1', role: 'acceptor', peerRegionName: peer.foundation.region, remoteCidrs: configuredVcnCidrs(peer) }];
    const moved = allocateDrNetworks(peer, model);
    expect(refreshLinkedRpcCidrs(model, peer, moved).remotePeeringConnections![0].remoteCidrs).toEqual(configuredVcnCidrs(moved));
    model.remotePeeringConnections![0].remoteCidrs = ['172.31.0.0/24'];
    expect(refreshLinkedRpcCidrs(model, peer, moved)).toBe(model);
  });
});
