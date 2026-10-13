import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyLzModel } from '../../model/defaults';
import { newPlatform, newSharedPlatform } from '../../services/platforms';
import { buildConfig } from '../../services/lzConfig';
import { platformReadiness } from '../../services/platformReadiness';
import { WizardProvider } from '../wizardContext';
import PlatformsStep from './PlatformsStep';
import type { LzModel } from '../../model/types';

function render(model: LzModel) {
  return renderToStaticMarkup(<WizardProvider initialModel={model}><PlatformsStep /></WizardProvider>);
}

describe('platform readiness and existing custom networks', () => {
  it('marks a newly added OCVS with no SSH public key as needing attention', () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('ocvs', [], model.environments)];
    expect(render(model)).toContain('Needs attention');
    expect(render(model)).toContain('SSH public key');
  });
  it('does not mark OKE without an environment as configured', () => {
    const model = emptyLzModel();
    model.platforms = [{ ...newPlatform('oke_simple', []), environments: [] }];
    expect(render(model)).toContain('Needs attention');
    expect(render(model)).toContain('Select at least one environment');
  });
  it('marks complete OKE settings as configured', () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('oke_simple', [])];
    expect(render(model)).toContain('>Configured<');
  });
  it('marks enabled EXACC with no database service as needing attention', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    expect(render(model)).toContain('Needs attention');
  });
  it('keeps existing custom networks reviewable without creating new ones', () => {
    const model = emptyLzModel();
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    const before = buildConfig(model);
    expect(render(model)).toContain('Existing custom networks');
    expect(render(model)).not.toContain('Add Shared Platform');
    expect(buildConfig(model)).toEqual(before);
  });
  it('checks shared OCVS credentials too', () => {
    const model = emptyLzModel();
    model.sharedPlatforms = [newSharedPlatform('ocvs', [])];
    expect(render(model)).toContain('Needs attention');
    model.sharedPlatforms[0].ocvsParams!.sshAuthorizedKeys = 'ssh-rsa AAAATEST studio@example';
    expect(render(model)).toContain('>Configured<');
    expect(render(model)).not.toContain('Needs attention');
  });
  it('marks complete EXACC as configured', () => {
    const model = emptyLzModel();
    model.exadata.exacc = { ...model.exadata.exacc, enabled: true, service: 'vmc',
      notifications: { default: 'ops@example.com', useSingleRecipient: true } };
    expect(render(model)).toContain('>Configured<');
    expect(render(model)).not.toContain('Needs attention');
  });
  it('retains custom platforms created before the optional type field', () => {
    const model = emptyLzModel();
    const platform = newSharedPlatform('custom', []);
    delete platform.type;
    model.sharedPlatforms = [platform];
    expect(render(model)).toContain('Existing custom networks');
    expect(render(model)).not.toContain('Add Shared Platform');
  });
  it('flags duplicate keys across OKE and OCVS in both statuses', () => {
    const model = emptyLzModel();
    const ocvs = newPlatform('ocvs', [], model.environments);
    ocvs.key = 'oke';
    ocvs.ocvsParams!.sshAuthorizedKeys = 'ssh-rsa AAAATEST studio@example';
    model.platforms = [newPlatform('oke_simple', []), ocvs];
    for (const type of ['oke_simple', 'ocvs'] as const) {
      expect(platformReadiness(model, type).errors).toContain('Duplicate environment platform config key: oke.');
    }
  });
  it('does not offer custom networks for a new design', () => {
    expect(render(emptyLzModel())).not.toContain('Existing custom networks');
  });
});
