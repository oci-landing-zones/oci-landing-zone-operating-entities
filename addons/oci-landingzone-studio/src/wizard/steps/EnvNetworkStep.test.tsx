import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import EnvNetworkStep from './EnvNetworkStep';

describe('environment network controls', () => {
  it.each([true, false])('keeps the VCN toggle available while collapsed (enabled: %s)', (enabled) => {
    const model = emptyLzModel();
    model.environments[0].projectNetworkEnabled = enabled;
    const html = renderToStaticMarkup(<WizardProvider initialModel={model}><EnvNetworkStep /></WizardProvider>);
    expect(html).toMatch(new RegExp(`role="switch" aria-checked="${enabled}" aria-label="Projects VCN for prod"`));
    expect(html).toMatch(/aria-label="Configure prod network"[^>]*aria-expanded="false"[^>]*aria-controls="environment-network-0"/);
    expect(html).toContain('id="environment-network-0" hidden');
    expect(html).not.toContain('Include a Projects VCN');
    if (!enabled) expect(html).toContain('VCN disabled');
  });
});
