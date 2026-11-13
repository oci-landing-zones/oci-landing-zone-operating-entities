import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FlowSidebar, { describeHop, flowChoices, selectedRoles, toggleFlow } from './FlowSidebar';

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

  it('offers the existing endpoint roles through Bastion only when its generated binding is available', () => {
    expect(flowChoices(environments, 0).some((choice) => choice.id === 'prod:bastion')).toBe(false);
    expect(flowChoices(environments, 0, true, [], true)).toContainEqual({ id: 'prod:bastion', label: 'Operator → prod', sub: 'Bastion SOCKS5 route preview' });
    expect(toggleFlow([], 'prod:bastion', ['web', 'db'])).toEqual(['prod:bastion:web']);
  });

  it('offers only Bastion for platform-only scopes and keeps them out of ordinary east-west choices', () => {
    const scopes = [{ name: 'prod', bastionOnly: true, bastionRoles: [{ id: 'SN-OKE', label: 'Private OKE subnet' }] },
      { name: '@shared', label: 'Shared platforms', bastionOnly: true, bastionRoles: [{ id: 'SN-DB', label: 'Private database subnet' }] },
      { name: 'dev' }];
    expect(flowChoices(scopes, 0, true, [], true)).toEqual([{ id: 'prod:bastion', label: 'Operator → prod', sub: 'Bastion SOCKS5 route preview', roles: scopes[0].bastionRoles }]);
    expect(flowChoices(scopes, 1, true, [], true)[0].label).toBe('Operator → Shared platforms');
    expect(flowChoices(scopes, 2, true, [], true).some((choice) => choice.id.includes('east-west'))).toBe(false);
  });

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

describe('OKE flow choices', () => {
  it('retains original subnet indices in hop details when an API flow selects all allowed endpoints', () => {
    const id = '@hub>prod/oke:api';
    const markup = renderToStaticMarkup(createElement(FlowSidebar, {
      environments: [
        { name: 'Hub', scope: '@hub', apiOnly: true, roles: ['lb', 'fw', 'mgmt', 'mon'], rolesFor: (kind) => kind === 'api' ? ['mgmt', 'mon'] : [] },
        { name: 'prod/oke', apiServer: true, roles: ['workers'], rolesFor: () => [] },
      ],
      active: [id],
      traces: [{ id: `${id}#2`, kind: 'api', color: '#2a78d6', label: 'Hub API access', ok: true,
        hops: [{ seq: 1, node: 'hub-vcn-sn-2', visitIndex: 0, label: 'Management source hop' }], segments: [], highlights: [] }],
      steps: {}, onStep: () => {}, onChange: () => {}, collapsed: false, onToggleCollapse: () => {},
    }));
    expect(markup).toContain('Management source hop');
  });

  it('shows a pod internet case without advertising worker internet when only pods are allowed', () => {
    const env = { name: 'prod/oke', oke: true, rolesFor: (kind: string) => kind === 'egress' ? ['pods'] : kind === 'services' ? ['workers', 'pods'] : [] };
    expect(flowChoices([env], 0).map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'prod/oke:egress:pods', label: 'Pods → Internet' },
      { id: 'prod/oke:services:workers', label: 'Workers → OCI Services' },
      { id: 'prod/oke:services:pods', label: 'Pods → OCI Services' },
    ]);
  });

  it('offers worker and pod cases independently without duplicating endpoint selection', () => {
    const env = { name: 'prod/oke', oke: true, rolesFor: (kind: string) => kind === 'ingress' ? [] : ['workers', 'pods'] };
    const choices = flowChoices([env, { name: 'preprod' }], 0);
    expect(choices.filter((choice) => choice.id.includes(':egress:')).map((choice) => choice.label)).toEqual(['Workers → Internet', 'Pods → Internet']);
    expect(choices.filter((choice) => choice.id.includes(':east-west:')).map((choice) => choice.label)).toEqual(['Workers → preprod', 'Pods → preprod']);
    const first = toggleFlow([], 'prod/oke:egress:pods', []);
    const both = toggleFlow(first, 'prod/oke:egress:workers', []);
    expect(both).toEqual(['prod/oke:egress:pods', 'prod/oke:egress:workers']);
    expect(toggleFlow(both, 'prod/oke:egress:workers', [])).toEqual(first);
  });
});
