import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import { emptyHybridConnectivity, newVpn } from '../../services/hybridConnectivity';
import ReviewStep from './ReviewStep';
import { serializeConfig } from '../../services/lzConfig';
import { defaultCostGovernance } from '../../services/costGovernance';

const stored = vi.hoisted(() => ({ outputs: {} as Record<string, { config: string; files: Record<string, string> }> }));
vi.mock('react-router-dom', async (original) => ({ ...await original<typeof import('react-router-dom')>(), useParams: () => ({ id: 'dr' }) }));
vi.mock('../../services/lzStore', async (original) => ({ ...await original<typeof import('../../services/lzStore')>(), getOutputs: (id: string) => stored.outputs[id] ?? null }));
beforeEach(() => { stored.outputs = {}; });

describe('Resource Manager deployment link', () => {
  it('shows Home before Primary as separate stacks and hands off only compartment dependencies', () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { tenancyHomeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams', deploymentMode: 'primary-only' });
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Two stacks" generatedFiles={['iam.json', 'governance.json', 'network.json', 'security_cis1_pre.json', 'security_cis1.json', 'future_workload.json']} /></WizardProvider></MemoryRouter>);
    expect(html).toContain('Home + Primary (two stacks)');
    expect(html).toContain('home_fra/');
    expect(html).toContain('primary_ams/');
    expect(html.indexOf('1. Deploy Home')).toBeLessThan(html.indexOf('2. Deploy Primary'));
    const home = html.slice(html.indexOf('aria-label="Home stack deployment"'), html.indexOf('aria-label="Primary stack deployment"'));
    expect(home).toContain('iam.json');
    expect(home).toContain('governance.json');
    expect(home).not.toContain('network.json');
    const primary = html.slice(html.indexOf('aria-label="Primary stack deployment"'));
    expect(primary).toContain('network.json');
    expect(primary).toContain('future_workload.json');
    expect(primary).toContain('security_cis1.json');
    expect(primary).not.toContain('security_cis1_pre.json');
    expect(primary).toContain('local_dependency_file_paths');
    expect(primary).toContain('oci_dependency_objects');
    expect(html).toContain('compartments_output.json');
    expect(html).not.toContain('network_output.json');
    expect(html).not.toContain('Follow these steps in order, using the same stack for both phases.');
    expect(html).toContain('new installation');
    expect(html).toContain('oci.home');
  });

  it('describes a third Secondary stack with compartment and network outputs from their actual owners', () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { tenancyHomeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams', deploymentMode: 'primary-secondary', drRegion: 'eu-madrid-1' });
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Three stacks" /></WizardProvider></MemoryRouter>);
    expect(html).toContain('Home + Primary + Secondary (three stacks)');
    expect(html).toContain('3. Deploy Secondary');
    expect(html.indexOf('2. Deploy Primary')).toBeLessThan(html.indexOf('3. Deploy Secondary'));
    expect(html).toContain('network_output.json');
    expect(html).toContain('separate linked design and ZIP');
    expect(html).toContain('for Secondary');
    const home = html.slice(html.indexOf('aria-label="Home stack deployment"'), html.indexOf('aria-label="Primary stack deployment"'));
    expect(home).not.toContain('network_output.json');
  });

  it.each(['requester', 'acceptor'] as const)('shows Primary RPC %s runtime settings in the split deployment guide', (role) => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { tenancyHomeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams' });
    model.remotePeeringConnections = [{ id: 'peer', name: 'peer', role, ...(role === 'requester' ? { peerId: 'RPC-REMOTE-KEY' } : {}), peerRegionName: 'eu-madrid-1', remoteCidrs: ['172.20.0.0/16'] }];
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="RPC stacks" /></WizardProvider></MemoryRouter>);
    const primary = html.slice(html.indexOf('aria-label="Primary stack deployment"'));
    expect(primary).toContain('network_output.json');
    expect(primary).toContain(role === 'requester' ? 'external RPC acceptor' : 'for RPC requesters');
    if (role === 'requester') expect(primary).toContain('local_dependency_file_paths');
    else expect(primary).toContain('save_output');
  });

  it('shows a recoverable cost-center error and blocks download after an environment is deleted', () => {
    const model = emptyLzModel();
    model.foundation.costGovernance = { ...defaultCostGovernance(), costCenterFilters: {
      CC12345: { platform: null, environment: ['environment:deleted'], project: null },
    } };
    const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Recoverable design" /></WizardProvider></MemoryRouter>);
    expect(html).toContain('selected environment is no longer available');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Download files<\/button>/);
  });
  it('uses current factory files instead of cached files while retaining Hub C backend selection', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.network.hubKind = 'hub_c';
    stored.outputs.dr = { config: serializeConfig(model), files: { 'network_backends.json': '{}', 'obsolete_workload.json': '{}' } };
    const files = ['network.json', 'network_backends.json', 'security_cis2_pre.json', 'security_cis2.json', 'future_workload.json'];
    const markup = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" generatedFiles={files} /></WizardProvider></MemoryRouter>);
    const first = markup.slice(markup.indexOf('2. Create and apply'), markup.indexOf('3. Update and apply phase 2'));
    const second = markup.slice(markup.indexOf('3. Update and apply phase 2'));
    expect(first).toContain('network.json');
    expect(first).toContain('security_cis2.json');
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
    expect(markup.indexOf('Open primary deployment Review')).toBeGreaterThan(markup.indexOf('1. Prepare the files'));
    expect(markup.indexOf('Open primary deployment Review')).toBeLessThan(markup.indexOf('2. Create and apply'));
  });

  it('summarizes enabled Bastion access and blocks downloads for an invalid client allowlist', () => {
    const model = emptyLzModel();
    model.foundation.costGovernance!.recipients = 'finops@example.com';
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
    const guidance = markup.indexOf('Deploy the primary deployment stack first with matching compartments, project and platform IAM, and governance.');
    expect(guidance).toBeGreaterThan(markup.indexOf('1. Prepare the files'));
    expect(guidance).toBeLessThan(markup.indexOf('2. Create and apply'));
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
    expect(url.searchParams.get('zipUrl')).toBe('https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.4.1.zip');
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
  expect(html).toContain('Deploy the primary deployment stack first');
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
  const model = emptyLzModel();
  model.foundation.sharedNetworkSecurityZone = true;
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Home" /></WizardProvider></MemoryRouter>);
  const prepare = html.indexOf('1. Prepare the files');
  const create = html.indexOf('2. Create and apply');
  const firstInputs = html.indexOf('>security_cis1_pre.json</code>');
  const firstApply = html.indexOf('Select Create');
  const update = html.indexOf('3. Update and apply phase 2');
  const finalInputs = html.indexOf('>security_cis1.json</code>');
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

it('distinguishes deployment filenames from settings and omits design-source explanations', () => {
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={emptyLzModel()}><ReviewStep designName="Home" /></WizardProvider></MemoryRouter>);
  const cli = html.split('Terraform CLI or CI/CD alternative')[1];
  for (const text of ['local_config_file_paths', 'tenancy_ocid', 'region']) {
    expect(cli).toContain(`<span class="required-setting-name">${text}</span>`);
  }
  for (const text of ['rms-facade', 'terraform init',
    'terraform plan -var-file=deployment.tfvars -out=deployment.tfplan', 'terraform apply deployment.tfplan']) {
    expect(cli).toContain(`<code class="deployment-code">${text}</code>`);
  }
  expect(cli).toContain('<span class="required-setting-value">&quot;file&quot;</span>');
  expect(cli).toContain('<code class="deployment-file">deployment.tfvars</code>');
  expect(html).toContain('<code class="deployment-file">network.json</code>');
  expect(html).toContain('<ul class="deployment-files" aria-label="Deployment files"><li><code class="deployment-file">');
  expect(html).not.toContain('3. Update and apply phase 2');
  expect(html).not.toContain('config.jsonnet');
  expect(cli).not.toContain('`');
});

it('renders boolean settings consistently in the deployment instructions', () => {
  const model = emptyLzModel();
  model.foundation.drRegion = 'eu-amsterdam-1';
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Home" /></WizardProvider></MemoryRouter>);
  expect(html).toContain('<span class="required-setting-name">save_output</span><span class="required-setting-equals"> = </span><span class="required-setting-value">true</span>');
});

it('uses only final files and one apply for the default Recipe 01-only design', () => {
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={emptyLzModel()}><ReviewStep designName="Baseline" /></WizardProvider></MemoryRouter>);
  expect(html).toContain('2. Create and apply');
  expect(html).toContain('security_cis1.json');
  expect(html).not.toContain('security_cis1_pre.json');
  expect(html).not.toContain('Update and apply phase 2');
  expect(html).not.toContain('with the phase 2 list');
});

