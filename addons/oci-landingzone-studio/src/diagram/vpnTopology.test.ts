import { describe, expect, it } from 'vitest';
import { emptyLzModel } from '../model/defaults';
import { emptyHybridConnectivity, newVpn } from '../services/hybridConnectivity';
import { buildGraphLayout as buildGraph } from './buildGraph';
import { hybridTopologySvg } from './hybridTopology';
import { toDrawioXml } from '../export/toDrawio';

function fixture() {
  const model = emptyLzModel();
  const hybrid = model.hybridConnectivity = emptyHybridConnectivity();
  hybrid.customer_premises_equipments.office = { ip_address: '203.0.113.50' };
  hybrid.ipsecs.office = { ...newVpn('office'), remote_cidrs: ['192.168.0.0/16'] };
  const vpn = hybrid.ipsecs.office;
  vpn.tunnels_management.tunnel_1 = { routing: 'BGP', bgp_session_info: { customer_interface_ip: '172.20.1.1/30', oracle_interface_ip: '172.20.1.2/30' } };
  vpn.tunnels_management.tunnel_2 = { routing: 'BGP', bgp_session_info: { customer_interface_ip: '172.20.1.5/30', oracle_interface_ip: '172.20.1.6/30' } };
  return { model, vpn };
}

describe('VPN topology drawing', () => {
  it('shows the CPE, remote network and each configured tunnel address in canvas and export', () => {
    const { model, vpn } = fixture();
    vpn.tunnels_management.tunnel_1.shared_secret = 'EXAMPLE ONLY NOT A REAL KEY';
    const graph = buildGraph(model, 2);
    const nodes = graph.nodes.filter((node) => ['premises', 'vpn', 'vpntunnel'].includes(node.kind));
    const svg = nodes.map(hybridTopologySvg).join('');
    for (const label of ['On-Premises', '203.0.113.50', '192.168.0.0/16', 'Tunnel 1', 'Tunnel 2', '172.20.1.1/30', '172.20.1.2/30', '172.20.1.5/30', '172.20.1.6/30']) expect(svg).toContain(label);
    expect(JSON.stringify(graph)).not.toContain(vpn.tunnels_management.tunnel_1.shared_secret);
    for (const node of nodes) expect(toDrawioXml(graph)).toContain(encodeURIComponent(hybridTopologySvg(node)));
    expect(svg).not.toContain('(2 tunnels)');
  });

  it('does not invent addresses for static tunnels or an existing CPE', () => {
    const { model, vpn } = fixture();
    vpn.cpe_key = undefined;
    vpn.cpe_id = 'ocid1.cpe.oc1.example';
    delete model.hybridConnectivity!.customer_premises_equipments.office;
    vpn.tunnels_management.tunnel_1.routing = 'STATIC';
    vpn.tunnels_management.tunnel_2.routing = 'STATIC';
    const svg = buildGraph(model, 2).nodes.filter((node) => ['premises', 'vpn', 'vpntunnel'].includes(node.kind)).map(hybridTopologySvg).join('');
    expect(svg).toContain('Existing CPE');
    expect(svg).not.toContain('203.0.113.50');
    expect(svg).not.toContain('172.20.1.');
    expect(svg).not.toContain('IPv4 inside');
  });

  it('escapes user labels in the shared SVG', () => {
    const { model } = fixture();
    const node = buildGraph(model, 2).nodes.find((node) => node.kind === 'premises')!;
    node.label = 'VPN <script>alert("test")</script>';
    node.premises!.equipmentName = '<img onerror="alert(1)" />';
    const svg = hybridTopologySvg(node);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&lt;img');
  });

  it('keeps tunnel identities when the source object lists Tunnel 2 first', () => {
    const { model, vpn } = fixture();
    vpn.tunnels_management = { tunnel_2: vpn.tunnels_management.tunnel_2, tunnel_1: vpn.tunnels_management.tunnel_1 };
    const graph = buildGraph(model, 2);
    expect(graph.nodes.find((node) => node.id === 'hybrid-vpn-office:tunnel-1')?.vpnTunnel?.customerAddress).toBe('172.20.1.1/30');
    expect(graph.nodes.find((node) => node.id === 'hybrid-vpn-office:tunnel-2')?.vpnTunnel?.customerAddress).toBe('172.20.1.5/30');
  });

  it('reserves readable width for long CPE names', () => {
    const { model, vpn } = fixture();
    const ordinary = buildGraph(model, 2).nodes.find((node) => node.kind === 'premises')!;
    const name = 'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww';
    model.hybridConnectivity!.customer_premises_equipments[name] = model.hybridConnectivity!.customer_premises_equipments.office;
    delete model.hybridConnectivity!.customer_premises_equipments.office;
    vpn.cpe_key = name;
    const long = buildGraph(model, 2).nodes.find((node) => node.kind === 'premises')!;
    expect(long.width).toBeGreaterThan(ordinary.width);
    expect(hybridTopologySvg(long)).toContain(name);
  });

  it.each([4, 5, 12])('separates %i remote CIDRs from the CPE labels and footer', (count) => {
    const { model, vpn } = fixture();
    vpn.remote_cidrs = Array.from({ length: count }, (_, index) => `172.${20 + index}.0.0/16`);
    const node = buildGraph(model, 2).nodes.find((node) => node.kind === 'premises')!;
    const textYs = new Map([...hybridTopologySvg(node).matchAll(/<text[^>]* y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)]
      .map((match) => [match[2], Number(match[1])]));
    expect(textYs.get('CPE')! - textYs.get(vpn.remote_cidrs.at(-1)!)!).toBeGreaterThanOrEqual(28);
    expect(textYs.get(node.label)! - textYs.get('Equipment')!).toBeGreaterThanOrEqual(24);
  });

  it('keeps separate identities for VPN names that resemble diagram child names', () => {
    const { model, vpn } = fixture();
    for (const name of ['office-tunnel-1', 'office-tunnel-2', 'office-premises']) {
      model.hybridConnectivity!.ipsecs[name] = structuredClone(vpn);
    }
    const graph = buildGraph(model, 2);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
    for (const name of Object.keys(model.hybridConnectivity!.ipsecs)) {
      const id = `hybrid-vpn-${name}`;
      expect(graph.nodes.filter((node) => node.id === `${id}:tunnel-1` || node.id === `${id}:tunnel-2`)).toHaveLength(2);
    }
    expect(graph.nodes.filter((node) => node.kind === 'vpn')).toHaveLength(1);
    expect(graph.edges.filter((edge) => edge.source === 'hybrid-cpe-office')).toHaveLength(8);
  });

  it('keeps the ordinary VPN layout compact without shortening its labels', () => {
    const { model } = fixture();
    const graph = buildGraph(model, 2);
    const premises = graph.nodes.find((node) => node.kind === 'premises')!;
    expect(-premises.x).toBeLessThan(720);
    expect(graph.nodes.filter((node) => node.kind === 'vpntunnel').every((node) => node.width === 360)).toBe(true);
  });
});
