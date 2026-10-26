import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { validateRemotePeering } from '../services/remotePeering';
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
