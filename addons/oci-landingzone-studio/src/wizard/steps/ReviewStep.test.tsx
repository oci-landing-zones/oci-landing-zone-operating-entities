import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import { emptyHybridConnectivity, newVpn } from '../../services/hybridConnectivity';
import ReviewStep from './ReviewStep';
import { serializeConfig } from '../../services/lzConfig';

const stored = vi.hoisted(() => ({ outputs: {} as Record<string, { config: string; files: Record<string, string> }> }));
vi.mock('react-router-dom', async (original) => ({ ...await original<typeof import('react-router-dom')>(), useParams: () => ({ id: 'dr' }) }));
vi.mock('../../services/lzStore', async (original) => ({ ...await original<typeof import('../../services/lzStore')>(), getOutputs: (id: string) => stored.outputs[id] ?? null }));
beforeEach(() => { stored.outputs = {}; });

describe('Resource Manager deployment link', () => {
  it('uses current factory files instead of cached files while retaining Hub C backend selection', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.network.hubKind = 'hub_c';
    stored.outputs.dr = { config: serializeConfig(model), files: { 'network_backends.json': '{}', 'obsolete_workload.json': '{}' } };
    const files = ['network.json', 'network_backends.json', 'security_cis2_pre.json', 'security_cis2.json', 'future_workload.json'];
    const markup = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" generatedFiles={files} /></WizardProvider></MemoryRouter>);
    const first = markup.slice(markup.indexOf('2. Create and apply phase 1'), markup.indexOf('3. Update and apply phase 2'));
    const second = markup.slice(markup.indexOf('3. Update and apply phase 2'));
    expect(first).toContain('network.json');
    expect(first).toContain('security_cis2_pre.json');
    expect(first).not.toContain('future_workload.json');
    expect(second).toContain('network_backends.json');
    expect(second).toContain('future_workload.json');
    expect(second).not.toContain('security_cis2_pre.json');
    expect(markup).not.toContain('obsolete_workload.json');
  });

  it('links to Home Review under the hosted app basename within the common deployment sequence', () => {
    const home = emptyLzModel();
    const dr = structuredClone(home);
    Object.assign(dr.foundation, { stackScope: 'regional', homeRegion: home.foundation.region, region: 'eu-amsterdam-1', regionShortName: 'ams' });
    const markup = renderToStaticMarkup(<MemoryRouter basename="/studio" initialEntries={['/studio/lz/dr']}><WizardProvider initialModel={dr} homeSource={{ id: 'home', model: home }}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>);
    expect(markup).toContain('href="/studio/lz/home?step=review"');
    expect(markup.indexOf('Open Home Region Review')).toBeGreaterThan(markup.indexOf('1. Prepare the files'));
    expect(markup.indexOf('Open Home Region Review')).toBeLessThan(markup.indexOf('2. Create and apply phase 1'));
  });

  it('blocks generation when a custom region short name is invalid', () => {
    const model = emptyLzModel();
    model.foundation.regionShortName = 'long';
    const markup = renderToStaticMarkup(
      <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Invalid" /></WizardProvider></MemoryRouter>,
    );
    expect(markup).toContain('Use 3 characters or fewer for the region short name.');
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Download files/);
  });

  it('places Home dependencies in the regional deployment steps', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    const markup = renderToStaticMarkup(
      <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>,
    );
    const guidance = markup.indexOf('Deploy the Home Region stack first with matching compartments, project and platform IAM, and governance.');
    expect(guidance).toBeGreaterThan(markup.indexOf('1. Prepare the files'));
    expect(guidance).toBeLessThan(markup.indexOf('2. Create and apply phase 1'));
  });

  it('opens stack creation with the pinned orchestrator and private-bucket source', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <WizardProvider initialModel={emptyLzModel()}>
          <ReviewStep designName="Landing Zone" />
        </WizardProvider>
      </MemoryRouter>,
    );
    const link = markup.match(/<a[^>]+href="([^"]+)"[^>]*>Deploy to OCI(?: ↗)?<\/a>/);
    expect(link, 'Review must offer a Deploy to OCI link').not.toBeNull();
    const url = new URL(link![1].replace(/&amp;/g, '&'));

    expect(`${url.origin}${url.pathname}`).toBe('https://cloud.oracle.com/resourcemanager/stacks/create');
    expect(url.searchParams.get('zipUrl')).toBe('https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.2.0.zip');
    expect(JSON.parse(url.searchParams.get('zipUrlVariables')!)).toEqual({ configuration_source: 'ocibucket' });
    expect(markup).not.toContain('Hub routing');
    expect(markup).not.toContain('The Orchestrator resolves OCI Network Firewall route targets');
  });
});

