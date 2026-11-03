import { describe, expect, it } from 'vitest';
import { describeHop, flowChoices, selectedRoles, toggleFlow } from './FlowSidebar';

describe('toggleFlow', () => {
  const roles = ['web', 'app', 'db', 'infra'];

  it('starts a flow with one endpoint so the diagram shows a single path', () => {
    expect(toggleFlow(['preprod:egress'], 'prod:egress', roles)).toEqual(['preprod:egress', 'prod:egress:web']);
  });

  it('removes every pick for the flow when it is unticked', () => {
    expect(toggleFlow(['prod:egress:web', 'prod:egress:db', 'prod:services'], 'prod:egress', roles)).toEqual(['prod:services']);
    expect(toggleFlow(['prod:egress'], 'prod:egress', roles)).toEqual([]);
  });

  it('falls back to the all-endpoints pick when the environment has no subnets', () => {
    expect(toggleFlow([], 'prod:egress', [])).toEqual(['prod:egress']);
  });
});

describe('selectedRoles', () => {
  const roles = ['web', 'app', 'db'];

  it('expands an all-endpoints pick and keeps subnet order for single picks', () => {
    expect(selectedRoles(new Set(['prod:egress']), 'prod:egress', roles)).toEqual(roles);
    expect(selectedRoles(new Set(['prod:egress:db', 'prod:egress:web']), 'prod:egress', roles)).toEqual(['web', 'db']);
    expect(selectedRoles(new Set(['prod:ingress:web']), 'prod:egress', roles)).toEqual([]);
  });
});

describe('describeHop', () => {
  it('splits a routing hop into place and route, dropping the inspect suffix', () => {
    expect(describeHop({ label: 'INT FW: 0.0.0.0/0 → NGW (inspect)' })).toEqual({ place: 'INT FW', route: '0.0.0.0/0 → NGW' });
  });

  it('keeps gateway and delivery hops readable', () => {
    expect(describeHop({ label: 'NAT GW → Internet' })).toEqual({ place: 'NAT GW → Internet', route: '' });
    expect(describeHop({ label: '→ vm-prod-web' })).toEqual({ place: 'Delivered to vm-prod-web', route: '' });
  });
});

describe('flowChoices', () => {
  const environments = [{ name: 'prod' }, { name: 'preprod' }, { name: 'dev' }];

  it('makes every east-west destination explicit', () => {
    expect(flowChoices(environments, 0)).toEqual([
      { id: 'prod:egress', label: 'prod → Internet', sub: 'egress' },
      { id: 'prod:ingress', label: 'Internet → prod', sub: 'ingress' },
      { id: 'prod>preprod:east-west', label: 'prod → preprod', sub: 'east-west' },
      { id: 'prod>dev:east-west', label: 'prod → dev', sub: 'east-west' },
      { id: 'prod:services', label: 'prod → OCI Services', sub: 'Service Gateway' },
    ]);
  });

  it('uses the selected environment name for ingress, egress and hybrid flows', () => {
    const choices = flowChoices(environments, 1, true, [{ id: 'fc', name: 'Datacenter', type: 'FastConnect' }]);
    expect(choices.map((choice) => choice.label)).toEqual([
      'preprod → Internet', 'Internet → preprod', 'preprod → prod', 'preprod → dev',
      'preprod → OCI Services', 'preprod → Datacenter', 'Datacenter → preprod',
    ]);
    expect(choices[0].id).toBe('preprod:egress');
  });

  it('omits east-west choices when there is no destination environment', () => {
    expect(flowChoices([{ name: 'prod' }], 0).map((choice) => choice.id)).toEqual([
      'prod:egress', 'prod:ingress', 'prod:services',
    ]);
  });
});