it('summarizes Recipe 01 and only selected additional zones before deployment', () => {
  const model = emptyLzModel();
  model.foundation.cisLevel = 2;
  model.foundation.sharedNetworkSecurityZone = true;
  model.environments[0].securityZone = true;
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Zones" /></WizardProvider></MemoryRouter>);
  const summary = html.split('Deploy with OCI Resource Manager')[0];
  expect(summary).toContain('Security Zone Recipe 01');
  expect(summary).toContain('On · CIS Level 2');
  expect(summary).toContain('Legacy shared-network zone');
  expect(summary).not.toContain('Recipe 02 — Shared network');
  expect(summary).toContain('Recipe 02 — prod');
  expect(summary).not.toContain('Recipe 02 — preprod');
});

it('reports disabled Recipe 01 and no additional zones in the summary', () => {
  const model = emptyLzModel();
  model.foundation.landingZoneSecurityZone = false;
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="No zones" /></WizardProvider></MemoryRouter>);
  expect(html).toMatch(/Security Zone Recipe 01<\/dt><dd[^>]*>Off<\/dd>/);
  expect(html).toMatch(/Additional Security Zones<\/dt><dd[^>]*>None<\/dd>/);
});

it('uses the linked Primary settings for DR Security Zone summaries', () => {
  const primary = emptyLzModel();
  primary.foundation.landingZoneSecurityZone = false;
  primary.environments[0].securityZone = true;
  const dr = emptyLzModel();
  dr.foundation.stackScope = 'regional';
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={dr} homeSource={{ id: 'primary', model: primary }}><ReviewStep designName="DR zones" /></WizardProvider></MemoryRouter>);
  expect(html).toContain('Primary: Off');
  expect(html).toContain('Primary: Recipe 02 — prod');
});

it('explains the extra applies when an environment Security Zone is selected', () => {
  const model = emptyLzModel(); model.environments[0].securityZone = true;
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="Environment zones" /></WizardProvider></MemoryRouter>);
  expect(html).toContain('before enabling additional environment Security Zones');
  expect(html).toContain('Never include both security files');
  expect(html).toContain('security_cis1_pre.json');
  expect(html).toContain('security_cis1.json');
  expect(html).toContain('Update and apply phase 2');
});

it('asks to regenerate and reapply when a saved deployment configuration changes', () => {
  const previous = emptyLzModel();
  stored.outputs.dr = { config: serializeConfig(previous), files: { 'network.json': '{}' } };
  const changed = structuredClone(previous); changed.foundation.vulnerabilityScanningEnabled = false;
  const html = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={changed}><ReviewStep designName="Changed VSS" /></WizardProvider></MemoryRouter>);
  expect(html).toContain('Files out of date.');
  expect(html).toContain('If already deployed, review a Terraform plan and reapply the affected stacks');
  expect(html).toContain('Studio does not check live OCI deployment status');
});