it('explains deployment and the applicable external handover inside Studio', () => {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.ipsecs.office = newVpn('office');
  const render = () => renderToStaticMarkup(
    <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Landing Zone" /></WizardProvider></MemoryRouter>,
  );
  const vpn = render();
  expect(vpn).toContain('terraform init');
  expect(vpn).toContain('Use the existing stack and Terraform state.');
  expect(vpn).toContain('obtain both Oracle tunnel endpoints and their keys from OCI.');
  expect(vpn).not.toContain('complete the provider activation or physical connection work');
  expect(vpn).toContain('>Deploy to OCI');
  expect(vpn).toContain('Deploy with OCI Resource Manager');
  expect(vpn).not.toContain('incompatible provider constraint');
  delete hybrid.ipsecs.office;
  hybrid.fast_connect_virtual_circuits.primary = { type: 'PRIVATE' };
  const fc = render();
  expect(fc).toContain('complete the provider activation or physical connection work');
  expect(fc).not.toContain('obtain both Oracle tunnel endpoints and their keys from OCI.');
  delete hybrid.fast_connect_virtual_circuits.primary;
  hybrid.cross_connect_groups.primary = { cross_connects: {} };
  expect(render()).toContain('complete cabling and activation before adding circuits');
});

it.each([1, 2] as const)('retains Home prerequisites for CIS%d DR with connectivity', (cisLevel) => {
  const model = emptyLzModel();
  model.foundation.stackScope = 'regional';
  model.foundation.cisLevel = cisLevel;
  model.hybridConnectivity = emptyHybridConnectivity();
  model.hybridConnectivity.ipsecs.office = newVpn('office');
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>);
  expect(html).toContain('Deploy the Home Region stack first');
  expect(html.replace(/<[^>]*>/g, '')).toContain('compartments_output.json and network_output.json');
  expect(html).toContain('oci_dependency_objects');
  expect(html.includes('encryption keys')).toBe(cisLevel === 2);
});

it('lists the Hub C backend network in phase 2 and identifies preliminary file lists', () => {
  const model = emptyLzModel();
  model.network.hubKind = 'hub_c';
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Hub C" /></WizardProvider></MemoryRouter>);
  const phase2 = html.split('exactly these phase 2 files')[1].split('Save the updated variables')[0];
  expect(phase2).toContain('network_backends.json');
  expect(phase2).not.toContain('>network.json</code>');
  expect(html).toContain('File lists are a preview');
});

it('shows each phase input list before its apply action and keeps unrelated alternatives out of Home', () => {
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={emptyLzModel()}><ReviewStep designName="Home" /></WizardProvider></MemoryRouter>);
  const prepare = html.indexOf('1. Prepare the files');
  const create = html.indexOf('2. Create and apply phase 1');
  const firstInputs = html.indexOf('>security_cis2_pre.json</code>');
  const firstApply = html.indexOf('Select Create');
  const update = html.indexOf('3. Update and apply phase 2');
  const finalInputs = html.indexOf('>security_cis2.json</code>');
  const finalApply = html.indexOf('Save the updated variables');
  expect(prepare).toBeGreaterThan(-1);
  expect(create).toBeGreaterThan(prepare);
  expect(firstInputs).toBeGreaterThan(create);
  expect(firstApply).toBeGreaterThan(firstInputs);
  expect(update).toBeGreaterThan(firstApply);
  expect(finalInputs).toBeGreaterThan(update);
  expect(finalApply).toBeGreaterThan(finalInputs);
  expect(html).not.toContain('compartments_output.json');
  expect(html).not.toContain('local_dependency_file_paths');
  expect(html).not.toContain('Complete external setup');
  expect(html).not.toContain('Hub C firewall');
  expect(html).not.toContain('README.txt');
});

it('highlights CLI commands, variables and filenames using the deployment code style', () => {
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={emptyLzModel()}><ReviewStep designName="Home" /></WizardProvider></MemoryRouter>);
  const cli = html.split('Terraform CLI or CI/CD alternative')[1];
  for (const text of ['rms-facade', 'deployment.tfvars', 'local_config_file_paths', 'tenancy_ocid', 'region', 'terraform init',
    'terraform plan -var-file=deployment.tfvars -out=deployment.tfplan', 'terraform apply deployment.tfplan']) {
    expect(cli).toContain(`<code class="required-setting">${text}</code>`);
  }
  expect(cli).not.toContain('`');
});
