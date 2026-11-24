import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { serializeConfig } from './lzConfig';
import { outputChangeReasons } from './outputChanges';

describe('saved output change explanations', () => {
  it('identifies changed sections without showing configuration values', () => {
    const model = emptyLzModel();
    const previous = serializeConfig(model);
    model.foundation.vulnerabilityScanningEnabled = false;
    model.remotePeeringConnections = [{ id: 'rpc', name: 'secret-peer-name', role: 'acceptor', peerRegionName: 'eu-amsterdam-1', remoteCidrs: ['172.20.0.0/21'] }];
    expect(outputChangeReasons(previous, serializeConfig(model))).toEqual(['Security settings changed.', 'Network / RPC settings changed.']);
  });

  it('distinguishes outdated file formats from configuration changes', () => {
    const config = serializeConfig(emptyLzModel());
    expect(outputChangeReasons(config, config)).toEqual(['The saved files use an older or incomplete output format.']);
    expect(outputChangeReasons('old source', config)).toEqual(['The design has changed; section details are unavailable for this saved version.']);
  });

  it('identifies linked DR draft changes in legacy combined designs', () => {
    const home = serializeConfig(emptyLzModel());
    expect(outputChangeReasons(JSON.stringify({ home, draft: { region: 'eu-amsterdam-1' } }), JSON.stringify({ home, draft: { region: 'eu-paris-1' } }))).toEqual(['Secondary (DR) settings changed.']);
  });
});
