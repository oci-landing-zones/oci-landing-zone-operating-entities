import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { bundleFilename, zipTextFiles } from './zip';

describe('complete Landing Zone ZIP bundles', () => {
  it('preserves every supplied artifact verbatim', async () => {
    const blob = zipTextFiles({
      'config.jsonnet': '{ region: \'eu-frankfurt-1\' }\n',
      'network.json': '{\n  "network": true\n}\n',
      'iam.json': '{\n  "iam": true\n}\n',
    });
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));

    expect(Object.keys(entries).sort()).toEqual(['config.jsonnet', 'iam.json', 'network.json']);
    expect(new TextDecoder().decode(entries['config.jsonnet'])).toBe("{ region: 'eu-frankfurt-1' }\n");
  });

  it('creates a stable safe filename', () => {
    expect(bundleFilename(' Acme / Production! ')).toBe('acme-production-lz-outputs.zip');
    expect(bundleFilename('***')).toBe('landing-zone-lz-outputs.zip');
  });
});
