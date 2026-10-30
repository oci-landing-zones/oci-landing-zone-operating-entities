import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from '../services/platforms';
import { hasIncompleteNetworkInput, isDiagramTextControl } from './diagramEditing';

describe('diagram edit boundaries', () => {
  it('defers incomplete CIDR rows until they are completed or removed', () => {
    const model = emptyLzModel();
    const platform = newPlatform('oke_simple', [], model.environments);
    model.platforms = [platform];
    expect(hasIncompleteNetworkInput(model)).toBe(false);
    platform.okeParams!.workerSpokeAccess = true;
    platform.okeParams!.peerVcnCidrs = [''];
    expect(hasIncompleteNetworkInput(model)).toBe(true);
    platform.okeParams!.peerVcnCidrs = ['10.'];
    expect(hasIncompleteNetworkInput(model)).toBe(true);
    platform.okeParams!.peerVcnCidrs = ['10.40.0.0/24'];
    expect(hasIncompleteNetworkInput(model)).toBe(false);
    platform.okeParams!.apiAllowedCidrs.push('');
    expect(hasIncompleteNetworkInput(model)).toBe(true);
    platform.okeParams!.apiAllowedCidrs.pop();
    expect(hasIncompleteNetworkInput(model)).toBe(false);
    platform.okeParams!.apiAllowedCidrs = [];
    expect(hasIncompleteNetworkInput(model)).toBe(true);
  });

  it('also defers incomplete hub, spoke, profile and remote network CIDRs', () => {
    const hub = emptyLzModel();
    hub.network.hubVcnCidr = '10.8.';
    expect(hasIncompleteNetworkInput(hub)).toBe(true);
    const spoke = emptyLzModel();
    spoke.environments[0].network.subnets[0].cidr = '10.4.0.0/';
    expect(hasIncompleteNetworkInput(spoke)).toBe(true);
    const platform = emptyLzModel();
    platform.platforms = [newPlatform('oke_simple', [])];
    platform.platforms[0].vcnCidr = '10.5./18';
    expect(hasIncompleteNetworkInput(platform)).toBe(true);
    const remote = emptyLzModel();
    remote.remotePeeringConnections = [{ id: 'remote', name: 'remote', role: 'acceptor', peerRegionName: 'eu-amsterdam-1', remoteCidrs: [''] }];
    expect(hasIncompleteNetworkInput(remote)).toBe(true);
  });

  it('waits for text edits while keeping discrete controls immediate', () => {
    const control = (tagName: string, type: string) => ({ tagName, type }) as unknown as EventTarget;
    expect(isDiagramTextControl(control('INPUT', 'text'))).toBe(true);
    expect(isDiagramTextControl(control('INPUT', 'number'))).toBe(true);
    expect(isDiagramTextControl(control('TEXTAREA', 'textarea'))).toBe(true);
    expect(isDiagramTextControl(control('SELECT', 'select-one'))).toBe(false);
    expect(isDiagramTextControl(control('INPUT', 'checkbox'))).toBe(false);
    expect(isDiagramTextControl(control('BUTTON', 'button'))).toBe(false);
  });
});
