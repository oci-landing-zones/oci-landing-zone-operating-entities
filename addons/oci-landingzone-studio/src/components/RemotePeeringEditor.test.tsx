import { renderToStaticMarkup } from 'react-dom/server';
import { Children, isValidElement, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { validateRemotePeering } from '../services/remotePeering';
import * as wizardContext from '../wizard/wizardContext';
import { WizardProvider } from '../wizard/wizardContext';
import RemotePeeringEditor from './RemotePeeringEditor';

describe('X-RPC validation feedback', () => {
  it('identifies unnamed connections and associates each invalid field with its error', () => {
    const model = emptyLzModel();
    model.remotePeeringConnections = ['first', 'second'].map((id) => ({ id, name: '', role: 'acceptor', remoteCidrs: [], peerRegionName: '' }));
    const errors = validateRemotePeering(model);
    expect(errors).toHaveLength(6);
    expect(new Set(errors).size).toBe(6);
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><RemotePeeringEditor /></WizardProvider>);
    for (const id of ['first', 'second']) {
      for (const field of ['name', 'region', 'cidrs']) {
        const inputId = `rpc-${field}-${id}`;
        const invalid = html.match(new RegExp(`id="${inputId}"[^>]*aria-invalid="true"[^>]*aria-describedby="([^"]+)"`));
        expect(invalid).not.toBeNull();
        for (const errorId of invalid![1].split(' ')) expect(html).toContain(`id="${errorId}"`);
      }
      expect(html).not.toMatch(new RegExp(`id="rpc-role-${id}"[^>]*aria-invalid="true"`));
    }
    expect(html).not.toContain('<ul');
    expect(html).toMatch(/id="rpc-name-first"[\s\S]*?class="field-error"[\s\S]*?id="rpc-role-first"/);
    expect(html).toContain('class="rpc-connection-header"');
    expect(html).not.toContain('<legend');
  });
});

it('prefills the actual Add RPC action without changing existing editable names', () => {
  const model = emptyLzModel();
  model.remotePeeringConnections = [{ id: 'existing', name: 'custom-peer', role: 'acceptor', peerRegionName: '', remoteCidrs: [] }];
  const setField = vi.fn();
  const mock = vi.spyOn(wizardContext, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
  try {
    const tree = RemotePeeringEditor();
    const button = Children.toArray(tree.props.children).find((node) => isValidElement<{ children: string }>(node) && node.type === 'button' && node.props.children === 'Add remote connection') as ReactElement<{ onClick: () => void }>;
    button.props.onClick();
    expect(setField).toHaveBeenCalledWith('remotePeeringConnections', [model.remotePeeringConnections[0], expect.objectContaining({ name: 'rpc-2' })]);
    expect(model.remotePeeringConnections[0].name).toBe('custom-peer');
  } finally { mock.mockRestore(); }
});

it.each([
  ['complete', 'primary-secondary', 'eu-amsterdam-1'],
  ['complete', undefined, 'eu-amsterdam-1'],
  ['regional', undefined, 'eu-frankfurt-1'],
  ['complete', 'primary-only', 'eu-amsterdam-1'],
] as const)('defaults the peer region for %s / %s without replacing existing peers', (stackScope, deploymentMode, expected) => {
  const model = emptyLzModel();
  Object.assign(model.foundation, { stackScope, deploymentMode, drRegion: 'eu-amsterdam-1', homeRegion: 'eu-frankfurt-1' });
  model.remotePeeringConnections = [{ id: 'existing', name: 'other-peer', role: 'acceptor', peerRegionName: 'us-phoenix-1', remoteCidrs: [] }];
  const setField = vi.fn();
  const mock = vi.spyOn(wizardContext, 'useWizard').mockReturnValue({ model, setField, reset: vi.fn(), vcnErrors: {} });
  try {
    const tree = RemotePeeringEditor();
    const button = Children.toArray(tree.props.children).find((node) => isValidElement<{ children: string }>(node) && node.type === 'button' && node.props.children === 'Add remote connection') as ReactElement<{ onClick: () => void }>;
    button.props.onClick();
    expect(setField).toHaveBeenCalledWith('remotePeeringConnections', [model.remotePeeringConnections[0], expect.objectContaining({ peerRegionName: expected })]);
    expect(model.remotePeeringConnections[0].peerRegionName).toBe('us-phoenix-1');
  } finally { mock.mockRestore(); }
});

it('fills the visible peer region for an existing blank RPC from the known Secondary', () => {
  const model = emptyLzModel(); model.foundation.drRegion = 'eu-amsterdam-1';
  model.remotePeeringConnections = [{ id: 'existing', name: 'rpc-1', role: 'acceptor', peerRegionName: '', remoteCidrs: ['172.20.0.0/16'] }];
  const html = renderToStaticMarkup(<WizardProvider initialModel={model}><RemotePeeringEditor /></WizardProvider>);
  const region = html.match(/<select id="rpc-region-existing"[\s\S]*?<\/select>/)?.[0];
  expect(region).toContain('<option value="eu-amsterdam-1" selected="">');
  expect(region).not.toContain('aria-invalid="true"');
});
