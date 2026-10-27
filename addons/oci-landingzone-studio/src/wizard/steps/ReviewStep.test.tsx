import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLzModel } from '../../model/defaults';
import { WizardProvider } from '../wizardContext';
import ReviewStep from './ReviewStep';
import { serializeConfig } from '../../services/lzConfig';

const stored = vi.hoisted(() => ({ outputs: {} as Record<string, { config: string; files: Record<string, string> }> }));
vi.mock('react-router-dom', async (original) => ({ ...await original<typeof import('react-router-dom')>(), useParams: () => ({ id: 'dr' }) }));
vi.mock('../../services/lzStore', async (original) => ({ ...await original<typeof import('../../services/lzStore')>(), getOutputs: (id: string) => stored.outputs[id] ?? null }));
beforeEach(() => { stored.outputs = {}; });

describe('Resource Manager deployment link', () => {
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
    model.foundation.region = 'eu-stockholm-1';
    stored.outputs.dr = { config: serializeConfig(model), files: Object.fromEntries([
      'network.json', 'security_cis2_pre.json', 'security_cis2.json', 'observability_cis2_pre.json', 'observability_cis2.json', 'oke_clusters.json',
    ].map((file) => [file, '{}'])) };
    const markup = renderToStaticMarkup(
      <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>,
    );
    const guidance = markup.indexOf('Before you start');
    expect(guidance).toBeGreaterThan(markup.indexOf('Deploy with OCI Resource Manager'));
    expect(markup).toContain('save_output');
    expect(markup).toContain('do not switch back to');
    expect(markup).toContain('compartments_output.json');
    expect(markup).toContain('oci_dependency_objects');
    expect(markup).not.toContain('url_dependency_source_oci_objects');
    expect(markup).toContain('These runtime output files are not included in the Studio ZIP.');
    expect(markup).toContain('one document for each top-level dependency block');
    expect(markup).toContain('Home and DR use separate stacks and state.');
    expect(markup).not.toContain('RPC is optional');
    expect(markup).not.toContain('If you add RPC');
    expect(markup).toContain('Home is the acceptor and DR is the requester');
    expect(markup).toContain('Add or update a DR connection as requester to Home');
    const dependencyStep = markup.slice(markup.indexOf('2. Use Home'), markup.indexOf('3. Finish and download'));
    expect(dependencyStep).toContain('<dl');
    expect(dependencyStep).toContain('References to the compartments created by Home.');
    expect(dependencyStep).toContain('Home network references, including the acceptor RPC.');
    expect(dependencyStep).toContain('aria-label="About Home dependency outputs"');
    const preparationStep = markup.slice(markup.indexOf('3. Finish and download'), markup.indexOf('4. Create the DR stack'));
    expect(preparationStep.indexOf('Configure RPC in Hub Network')).toBeLessThan(preparationStep.indexOf('Download and upload'));
    expect(preparationStep).toContain('aria-label="About Acceptor RPC reference"');
    expect(markup).toContain('home/network_output.json');
    expect(markup).toContain('Peered');
    expect(markup).toContain('class="required-setting-value">true</span>');
    expect(markup).toContain('Check configuration storage and replication');
    expect(markup).not.toContain('Use the same hub model');
    expect(markup).not.toContain('matching Home environment, project and platform names');
    expect(markup).not.toContain('Ensure Home defines every compartment');
    expect(markup).toContain('In Home’s Foundation step, set <strong>DR region</strong> to <code>eu-stockholm-1</code>');
    expect(markup.indexOf('In Home’s Foundation step')).toBeLessThan(markup.indexOf('Home is the acceptor'));
    expect(markup).toContain('Reuse Home’s private configuration bucket');
    expect(markup).toContain('Reuse its existing DR replica');
    expect(markup).not.toMatch(/\bassum(?:e|es|ing|ption)\b/i);
    expect(markup).not.toContain('The numbered steps below cover both starting points.');
    expect(markup).toContain('Console create any missing Object Storage service replication policy');
    expect(markup).not.toContain('aria-label="About Configuration storage and permissions"');
    expect(markup).not.toContain('What the LZ already creates');
    expect(markup).not.toContain('Home permission to read configurations');
    expect(markup).not.toContain('DR permission to read the replica');
    expect(markup).toContain('Enable versioning on the Home source');
    expect(markup).toContain('destination bucket in DR with versioning disabled and no retention rules');
    expect(markup).toContain('Home saves these JSON outputs automatically');
    expect(markup).toContain('no manual JSON transfer is needed');
    expect(markup).not.toContain('oci_configuration_bucket_region');
    expect(markup).not.toContain('updated package');
    expect(markup).toContain('read-only replica');
    expect(markup).toContain('new, unused output prefix');
    expect(markup).not.toContain('No copy is needed when both stacks use the same accessible bucket.');
    expect(markup).not.toContain('github_file_prefix');
    expect(markup).not.toContain('private GitHub source');
    const titles = [...markup.matchAll(/<h3[^>]*>(\d+)\. ([^<]+)<\/h3>/g)].map((match) => `${match[1]}. ${match[2]}`);
    expect(titles).toEqual([
      '1. Deploy Home Region', '2. Use Home’s saved outputs',
      '3. Finish and download DR files', '4. Create the DR stack', '5. First apply: DR prerequisites',
      '6. Second apply: controls and workloads', '7. Verify the connection',
    ]);
    expect(markup).not.toContain('Create and run the stack');
    expect(markup).not.toContain('1. Create the landing zone');
    expect(markup).not.toContain('<ol');
    const finish = markup.indexOf('3. Finish and download DR files');
    const create = markup.indexOf('4. Create the DR stack');
    const firstApply = markup.indexOf('5. First apply: DR prerequisites');
    const finalApply = markup.indexOf('6. Second apply: controls and workloads');
    expect(finish).toBeLessThan(create);
    expect(markup.slice(finish, create)).toContain('in the Home source bucket');
    expect(markup.slice(finish, create)).toContain('do not upload directly to the read-only replica');
    expect(create).toBeLessThan(firstApply);
    expect(markup.slice(create, firstApply)).toContain('Deploy to OCI');
    expect(markup.slice(create, firstApply)).toContain('to the DR replica bucket');
    expect(markup.slice(create, firstApply)).toContain('Home output paths from step 2');
    expect(markup.slice(create, firstApply)).toContain('class="required-setting-value">false</span>');
    const creationLink = markup.slice(create, firstApply).match(/href="([^"]+)"/);
    const creationUrl = new URL(creationLink![1].replace(/&amp;/g, '&'));
    expect(creationUrl.searchParams.get('zipUrl')).toBe('https://github.com/oci-landing-zones/terraform-oci-modules-orchestrator/archive/refs/tags/v2.2.0.zip');
    expect(markup.slice(firstApply, finalApply)).toContain('dr/security_cis2_pre.json');
    expect(markup.slice(firstApply, finalApply)).not.toContain('dr/security_cis2.json');
    expect(markup.slice(finalApply)).toContain('dr/security_cis2.json');
    expect(markup.slice(finalApply)).not.toContain('dr/security_cis2_pre.json');
    expect(markup.slice(finalApply)).toContain('dr/oke_clusters.json');
  });

  it('does not present incomplete or stale files as a complete DR deployment list', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    stored.outputs.dr = { config: 'old design', files: { 'network.json': '{}', 'obsolete_workload.json': '{}' } };
    const markup = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>);
    expect(markup).toContain('current Blueprint Factory preview is preparing');
    expect(markup).not.toContain('dr/obsolete_workload.json');
    expect(markup).not.toContain('dr/security_cis2_pre.json');
  });

  it('lists current factory filenames for both applies before a ZIP download, replacing stale cached lists', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    stored.outputs.dr = { config: serializeConfig(model), files: { 'network.json': '{}', 'obsolete_workload.json': '{}' } };
    const files = ['network.json', 'security_cis2_pre.json', 'security_cis2.json', 'future_workload.json'];
    const markup = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" generatedFiles={files} /></WizardProvider></MemoryRouter>);
    const first = markup.slice(markup.indexOf('5. First apply'), markup.indexOf('6. Second apply'));
    const second = markup.slice(markup.indexOf('6. Second apply'));
    expect(first).toContain('dr/security_cis2_pre.json');
    expect(first).not.toContain('dr/future_workload.json');
    expect(second).toContain('dr/security_cis2.json');
    expect(second).toContain('dr/future_workload.json');
    expect(second).not.toContain('dr/security_cis2_pre.json');
    expect(markup).not.toContain('dr/obsolete_workload.json');
    expect(markup).not.toContain('preview is preparing');
  });

  it('keeps Hub C and mixed RPC roles in the same sequence, using generated CIS1 workloads', () => {
    const model = emptyLzModel();
    Object.assign(model.foundation, { stackScope: 'regional', homeRegion: 'eu-frankfurt-1', region: 'eu-amsterdam-1', regionShortName: 'ams', cisLevel: 1 });
    model.network.hubKind = 'hub_c';
    model.remotePeeringConnections = [
      { id: 'requester', name: 'home', role: 'requester', peerRegionName: 'eu-frankfurt-1', remoteCidrs: ['172.20.0.0/16'], peerId: 'RPC-HOME-KEY' },
      { id: 'acceptor', name: 'return', role: 'acceptor', peerRegionName: 'eu-frankfurt-1', remoteCidrs: ['172.21.0.0/16'] },
    ];
    stored.outputs.dr = { config: serializeConfig(model), files: Object.fromEntries([
      'network.json', 'network_backends.json', 'security_cis1_pre.json', 'security_cis1.json', 'observability_cis1_pre.json', 'observability_cis1.json', 'future_workload.json',
    ].map((file) => [file, '{}'])) };
    const markup = renderToStaticMarkup(<MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>);
    const titles = [...markup.matchAll(/<h3[^>]*>(\d+)\. ([^<]+)<\/h3>/g)].map((match) => Number(match[1]));
    expect(titles).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(markup).toContain('both acceptor and requester connections');
    expect(markup).toContain('Keep DR acceptors as acceptors');
    expect(markup).toContain('home/network_output.json');
    expect(markup).not.toContain('dr/network_output.json');
    expect(markup).toContain('literal RPC OCID needs no DR network-output JSON or reverse replication');
    expect(markup).toContain('dr/future_workload.json');
    expect(markup).toContain('dr/security_cis1_pre.json');
    expect(markup).not.toContain('dr/network_backends.json');
    expect(markup).not.toContain('<ol');
    expect(markup.indexOf('Prepare Hub C firewall backends')).toBeLessThan(markup.indexOf('8. Verify the connection'));
  });

  it('links directly to Home Review inside a hosted app basename instead of repeating its deployment procedure', () => {
    const home = emptyLzModel();
    stored.outputs.home = { config: serializeConfig(home), files: Object.fromEntries([
      'iam.json', 'governance.json', 'network.json', 'security_cis2_pre.json', 'security_cis2.json', 'oke_workers.json',
    ].map((file) => [file, '{}'])) };
    const dr = structuredClone(home);
    Object.assign(dr.foundation, { stackScope: 'regional', homeRegion: home.foundation.region, region: 'eu-amsterdam-1', regionShortName: 'ams' });
    const markup = renderToStaticMarkup(<MemoryRouter basename="/studio" initialEntries={['/studio/lz/dr']}><WizardProvider initialModel={dr} homeSource={{ id: 'home', model: home }}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>);
    const homeStep = markup.slice(markup.indexOf('1. Deploy Home Region'), markup.indexOf('2. Use Home'));
    expect(homeStep).toContain('Open Home Region Review');
    expect(homeStep).toContain('href="/studio/lz/home?step=review"');
    expect(homeStep).not.toContain('Deploy to OCI');
    expect(homeStep).not.toContain('iam.json');
    expect(homeStep).toContain('Home is the acceptor and DR is the requester');
    expect(homeStep).toContain('Check configuration storage and replication');
    expect(homeStep).toContain('save_output');
    expect(homeStep).toContain('Before applying Home');
    expect(homeStep).not.toContain('Configuration storage and permissions');
    expect(markup).toContain('If Home is already deployed, update its existing ORM stack');
  });

  it('uses a literal RPC OCID for a Home requester without a return dependency file', () => {
    const model = emptyLzModel();
    model.foundation.stackScope = 'regional';
    model.foundation.homeRegion = 'eu-frankfurt-1';
    model.remotePeeringConnections = [{ id: 'home', name: 'home', role: 'acceptor', peerRegionName: 'eu-frankfurt-1', remoteCidrs: ['10.2.0.0/21'] }];
    const markup = renderToStaticMarkup(
      <MemoryRouter><WizardProvider initialModel={model}><ReviewStep designName="DR" /></WizardProvider></MemoryRouter>,
    );
    expect(markup).toContain('home/compartments_output.json');
    expect(markup).not.toContain('home/network_output.json');
    expect(markup).toContain('DR is the acceptor and Home is the requester');
    expect(markup).not.toContain('dr/network_output.json');
    expect(markup).toContain('Keep DR output saving disabled');
    expect(markup).toContain('Complete the Home requester');
    expect(markup).not.toContain('Home is the acceptor and DR is the requester');
    expect(markup).not.toContain('Set DR to requester');
    expect(markup).toContain('Peered');
    const titles = [...markup.matchAll(/<h3[^>]*>(\d+)\. ([^<]+)<\/h3>/g)].map((match) => Number(match[1]));
    expect(titles).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
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
    expect(markup).not.toContain('Before you start');
    expect(markup).toContain('Create and run the stack');
    expect(markup).not.toContain('The Orchestrator resolves OCI Network Firewall route targets');
  });
});
