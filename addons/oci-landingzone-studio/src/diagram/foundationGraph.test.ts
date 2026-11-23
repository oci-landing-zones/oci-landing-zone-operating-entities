import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { foundationGraph } from './foundationGraph';

const HOME = ['iam', 'governance', 'budgets', 'cloudguard'] as const;
const PRIMARY = ['networking', 'securityzones', 'scanning', 'events', 'notifications', 'logging', 'alarms', 'serviceconnectors', 'buckets'] as const;

describe('Foundation regions', () => {
  it('shows two independent stacks when Home and Primary are different deployment regions', () => {
    const graph = foundationGraph({ ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams' }, { 'eu-frankfurt-1': [...HOME], 'eu-amsterdam-1': [...PRIMARY] });
    const regions = graph.nodes.filter((node) => node.kind === 'region');
    expect(regions.map((node) => node.deploymentStack)).toEqual(['home', 'primary']);
    expect(graph.nodes.filter((node) => !node.foundationResource)).toHaveLength(3);
    for (const region of regions) {
      expect(graph.nodes.some((node) => node.foundationResource && node.parentId === region.id)).toBe(true);
    }
  });

  it.each([
    ['complete', 'eu-madrid-1'], ['complete', 'eu-frankfurt-1'], ['complete', 'eu-amsterdam-1'], ['complete', undefined],
    ['regional', 'eu-madrid-1'], ['regional', 'eu-frankfurt-1'], ['regional', 'eu-amsterdam-1'], ['regional', undefined],
  ] as const)('aligns Primary and DR side by side for %s scope and Home=%s', (stackScope, tenancyHomeRegion) => {
    const graph = foundationGraph({ ...emptyLzModel().foundation, stackScope, tenancyHomeRegion,
      region: stackScope === 'regional' ? 'eu-amsterdam-1' : 'eu-frankfurt-1',
      homeRegion: stackScope === 'regional' ? 'eu-frankfurt-1' : undefined,
      drRegion: stackScope === 'regional' ? undefined : 'eu-amsterdam-1' });
    const regions = graph.nodes.filter((node) => node.kind === 'region');
    const primary = regions.find((node) => node.label.includes('Primary region'))!;
    const dr = regions.find((node) => node.label.includes('Secondary region'))!;
    expect(primary.deploymentStack).toBe('primary');
    expect(dr.deploymentStack).toBe('secondary');
    expect(primary.y).toBe(dr.y);
    expect(primary.x + primary.width).toBeLessThan(dr.x);
    const home = regions.find((node) => node.label.includes('Home region'));
    if (home && home !== primary && home !== dr) expect(home.y + home.height).toBeLessThan(primary.y);
    const tenancy = graph.nodes[0];
    for (const region of regions) {
      expect(region.x + region.width).toBeLessThan(tenancy.width);
      expect(region.y + region.height).toBeLessThan(tenancy.height);
    }
  });

  it('distinguishes three stacks when Home, Primary and Secondary are different regions', () => {
    const graph = foundationGraph({ ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-madrid-1', drRegion: 'eu-amsterdam-1' });
    expect(graph.nodes.filter((node) => node.kind === 'region').map((node) => node.deploymentStack)).toEqual(['home', 'primary', 'secondary']);
  });

  it('places global and regional resource icons inside their selected region boxes', () => {
    const graph = foundationGraph({ ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-madrid-1' }, { 'eu-madrid-1': [...HOME], 'eu-frankfurt-1': [...PRIMARY] });
    const resources = graph.nodes.filter((node) => node.foundationResource);
    expect(resources.filter((node) => node.parentId === 'foundation-region-eu-madrid-1').map((node) => node.foundationResource))
      .toEqual([...HOME]);
    expect(resources.filter((node) => node.parentId === 'foundation-region-eu-frankfurt-1').map((node) => node.foundationResource))
      .toEqual([...PRIMARY]);
    for (const resource of resources) {
      const parent = graph.nodes.find((node) => node.id === resource.parentId)!;
      expect(resource.x + resource.width).toBeLessThanOrEqual(parent.width);
      expect(resource.y + resource.height).toBeLessThanOrEqual(parent.height);
    }
  });

  it('combines generated resource types without duplicates or absent Cloud Guard', () => {
    const graph = foundationGraph({ ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-frankfurt-1', cloudGuardEnabled: false }, { 'eu-frankfurt-1': [...HOME.filter((kind) => kind !== 'cloudguard'), ...PRIMARY, 'events'] });
    const resources = graph.nodes.filter((node) => node.foundationResource);
    expect(resources).toHaveLength(HOME.length - 1 + PRIMARY.length);
    expect(new Set(resources.map((node) => node.foundationResource)).size).toBe(resources.length);
    expect(resources.every((node) => node.parentId === 'foundation-region-eu-frankfurt-1')).toBe(true);
    expect(resources.some((node) => node.foundationResource === 'cloudguard')).toBe(false);
  });

  it('keeps the selected region boxes without fabricating resource icons before JSON is available', () => {
    const graph = foundationGraph({ ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-frankfurt-1' });
    expect(graph.nodes.some((node) => node.kind === 'region')).toBe(true);
    expect(graph.nodes.some((node) => node.foundationResource)).toBe(false);
    expect(graph.nodes.some((node) => node.label === 'Data and services')).toBe(false);
  });

  it('shows separate boxes for different Home and Primary regions', () => {
    const foundation = { ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-madrid-1', region: 'eu-frankfurt-1' };
    const graph = foundationGraph(foundation);
    const regions = graph.nodes.filter((node) => node.kind === 'region');
    expect(regions).toHaveLength(2);
    expect(regions.map((node) => node.label)).toEqual(['Home region\neu-madrid-1', 'Primary region\neu-frankfurt-1']);
    expect(regions.every((node) => node.parentId === 'foundation-tenancy')).toBe(true);
  });

  it('combines Home and Primary roles when the region is the same', () => {
    const foundation = { ...emptyLzModel().foundation, tenancyHomeRegion: 'eu-frankfurt-1' };
    const regions = foundationGraph(foundation).nodes.filter((node) => node.kind === 'region');
    expect(regions).toHaveLength(1);
    expect(regions[0].label).toBe('Home region · Primary region\neu-frankfurt-1');
  });

  it('does not invent regions before a selection is made', () => {
    const foundation = { ...emptyLzModel().foundation, region: '', tenancyHomeRegion: undefined };
    const graph = foundationGraph(foundation);
    expect(graph.nodes.filter((node) => node.kind === 'region')).toEqual([]);
    expect(graph.nodes[0].label).toContain('Select Home and Primary regions');
  });

  it('labels a linked DR deployment with its Primary and Secondary regions', () => {
    const foundation = { ...emptyLzModel().foundation, stackScope: 'regional' as const,
      tenancyHomeRegion: 'eu-madrid-1', homeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1' };
    expect(foundationGraph(foundation).nodes.filter((node) => node.kind === 'region').map((node) => node.label))
      .toEqual(['Home region\neu-madrid-1', 'Primary region\neu-frankfurt-1', 'Secondary region\neu-amsterdam-1']);
  });
});
