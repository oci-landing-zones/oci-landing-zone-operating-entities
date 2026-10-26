import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { generateOutputs } from './generate';
import { generatePreview } from './preview';
import { setAssetLoader } from './jsonnetVm';
import { extractGeneratedResources } from '../services/generatedResources';
import { newPlatform } from '../services/platforms';
import * as virtualFs from './virtualFs';

beforeAll(() => setAssetLoader(async () => ({ wasmBinary: readFileSync('3rd/go-jsonnet/libjsonnet.wasm') })));

describe('canonical diagram preview', () => {
  it('matches the selected deployable final artifacts and produces all six CIS2 resource families', async () => {
    const model = emptyLzModel();
    const preview = await generatePreview(model);
    const generated = await generateOutputs(model);
    const outputs = Object.fromEntries(Object.entries(generated.files).map(([name, value]) => [name, JSON.parse(value)]));
    expect(preview.network).toEqual(outputs['network.json']);
    expect(preview.inventory).toEqual(extractGeneratedResources(outputs, outputs['iam.json'].compartments_configuration));
    expect([...new Set(preview.inventory.groups.map((group) => group.kind))].sort()).toEqual(['events', 'flowlogs', 'notifications', 'scanning', 'securityrecipes', 'vault']);
    expect(preview.inventory.groups.find((group) => group.kind === 'vault')?.items).toEqual([{ key: 'VLT-LZ-SHARED-SECURITY-KEY', name: 'vlt-lz-shared-security' }]);
    expect(preview.inventory.groups.find((group) => group.compartmentKey === 'TENANCY-ROOT')?.items.map((item) => item.name)).toContain('rul-lz-notify-on-iam-changes');
  }, 60_000);

  it('uses canonical CIS1 conditions instead of showing CIS2 vaults', async () => {
    const model = emptyLzModel();
    model.foundation.cisLevel = 1;
    const { inventory } = await generatePreview(model);
    expect(inventory.groups.some((group) => group.kind === 'vault')).toBe(false);
    expect(inventory.groups.some((group) => group.kind === 'securityrecipes')).toBe(true);
    expect(inventory.groups.some((group) => group.kind === 'flowlogs')).toBe(true);
  }, 60_000);

  it('includes extension-contributed resources and their generated compartment ancestry', async () => {
    const model = emptyLzModel();
    model.foundation.cisLevel = 1;
    model.platforms = [newPlatform('oke_simple', [], model.environments)];
    model.exadata.exacs = { ...model.exadata.exacs, enabled: true, service: 'vmc', notifications: { default: 'db@example.com' } };
    const { inventory } = await generatePreview(model);
    expect(inventory.groups.some((group) => group.kind === 'vault')).toBe(false);
    const exadataCompartments = inventory.compartments.filter((compartment) => compartment.name.includes('exacs'));
    expect(exadataCompartments.length).toBeGreaterThan(0);
    expect(inventory.groups.some((group) => group.kind === 'events' && exadataCompartments.some((compartment) => compartment.key === group.compartmentKey))).toBe(true);
    expect(inventory.groups.every((group) => inventory.compartments.some((compartment) => compartment.key === group.compartmentKey))).toBe(true);
  }, 60_000);

  it('honors regional output filtering while retaining Home compartment references for placement', async () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { stackScope: 'regional', region: 'eu-amsterdam-1', regionShortName: 'ams', homeRegion: 'eu-frankfurt-1' });
    const { inventory } = await generatePreview(model);
    expect(inventory.groups.some((group) => group.kind === 'securityrecipes' || group.compartmentKey === 'TENANCY-ROOT')).toBe(false);
    expect(inventory.groups.some((group) => group.kind === 'vault')).toBe(true);
    expect(inventory.compartments).toContainEqual({ key: 'CMP-LZ-PROD-SECURITY-KEY', name: 'cmp-lz-prod-security', parentKey: 'CMP-LZ-PROD-KEY' });
    const topicNames = inventory.groups.filter((group) => group.kind === 'notifications').flatMap((group) => group.items.map((item) => item.name));
    expect(topicNames).not.toContain('nott-lz-cloudguard');
    expect(topicNames).not.toContain('nott-lz-iam');
    expect(inventory.groups.filter((group) => group.kind === 'flowlogs').flatMap((group) => group.items.map((item) => item.name))).toContain('lgrp-lz-prod-vcn-flow');
  }, 60_000);

  it('does not evaluate unrelated workload payloads or alarm definitions for the preview', async () => {
    const vfs = virtualFs.buildVirtualFs();
    const replacement = vi.spyOn(virtualFs, 'buildVirtualFs').mockReturnValueOnce({ ...vfs, files: {
      ...vfs.files,
      'original_multi.jsonnet': vfs.files['landing_zone_multi.jsonnet'],
      'landing_zone_multi.jsonnet': `function(config)
        local outputs = (import 'original_multi.jsonnet')(config);
        outputs + {
          'runtime-workload.json': { deployment_ids: error 'Unrelated workload inputs must stay lazy' },
          ['observability_cis%d.json' % config.cis_level]+: {
            alarms_configuration: error 'Alarm payload must stay lazy',
          },
        }`,
    } });
    try {
      const preview = await generatePreview(emptyLzModel());
      expect(preview.inventory.groups.some((group) => group.kind === 'events')).toBe(true);
      expect(preview.network).toBeDefined();
    } finally { replacement.mockRestore(); }
  }, 60_000);

  it('has no environment resources when the design has no environments', async () => {
    const model = emptyLzModel();
    model.environments = []; model.projects = [];
    const { inventory } = await generatePreview(model);
    expect(inventory.groups.filter((group) => group.kind === 'flowlogs')).toHaveLength(1);
    expect(inventory.compartments.some((compartment) => compartment.name.includes('prod'))).toBe(false);
    expect(inventory.groups.filter((group) => group.kind === 'events').flatMap((group) => group.items)).toHaveLength(4);
  }, 60_000);
});
