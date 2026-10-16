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

describe('platform selection and readiness', () => {
  it('offers separate type dropdowns for shared and environment platforms', () => {
    const markup = render(emptyLzModel());
    const shared = markup.match(/<select id="new-shared-platform-type"[^>]*>(.*?)<\/select>/)?.[1];
    const environment = markup.match(/<select id="new-platform-type"[^>]*>(.*?)<\/select>/)?.[1];
    expect(shared).toBeDefined();
    expect(shared).toContain('value="custom"');
    expect(shared).toContain('value="ocvs"');
    expect(shared).toContain('value="exacc"');
    expect(shared).toContain('value="exacs"');
    expect(shared).not.toContain('value="oke_simple"');
    expect(environment).toBeDefined();
    for (const type of ['oke_simple', 'ocvs', 'custom', 'exacc', 'exacs']) expect(environment).toContain(`value="${type}"`);
    expect(markup).toContain('Shared Platforms');
    expect(markup).toContain('Environment Platforms');
    expect(markup).not.toContain('Platform placement');
  });
  it('only shows Exadata cards after they have been added', () => {
    const markup = render(emptyLzModel());
    expect(markup).not.toContain('Include EXACC in this landing zone');
    expect(markup).not.toContain('Include EXACS in this landing zone');
    expect(markup).not.toContain('platform-section-title');
  });
  it('lists configured Exadata in the panel matching its infrastructure placement', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    model.exadata.exacc.shared = true;
    model.exadata.exacs.enabled = true;
    model.exadata.exacs.infrastructure = 'per_environment';
    const before = buildConfig(model);
    const [shared, environment] = render(model).split('Environment Platforms');
    expect(shared).toContain('aria-expanded="false"');
    expect(shared).toContain('>EXACC</span>');
    expect(shared).not.toContain('>EXACS</span>');
    expect(environment).toContain('>EXACS</span>');
    expect(environment).not.toContain('>EXACC</span>');
    expect(buildConfig(model)).toEqual(before);
  });
  it.each(['exacc', 'exacs'] as const)('shows shared %s with dedicated VMCs in both panels without changing its configuration', (type) => {
    const model = emptyLzModel();
    model.exadata[type].enabled = true;
    model.exadata[type].database = 'per_environment';
    model.exadata[type].environments = ['environment-1'];
    const before = buildConfig(model);
    const [shared, environment] = render(model).split('Environment Platforms');
    expect(shared).toContain(`>${type.toUpperCase()}</span>`);
    expect(environment).toContain(`>${type.toUpperCase()}</span>`);
    expect(buildConfig(model)).toEqual(before);
  });
  it.each(['exacc', 'exacs'] as const)('offers Delete for %s even when its cards are collapsed', (type) => {
    const model = emptyLzModel();
    model.exadata[type].enabled = true;
    model.exadata[type].database = 'per_environment';
    model.exadata[type].environments = ['environment-1'];
    const [shared, environment] = render(model).split('Environment Platforms');
    expect(shared).toContain(`aria-label="Delete ${type.toUpperCase()} platform from landing zone"`);
    expect(environment).toContain(`aria-label="Delete ${type.toUpperCase()} platform from landing zone"`);
  });
  it('starts saved platform cards collapsed', () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('oke_simple', [])];
    model.exadata.exacc.enabled = true;
    expect(render(model)).not.toMatch(/<details class="platform-section"[^>]*\bopen(?:=|[ >])/);
    expect(render(emptyLzModel())).not.toMatch(/<details class="platform-section"[^>]*\bopen(?:=|[ >])/);
    expect(render(model)).not.toContain('aria-expanded="true"');
  });
  it('marks a newly added OCVS with no SSH public key as needing attention', () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('ocvs', [], model.environments)];
    expect(platformReadiness(model, 'ocvs').status).toBe('Needs attention');
    expect(platformReadiness(model, 'ocvs').errors.join('\n')).toContain('SSH public key');
  });
  it('does not mark OKE without an environment as configured', () => {
    const model = emptyLzModel();
    model.platforms = [{ ...newPlatform('oke_simple', []), environments: [] }];
    expect(platformReadiness(model, 'oke_simple').status).toBe('Needs attention');
    expect(platformReadiness(model, 'oke_simple').errors.join('\n')).toContain('Select at least one environment');
  });
  it('marks complete OKE settings as configured', () => {
    const model = emptyLzModel();
    model.platforms = [newPlatform('oke_simple', [])];
    expect(platformReadiness(model, 'oke_simple').status).toBe('Configured');
  });
  it('marks enabled EXACC with no database service as needing attention', () => {
    const model = emptyLzModel();
    model.exadata.exacc.enabled = true;
    expect(render(model)).toContain('Needs attention');
  });
  it('keeps shared and environment custom networks visible without changing them', () => {
    const model = emptyLzModel();
    model.sharedPlatforms = [newSharedPlatform('custom', [])];
    model.platforms = [newPlatform('custom', [], model.environments)];
    const before = buildConfig(model);
    const markup = render(model);
    expect(markup).toContain('Shared Platforms');
    expect(markup).toContain('Environment Platforms');
    expect(markup).toContain(model.sharedPlatforms[0].key);
    expect(markup).toContain(model.platforms[0].key);
    expect(buildConfig(model)).toEqual(before);
  });
  it('checks shared OCVS credentials too', () => {
    const model = emptyLzModel();
    model.sharedPlatforms = [newSharedPlatform('ocvs', [])];
    expect(platformReadiness(model, 'ocvs').status).toBe('Needs attention');
    model.sharedPlatforms[0].ocvsParams!.sshAuthorizedKeys = 'ssh-rsa AAAATEST studio@example';
    expect(platformReadiness(model, 'ocvs').status).toBe('Configured');
    expect(platformReadiness(model, 'ocvs').errors).toEqual([]);
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
    expect(render(model)).toContain('Shared Platforms');
    expect(render(model)).toContain(platform.key);
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
  it('does not put custom networks in a separate legacy section', () => {
    expect(render(emptyLzModel())).not.toContain('Existing custom networks');
  });
});
