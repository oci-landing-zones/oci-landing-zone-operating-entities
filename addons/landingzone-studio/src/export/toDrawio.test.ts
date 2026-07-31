import { describe, expect, it } from 'vitest';
import { toDrawioXml } from './toDrawio';
import { buildGraph } from '../diagram/buildGraph';
import { emptyLzModel } from '../model/defaults';
import { newPlatform } from '../services/platforms';
import type { DiagramModel, LzModel } from '../model/types';

describe('toDrawioXml', () => {
  it('wraps the graph in a valid mxfile/diagram/mxGraphModel structure', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel()));
    expect(xml).toContain('<mxfile');
    expect(xml).toContain('<diagram');
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('<mxCell id="0" />');
    expect(xml).toContain('<mxCell id="1" parent="0" />');
  });

  it('nests region → tenancy → landing zone → compartment via parent', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel()));
    expect(xml).toContain('container=1;');
    expect(xml).toMatch(/id="region"[^>]*parent="1"/);
    expect(xml).toMatch(/id="tenancy"[^>]*parent="region"/);
    expect(xml).toMatch(/id="landingzone"[^>]*parent="tenancy"/);
    expect(xml).toMatch(/id="cmp-network"[^>]*parent="landingzone"/);
    // shared compartments are yellow, environment compartments green
    expect(xml).toContain('#FCF3CF');
    expect(xml).toContain('#E3F3E3');
  });

  it('adds a Security Zone shield image to secure compartments only', () => {
    // default model: prod is a Security Zone, preprod/dev are not
    const xml = toDrawioXml(buildGraph(emptyLzModel()));
    expect(xml).toContain('id="cmp-env-0-shield"');   // prod
    expect(xml).toContain('shape=image;');
    expect(xml).not.toContain('id="cmp-env-1-shield"'); // preprod
  });

  it('renders subnets with coloured name/CIDR lines and a route-table icon', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 3)); // spoke subnets appear in step 3
    // two-line HTML label: name + CIDR in different colours
    expect(xml).toContain('&lt;font color=&quot;#AA5C32&quot;&gt;');
    expect(xml).toContain('&lt;font color=&quot;#3B5BA9&quot;&gt;');
    // one route-table image per subnet (6 hub + 4 per environment × 3 envs)
    const rtCells = xml.match(/id="[^"]*-rt"/g) ?? [];
    expect(rtCells).toHaveLength(18);
  });

  it('renders the three gateways and the firewall/LB subnet icons + captions', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 2));
    expect(xml).toMatch(/id="gw-igw"[^>]*parent="cmp-network"/);
    expect(xml).toMatch(/id="gw-natgw"/);
    expect(xml).toMatch(/id="gw-sgw"/);
    expect(xml).toContain('Internet Gateway');
    // firewall icons in the two fw subnets + LB icon, with captions
    expect(xml).toContain('id="hub-vcn-sn-0-icon"');
    expect(xml).toContain('nfw-fra-hub-dmz');
    expect(xml).toContain('id="hub-vcn-sn-1-icon"');
    expect(xml).toContain('Load Balancer');
    expect(xml).toContain('nfw-fra-hub-int');
    // plain subnets get no icon cell
    expect(xml).not.toContain('id="hub-vcn-sn-3-icon"');
  });

  it('renders the DRG, a VCN-attachment per VCN, an OSN glyph per VCN, and routing edges', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 3)); // spoke VCNs + their attachments appear in step 3
    // single DRG inside the network compartment
    expect(xml).toMatch(/id="drg"[^>]*parent="cmp-network"/);
    // one OSN glyph per VCN (1 hub + 3 env)
    const osnCells = xml.match(/id="[^"]*-osn"/g) ?? [];
    expect(osnCells).toHaveLength(4);
    // every attachment pill clusters with the DRG inside cmp-network
    expect(xml).toMatch(/id="attach-hub"[^>]*parent="cmp-network"/);
    expect(xml).toMatch(/id="attach-cmp-env-0"[^>]*parent="cmp-network"/);
    expect(xml).toContain('vcn-hub-attach');
    expect(xml).toContain('vcn-prod-attach');
    // VCN → attach → DRG edges, no arrowheads
    expect(xml).toContain('source="hub-vcn" target="attach-hub"');
    expect(xml).toContain('source="attach-hub" target="drg"');
    expect(xml).toContain('endArrow=none;');
    // every environment VCN gets its own Service Gateway
    expect(xml).toMatch(/id="cmp-env-0-sgw"[^>]*parent="cmp-env-0-network"/);
  });

  it('exports VM endpoint cells only when the endpoints layer is on, icon-less subnets only', () => {
    // endpoints belong to the step-3 spoke layer — none at step 2 even with the flag
    expect(toDrawioXml(buildGraph(emptyLzModel(), 2, { showEndpoints: true }))).not.toContain('-ep-icon"');
    // off → no endpoint cells
    expect(toDrawioXml(buildGraph(emptyLzModel(), 3))).not.toContain('-ep-icon"');
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 3, { showEndpoints: true }));
    // hub mgmt subnet gets a VM glyph + name + IP
    expect(xml).toContain('id="hub-vcn-sn-3-ep-icon"');
    expect(xml).toContain('vm-mgmt');
    expect(xml).toContain('10.0.3.10');
    // spoke subnet too — env-scoped name for uniqueness
    expect(xml).toContain('id="cmp-env-0-vcn-sn-0-ep-icon"');
    expect(xml).toContain('vm-prod-web');
    // firewall / LB subnets stay endpoint-free
    expect(xml).not.toContain('id="hub-vcn-sn-0-ep-icon"');
    expect(xml).not.toContain('id="hub-vcn-sn-1-ep-icon"');
  });

  it('renders the gray projects compartment + project blocks (step 3)', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 3));
    // a projects compartment nested in each env compartment
    expect(xml).toMatch(/id="cmp-env-0-projects"[^>]*parent="cmp-env-0"/);
    // a project block inside it
    expect(xml).toMatch(/id="cmp-env-0-proj-0"[^>]*parent="cmp-env-0-projects"/);
    expect(xml).toContain('project-1');
    // none of this before step 3
    expect(toDrawioXml(buildGraph(emptyLzModel(), 2))).not.toContain('-projects"');
  });

  it('renders the shared platform row + env platform VCNs with subnets (step 4)', () => {
    const base = emptyLzModel();
    const m: LzModel = { ...base, platforms: [{ ...newPlatform('oke_simple', []), id: 'oke', name: 'oke' }] };
    // none of this before step 4
    expect(toDrawioXml(buildGraph(m, 3))).not.toContain('-platforms"');
    const xml = toDrawioXml(buildGraph(m, 4));
    // shared platform compartment outside the environments
    expect(xml).toMatch(/id="cmp-shared-platform"[^>]*parent="landingzone"/);
    // a platforms compartment nested in each env, holding a platform VCN
    expect(xml).toMatch(/id="cmp-env-0-platforms"[^>]*parent="cmp-env-0"/);
    expect(xml).toMatch(/id="cmp-env-0-plat-0"[^>]*parent="cmp-env-0-platforms"/);
    // the platform VCN's subnets are nested inside it
    expect(xml).toMatch(/id="cmp-env-0-plat-0-sn-0"[^>]*parent="cmp-env-0-plat-0"/);
    expect(xml).toContain('int-lb');
    expect(xml).toContain('10.140.0.0/25');
  });

  it('maps an animated edge to draw.io flowAnimation', () => {
    const diagram: DiagramModel = {
      nodes: [],
      edges: [{ id: 'e1', source: 'a', target: 'b', label: 'flow', animated: true }],
    };
    const xml = toDrawioXml(diagram);
    expect(xml).toContain('flowAnimation=1;');
    expect(xml).toContain('edge="1"');
    expect(xml).toContain('source="a"');
    expect(xml).toContain('target="b"');
  });

  it('escapes XML-significant characters in labels', () => {
    const diagram: DiagramModel = {
      nodes: [{ id: 'n1', kind: 'vcn', label: 'A & B <co>', x: 0, y: 0, width: 100, height: 40 }],
      edges: [],
    };
    const xml = toDrawioXml(diagram);
    expect(xml).toContain('A &amp; B &lt;co&gt;');
    expect(xml).not.toContain('A & B <co>');
  });

  it('renders multi-line node labels with a line break entity', () => {
    const diagram: DiagramModel = {
      nodes: [{ id: 'n1', kind: 'vcn', label: 'hub-vcn\n10.0.0.0/21', x: 0, y: 0, width: 100, height: 40 }],
      edges: [],
    };
    const xml = toDrawioXml(diagram);
    expect(xml).toContain('hub-vcn&#10;10.0.0.0/21');
  });
});
