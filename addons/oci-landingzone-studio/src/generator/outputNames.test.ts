import { describe, expect, it } from 'vitest';
import { deploymentStages, isCurrentOutputSet } from './outputNames';

describe('deploymentStages', () => {
  const shapes = [false, true].flatMap((regional) => ([1, 2] as const).flatMap((cis) =>
    [false, true].flatMap((backends) => [false, true].map((oke) => ({ regional, cis, backends, oke }))),
  ));

  it.each(shapes)('keeps the default two phases for $regional/$cis/$backends/$oke', ({ regional, cis, backends, oke }) => {
    const persistent = regional ? [] : ['iam.json', 'governance.json'];
    const pre = [`security_cis${cis}_pre.json`, `observability_cis${cis}_pre.json`];
    const final = [`security_cis${cis}.json`, `observability_cis${cis}.json`];
    const workloads = oke ? ['oke_clusters.json', 'oke_workers.json'] : [];
    const files = [...persistent, 'network.json', ...pre, ...final, ...workloads,
      ...(backends ? ['network_backends.json'] : [])];
    const stages = deploymentStages(files);
    expect(stages).toHaveLength(2);
    expect(stages[0].files).toEqual([...persistent, 'network.json', ...pre]);
    expect(stages[1].files).toEqual([...persistent, 'network.json', ...final, ...workloads]);
  });

  it('keeps design, guide, diagram and runtime dependency files out of both phases', () => {
    const stages = deploymentStages(['network.json', 'config.jsonnet', 'README.txt', 'design.drawio',
      'compartments_output.json', 'network_output.json']);
    expect(stages.map((stage) => stage.files)).toEqual([['network.json'], ['network.json']]);
  });

  it.each(shapes.filter((shape) => shape.backends))('retains ready Hub C backends for $regional/$cis/$oke', ({ regional, cis, oke }) => {
    const persistent = regional ? [] : ['iam.json', 'governance.json'];
    const pre = [`security_cis${cis}_pre.json`, `observability_cis${cis}_pre.json`];
    const final = [`security_cis${cis}.json`, `observability_cis${cis}.json`];
    const workloads = oke ? ['oke_clusters.json', 'oke_workers.json'] : [];
    const stages = deploymentStages([...persistent, 'network.json', 'network_backends.json', ...pre, ...final, ...workloads], 'network_backends.json');
    expect(stages[0].files).toEqual([...persistent, 'network.json', ...pre]);
    expect(stages[1].files).toEqual([...persistent, 'network_backends.json', ...final, ...workloads]);
  });

  it('reports a missing selected network alternative instead of omitting the network', () => {
    expect(() => deploymentStages(['network.json'], 'network_backends.json')).toThrow('network_backends.json');
  });

});

describe('isCurrentOutputSet', () => {
  it('accepts current outputs and requires regeneration after design or network-format changes', () => {
    const saved = { config: '{ cis_level: 2 }', files: { 'network.json': '{}' } };
    expect(isCurrentOutputSet(saved, saved.config)).toBe(true);
    expect(isCurrentOutputSet(saved, '{ cis_level: 1 }')).toBe(false);
    expect(isCurrentOutputSet({ ...saved, files: { ...saved.files, 'network_pre.json': '{}' } }, saved.config)).toBe(false);
  });
});
