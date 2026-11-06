import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import { emptyHybridConnectivity, newVpn } from '../../services/hybridConnectivity';
import ReviewStep from './ReviewStep';

describe('Resource Manager deployment link', () => {
  it('summarizes enabled Bastion access and blocks downloads for an invalid client allowlist', () => {
    const model = emptyLzModel();
    model.foundation.notifications!.default = 'ops@example.com';
    model.bastion = { enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds: 3600 };
    const render = () => renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Bastion" /></WizardProvider></MemoryRouter>);
    expect(render()).toContain('Hub management subnet');
    const summary = render().split('Deploy with OCI Resource Manager')[0];
    expect(summary).not.toContain('Bastion access guide');
    expect(summary).not.toContain('Connect through OCI Bastion');
    expect(render().indexOf('After deployment')).toBeGreaterThan(render().indexOf('3. Update and apply phase 2'));
    expect(render()).toContain('Connect through OCI Bastion');
    expect(render()).not.toMatch(/<button[^>]*disabled[^>]*>Download files/);
    model.bastion.clientCidrs = '0.0.0.0/0';
    expect(render()).toContain('Access from 0.0.0.0/0 is not allowed.');
    expect(render()).toMatch(/<button[^>]*disabled[^>]*>Download files/);
    model.bastion.enabled = false;
    expect(render()).not.toContain('Connect through OCI Bastion');
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
