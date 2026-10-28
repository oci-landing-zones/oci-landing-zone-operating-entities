import { describe, expect, it } from 'vitest';
import { toDrawioXml } from './toDrawio';
import { buildGraph } from '../diagram/buildGraph';
import { emptyLzModel } from '../model/defaults';
import { newPlatform, newSharedPlatform } from '../services/platforms';
import type { DiagramModel, LzModel } from '../model/types';
import { associationDisplaySegments, flowDisplayPoints, structuralEdgePoints } from '../diagram/displayGeometry';
import { absoluteNodeRects } from '../diagram/flowGeometry';
import { generatedRouteTables } from '../services/routingFixtures.testSupport';
import { resourceGroupLayout, resourceGroupSvg } from '../diagram/resourceGroups';
import { ATTACHMENT_LABEL, DRG_CAPTION } from '../diagram/layoutPolicy';

describe('toDrawioXml', () => {
  it('includes external root nodes in the export origin without clipping their negative model coordinates', () => {
    const diagram: DiagramModel = { nodes: [
      { id: 'region', kind: 'region', label: 'OCI Region', x: 0, y: 0, width: 1000, height: 1000 },
      { id: 'vpn', kind: 'attachment', label: 'VPN office', x: -300, y: 300, width: 200, height: 60 },
    ], edges: [] };
    const xml = toDrawioXml(diagram);
    const vpn = xml.match(/<mxCell id="vpn"[^]*?<\/mxCell>/)?.[0] ?? '';
    expect(vpn).toContain('parent="1"');
    expect(vpn).toContain('x="20" y="350" width="200" height="60"');
    const region = xml.match(/<mxCell id="region"[^]*?<\/mxCell>/)?.[0] ?? '';
    expect(region).toContain('x="320" y="50"');
    expect(diagram.nodes[1].x).toBe(-300);
  });

  it('embeds the exact resource block shown on the website at the model position and extent', () => {
    const resourceItems = [{ key: 'added-by-generator', name: 'new-generated-resource<&>' }];
    const width = 180;
    const height = resourceGroupLayout('events', resourceItems, width).height;
    const group: DiagramModel['nodes'][number] = {
      id: 'generated-events', kind: 'resourcegroup', label: 'Events', resourceKind: 'events', resourceItems,
      x: 16, y: 50, width, height, parentId: 'security',
    };
    const diagram: DiagramModel = { nodes: [
      { id: 'security', kind: 'compartment', label: 'Generated security compartment', x: 0, y: 0, width: 220, height: height + 80 }, group,
    ], edges: [] };
    const xml = toDrawioXml(diagram);
    const encoded = xml.match(/id="generated-events"[^>]*image=data:image\/svg\+xml,([^;]+);/)?.[1];
    expect(encoded).toBeDefined();
    expect(decodeURIComponent(encoded!)).toBe(resourceGroupSvg('events', resourceItems, width));
    expect(xml).toContain(`x="16" y="50" width="180" height="${height}"`);
    expect(xml).toMatch(/id="generated-events"[^>]*parent="security"/);
  });

  function valueAttributes(xml: string): string[] {
    const values = [...xml.matchAll(/\bvalue="([^"]*)"/g)].map((match) => match[1]);
    expect(values).toHaveLength(xml.match(/\bvalue="/g)?.length ?? 0);
    return values;
  }

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
    expect(xml).toContain('#FAF8D6');
    expect(xml).toContain('#E3F3E3');
    expect(xml).toContain('#FCF9BD');
  });

  it('adds a Security Zone shield image to secure compartments only', () => {
    // default model: prod is a Security Zone, preprod is not
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
    expect(xml).toContain('&lt;font color=&quot;#1E7B2F&quot;&gt;&lt;b&gt;sn-fra-lz-hub-fw-dmz&lt;/b&gt;');
    // one route-table image per subnet (6 hub + 4 per environment × 2 envs)
    const rtCells = xml.match(/id="[^"]*-rt"/g) ?? [];
    expect(rtCells).toHaveLength(14);
  });

  it('renders the three gateways and the firewall/LB subnet icons + captions', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 2));
    expect(xml).toMatch(/id="gw-igw"[^>]*parent="hub-vcn"/);
    expect(xml).toMatch(/id="gw-natgw"/);
    expect(xml).toMatch(/id="gw-sgw"/);
    expect(xml).toContain('Internet&#10;Gateway');
    expect(xml).toMatch(/id="gw-igw-icon"[^]*?<mxGeometry x="21" y="0" width="34" height="34"/);
    expect(xml).toMatch(/id="gw-igw-label"[^]*?<mxGeometry x="0" y="35" width="76" height="25"/);
    // firewall icons in the two fw subnets + LB icon, with captions
    expect(xml).toContain('id="hub-vcn-sn-0-icon"');
    expect(xml).toContain('nfw-fra-lz-hub-dmz');
    expect(xml).toContain('id="hub-vcn-sn-1-icon"');
    expect(xml).toContain('Load Balancer');
    expect(xml).toContain('nfw-fra-lz-hub-int');
    // plain subnets get no icon cell
    expect(xml).not.toContain('id="hub-vcn-sn-3-icon"');
  });

  it('renders the DRG, a VCN-attachment per VCN, an OSN glyph per VCN, and routing edges', () => {
    const xml = toDrawioXml(buildGraph(emptyLzModel(), 3)); // spoke VCNs + their attachments appear in step 3
    // single DRG inside the network compartment
    expect(xml).toMatch(/id="drg"[^>]*parent="cmp-network"/);
    const drgCell = xml.match(/id="drg"[^>]+/)?.[0] ?? '';
    expect(drgCell).toContain(`fontSize=${DRG_CAPTION.fontSize};fontFamily=${DRG_CAPTION.fontFamily};`);
    expect(drgCell).toContain(`spacingTop=${DRG_CAPTION.gap};`);
    // one OSN glyph per VCN (1 hub + 2 env)
    const osnCells = xml.match(/id="[^"]*-osn"/g) ?? [];
    expect(osnCells).toHaveLength(3);
    // every attachment pill clusters with the DRG inside cmp-network
    expect(xml).toMatch(/id="attach-hub"[^>]*parent="cmp-network"/);
    expect(xml).toMatch(/id="attach-cmp-env-0"[^>]*parent="cmp-network"/);
    expect(xml).toContain('drgatt-fra-lz-hub');
    expect(xml).toContain('drgatt-fra-lz-prod-proj');
    const attachmentCell = xml.match(/id="attach-cmp-env-0"[^>]+/)?.[0] ?? '';
    expect(attachmentCell).toContain(`fontSize=${ATTACHMENT_LABEL.fontSize};`);
    expect(attachmentCell).toContain(`fontFamily=${ATTACHMENT_LABEL.fontFamily};`);
    expect(attachmentCell).toContain(`spacingLeft=${ATTACHMENT_LABEL.sidePadding};spacingRight=${ATTACHMENT_LABEL.sidePadding};`);
    // VCN → attach → DRG connections have endpoint dots and square corners.
    expect(xml).toContain('source="hub-vcn" target="attach-hub"');
    expect(xml).toContain('source="attach-hub" target="drg"');
    expect(xml.match(/id="e-attach-hub-drg"[^>]+/)?.[0]).toContain('entryX=1;entryY=0.25;');
    expect(xml.match(/id="e-attach-cmp-env-0-drg"[^>]+/)?.[0]).toContain('entryX=1;entryY=0.5;');
    expect(xml.match(/id="e-attach-cmp-env-1-drg"[^>]+/)?.[0]).toContain('entryX=1;entryY=0.75;');
    for (const edge of buildGraph(emptyLzModel(), 3).edges) {
      const cell = xml.match(new RegExp(`id="${edge.id}"[^>]+`))?.[0] ?? '';
      expect(cell).toContain('endArrow=oval;startArrow=oval;');
      expect(cell).toContain('startFill=1;endFill=1;');
    }
    expect(xml.match(/id="e-attach-hub-drg"[^>]+/)?.[0]).toContain('rounded=0;');
    // every environment VCN gets its own Service Gateway
    expect(xml).toMatch(/id="cmp-env-0-sgw"[^>]*parent="cmp-env-0-vcn"/);
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
    expect(xml).toContain('cmp-lz-prod-proj1');
    const projectContainer = xml.match(/<mxCell id="cmp-env-0-projects"[^>]+>/)?.[0] ?? '';
    const projectCompartment = xml.match(/<mxCell id="cmp-env-0-proj-0"[^>]+>/)?.[0] ?? '';
    expect(projectContainer).toContain('rounded=0;');
    expect(projectContainer).toContain('fillColor=#F5F3F1;');
    expect(projectCompartment).toContain('rounded=0;');
    expect(projectCompartment).toContain('fillColor=#ECEAE8;');
    expect(xml.match(/id="cmp-platform"[^>]+/)?.[0]).toContain('fillColor=#FAF8D6;');
    expect(xml.match(/id="cmp-platform"[^>]+/)?.[0]).toContain('fontColor=#3f4750;');
    expect(xml.match(/id="cmp-env-0-platforms"[^>]+/)?.[0]).toContain('fillColor=#999999;');
    expect(xml.match(/id="cmp-env-0-platforms"[^>]+/)?.[0]).toContain('fontColor=#ffffff;');
    // none of this before step 3
    expect(toDrawioXml(buildGraph(emptyLzModel(), 2))).not.toContain('-projects"');
  });

  it('renders the shared platform row + env platform VCNs with subnets (step 4)', () => {
    const base = emptyLzModel();
    const m: LzModel = { ...base, platforms: [{ ...newPlatform('oke_simple', []), id: 'oke', key: 'oke' }], sharedPlatforms: [newSharedPlatform('custom', [])] };
    // platform roots exist before step 4, but configured child/VCN nodes do not
    expect(toDrawioXml(buildGraph(m, 3))).not.toContain('cmp-env-0-platform-comp-0');
    expect(toDrawioXml(buildGraph(m, 3))).not.toContain('shared-plat-vcn-0');
    const xml = toDrawioXml(buildGraph(m, 4));
    // shared platform compartment outside the environments
    expect(xml).toMatch(/id="cmp-shared-platform-0"[^>]*parent="cmp-platform"/);
    expect(xml).toMatch(/id="shared-plat-vcn-0"[^>]*parent="cmp-network"/);
    // a platforms compartment is nested in each env, while its VCN is in network
    expect(xml).toMatch(/id="cmp-env-0-platforms"[^>]*parent="cmp-env-0"/);
    expect(xml).toMatch(/id="cmp-env-0-plat-0"[^>]*parent="cmp-env-0-network"/);
    // the platform VCN's subnets are nested inside it
    expect(xml).toMatch(/id="cmp-env-0-plat-0-sn-0"[^>]*parent="cmp-env-0-plat-0"/);
    expect(xml).toContain('pods');
    expect(xml).toContain('10.0.80.0/21');
  });

  it('maps an animated edge to draw.io flowAnimation', () => {
    const diagram: DiagramModel = {
      nodes: [
        { id: 'a', kind: 'subnet', label: 'source', x: 0, y: 0, width: 100, height: 50 },
        { id: 'b', kind: 'subnet', label: 'destination', x: 200, y: 0, width: 100, height: 50 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', label: 'flow', animated: true }],
    };
    const xml = toDrawioXml(diagram);
    expect(xml).toContain('flowAnimation=1;');
    expect(xml).toContain('edge="1"');
    expect(xml).toContain('source="a"');
    expect(xml).toContain('target="b"');
  });

  it('exports association rails by resource kind with their exact stored bends', () => {
    const diagram: DiagramModel = {
      nodes: [
        { id: 'region', kind: 'region', label: 'Region', x: 0, y: 0, width: 1000, height: 1000 },
        { id: 'processing-port', kind: 'rtdot', label: '', x: 300, y: 80, width: 16, height: 16 },
        { id: 'second-port', kind: 'rtdot', label: '', x: 300, y: 120, width: 16, height: 16 },
        { id: 'table', kind: 'routetable', label: 'Generated route table', x: 20, y: 20, width: 200, height: 120 },
      ],
      edges: [
        { id: 'association', source: 'processing-port', target: 'table',
          points: [{ x: 300, y: 88 }, { x: 250, y: 88 }, { x: 250, y: 60 }, { x: 220, y: 60 }] },
        { id: 'second-association', source: 'second-port', target: 'table',
          points: [{ x: 300, y: 128 }, { x: 250, y: 128 }, { x: 250, y: 60 }, { x: 220, y: 60 }] },
      ],
    };
    const xml = toDrawioXml(diagram);
    const cell = xml.match(/<mxCell id="association"[^]*?<\/mxCell>/)?.[0] ?? '';
    expect(cell).toContain('dashed=1;dashPattern=5 4;');
    expect(cell).toContain('endArrow=none;startArrow=none;');
    expect(cell).toContain('<mxPoint x="320" y="138" as="sourcePoint"');
    expect(cell).toContain('<mxPoint x="270" y="138" />');
    expect(cell).toContain('<mxPoint x="270" y="110" />');
    expect(cell).toContain('<mxPoint x="240" y="110" as="targetPoint"');
    const second = xml.match(/<mxCell id="second-association"[^]*?<\/mxCell>/)?.[0] ?? '';
    expect(second).toContain('<mxPoint x="270" y="138" as="targetPoint"');
    expect(second).not.toContain('<mxPoint x="240" y="110"');
    expect(xml.match(/<mxPoint x="270" y="110" \/>/g)).toHaveLength(1);
  });

  it('exports one fixed obstacle-aware polyline instead of rerouting every flow hop', async () => {
    const model = emptyLzModel();
    const graph = buildGraph(model, 3, { activeFlows: ['prod:egress:web'] }, undefined, await generatedRouteTables(model));
    const xml = toDrawioXml(graph);
    expect(xml.match(/id="flow-prod:egress:web#0"/g)).toHaveLength(1);
    expect(xml).not.toContain('id="flow-prod:egress:web#0-0"');
    expect(xml).toContain('edgeStyle=none;orthogonal=1;');
    expect(xml.match(/id="flow-prod:egress:web#0"[^>]+/)?.[0]).toContain('rounded=0;');
    expect(xml.match(/id="flow-prod:egress:web#0"[^>]+/)?.[0]).toContain('endArrow=block;startArrow=none;');
    expect(xml).toContain('as="sourcePoint"');
    expect(xml).toContain('as="targetPoint"');
    expect(xml).toContain('<Array as="points">');
  });

  it('preserves every route-table row without permanently lighting the union of traversed rules', async () => {
    const model = emptyLzModel();
    const graph = buildGraph(model, 3, { activeFlows: ['prod:egress:web'] }, undefined, await generatedRouteTables(model));
    const table = graph.nodes.find((node) => node.id === 'RT-FRA-LZ-HUB-FW-INT-KEY')!;
    expect(table.rtHighlight?.length).toBeGreaterThan(0);
    const xml = toDrawioXml(graph);
    const cell = xml.match(/id="RT-FRA-LZ-HUB-FW-INT-KEY"[^>]+/)?.[0] ?? '';
    expect(cell).not.toContain('background:#fff3c4');
    expect(cell.match(/&lt;tr/g)).toHaveLength(table.rtRows!.length + 1);
    expect(xml.match(/id="e-RT-FRA-LZ-HUB-FW-INT-KEY"[^>]+/)?.[0]).toContain('endArrow=none;');
  });

  it('exports canonical flow points and pinned attachment bends without lane offsets', async () => {
    const model = emptyLzModel();
    const graph = buildGraph(model, 3, { activeFlows: ['prod:egress:web', 'preprod:egress:web'] }, undefined, await generatedRouteTables(model));
    const xml = toDrawioXml(graph);
    const region = graph.nodes.find((node) => node.id === 'region')!;
    const dx = Math.max(20, Math.round((850 - region.width) / 2));
    const dy = Math.max(20, Math.round((1100 - region.height) / 2));
    const flows = graph.edges.filter((edge) => edge.animated && edge.points?.length);
    const flow = flows[0];
    const displayed = flowDisplayPoints(flow);
    expect(displayed).toBe(flow.points);
    const flowCell = xml.match(new RegExp(`<mxCell id="${flow.id}"[^]*?</mxCell>`))?.[0] ?? '';
    expect(flowCell).toContain(`<mxPoint x="${displayed[0].x + dx}" y="${displayed[0].y + dy}" as="sourcePoint"`);
    const associations = associationDisplaySegments(graph.nodes, graph.edges);
    for (const edge of graph.edges.filter((edge) => !edge.waypoints)) {
      const segments = associations.get(edge.id) ?? [structuralEdgePoints(edge, absoluteNodeRects(graph.nodes))];
      for (const [index, points] of segments.entries()) {
        const id = index ? `${edge.id}-segment-${index}` : edge.id;
        const cell = xml.match(new RegExp(`<mxCell id="${id}"[^]*?</mxCell>`))?.[0] ?? '';
        expect(cell).toContain(`<mxPoint x="${points[0].x + dx}" y="${points[0].y + dy}" as="sourcePoint"`);
        expect(cell).toContain(`<mxPoint x="${points.at(-1)!.x + dx}" y="${points.at(-1)!.y + dy}" as="targetPoint"`);
        points.slice(1, -1).forEach((point) => expect(cell).toContain(`<mxPoint x="${point.x + dx}" y="${point.y + dy}" />`));
      }
    }
  });

  it('exports visible flow annotations and public subnet badges with all-flow detail following focus', async () => {
    const model = emptyLzModel();
    const graph = buildGraph(model, 3, { activeFlows: ['prod:egress:web'] }, undefined, await generatedRouteTables(model));
    const detailed = toDrawioXml(graph);
    expect(detailed).toContain('id="flow-prod:egress:web#0-start"');
    expect(detailed).toContain('id="flow-prod:egress:web#0-mark-0"');
    expect(detailed).toContain('id="flow-prod:egress:web#0-hop-1"');
    expect(detailed).toContain('id="flow-prod:egress:web#0-label"');
    expect(detailed).toContain('id="hub-vcn-sn-0-public"');
    const overview = toDrawioXml({ ...graph, display: { allFlows: true } });
    expect(overview).not.toContain('id="flow-prod:egress:web#0-label"');
    expect(overview).not.toContain('id="flow-prod:egress:web#0-hop-1"');
    const focused = toDrawioXml({ ...graph, display: { allFlows: true, focusFlow: 'prod:egress' } });
    expect(focused).toContain('id="flow-prod:egress:web#0-label"');
    expect(focused).toContain('id="flow-prod:egress:web#0-hop-1"');
  });

  it('centres routing hop badges on their dots without resource slot offsets', () => {
    const graph: DiagramModel = {
      nodes: [
        { id: 'region', kind: 'region', label: 'Region', x: 0, y: 0, width: 1000, height: 1200 },
        { id: 'dot-hub', kind: 'rtdot', label: '', x: 123, y: 456, width: 8, height: 8 },
      ],
      edges: [{
        id: 'flow-prod:egress#0', source: 'drg', target: 'hub', animated: true,
        waypoints: ['drg', 'hub', 'hub'], points: [{ x: 127, y: 200 }, { x: 127, y: 460 }, { x: 200, y: 460 }, { x: 127, y: 460 }],
        visits: [
          { node: 'drg', pointIndex: 0, distance: 0, anchorId: 'drg' },
          { node: 'hub', pointIndex: 1, distance: 260, anchorId: 'dot-hub' },
          { node: 'hub', pointIndex: 3, distance: 406, anchorId: 'dot-hub' },
        ],
        flowHops: [
          { node: 'drg', seq: 1, visitIndex: 0 },
          { node: 'hub', seq: 2, visitIndex: 1, tableId: 'rt-hub', ruleId: 'outbound' },
          { node: 'hub', seq: 3, visitIndex: 2, tableId: 'rt-hub', ruleId: 'return' },
        ],
      }],
    };
    const xml = toDrawioXml(graph);
    const centre = (id: string) => {
      const cell = xml.match(new RegExp(`<mxCell id="${id}"[^]*?</mxCell>`))?.[0] ?? '';
      const geometry = cell.match(/<mxGeometry x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/)!;
      return [Number(geometry[1]) + Number(geometry[3]) / 2, Number(geometry[2]) + Number(geometry[4]) / 2];
    };
    expect(centre('flow-prod:egress#0-hop-2')).toEqual(centre('dot-hub'));
    expect(centre('flow-prod:egress#0-hop-3')).toEqual(centre('dot-hub'));
    expect(centre('flow-prod:egress#0-hop-1')).toEqual([147, 220]);
  });

  it('escapes XML-significant characters in labels', () => {
    const diagram: DiagramModel = {
      nodes: [{ id: 'n1', kind: 'vcn', label: 'A & B <co>', x: 0, y: 0, width: 100, height: 40 }],
      edges: [],
    };
    const xml = toDrawioXml(diagram);
    // The text is escaped once for draw.io's HTML renderer and again for XML.
    expect(xml).toContain('A &amp;amp; B &amp;lt;co&amp;gt;');
    expect(xml).not.toContain('A & B <co>');
  });

  it('keeps open route-table HTML inside a well-formed XML attribute', async () => {
    const model = emptyLzModel();
    const xml = toDrawioXml(buildGraph(model, 3, {
      showDots: true,
      showEndpoints: true,
      openTables: ['RT-FRA-LZ-HUB-LB-KEY'],
    }, undefined, await generatedRouteTables(model)));
    expect(xml).toContain('id="RT-FRA-LZ-HUB-LB-KEY"');
    expect(xml).toContain('&lt;table');
    expect(valueAttributes(xml).every((value) => !value.includes('<'))).toBe(true);
  });

  it('treats user-controlled draw.io label content as text, not HTML', () => {
    const diagram: DiagramModel = {
      nodes: [{
        id: 'rt',
        kind: 'routetable',
        label: '<img src=x onerror=alert(1)>',
        rtRows: [{ destination: '0.0.0.0/0', targetType: 'DRG', target: '<script>alert(1)</script>', routeType: 'Static' }],
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      }],
      edges: [],
    };
    const xml = toDrawioXml(diagram);
    expect(xml).toContain('&amp;lt;img src=x onerror=alert(1)&amp;gt;');
    expect(xml).toContain('&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;');
    expect(valueAttributes(xml).every((value) => !value.includes('<'))).toBe(true);
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
