import { ReactFlowProvider } from '@xyflow/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { DiagramModel } from '../model/types';
import LzDiagram from './LzDiagram';
import { operatorWorkstationSvg } from './operatorWorkstation';
import { toDrawioXml } from '../export/toDrawio';

it('renders the same workstation glyph and readable caption in Studio and Draw.io', () => {
  const node = { id: 'operator', kind: 'operator' as const, label: 'Operator workstation\nSOCKS5 over SSH',
    x: 0, y: 0, width: 240, height: 100 };
  const diagram: DiagramModel = { nodes: [node], edges: [] };
  const html = renderToStaticMarkup(<ReactFlowProvider initialNodes={[
    { id: node.id, type: node.kind, data: { ...node }, position: { x: 0, y: 0 }, width: node.width, height: node.height },
  ]} initialWidth={800} initialHeight={600}><LzDiagram diagram={diagram} /></ReactFlowProvider>);
  expect(html).toContain('aria-label="Operator workstation: SOCKS5 over SSH; connected over the Internet"');
  expect(html).toContain('>Internet</text>');
  expect(html).toContain(operatorWorkstationSvg(node));
  const xml = toDrawioXml(diagram);
  const encoded = xml.match(/id="operator"[^>]*image=data:image\/svg\+xml,([^;]+);/)?.[1];
  expect(encoded).toBeDefined();
  expect(decodeURIComponent(encoded!)).toBe(operatorWorkstationSvg(node));
});

it('escapes workstation text in the shared SVG', () => {
  const svg = operatorWorkstationSvg({ width: 240, height: 80, label: 'Operator <team>\nSOCKS5 & SSH' });
  expect(svg).toContain('Operator &lt;team&gt;');
  expect(svg).toContain('SOCKS5 &amp; SSH');
});

it('renders usable handles at both ends of the Bastion structural connectors', () => {
  const diagram: DiagramModel = {
    nodes: [
      { id: 'operator', kind: 'operator', label: 'Operator workstation', x: 0, y: 0, width: 200, height: 60 },
      { id: 'bastion', kind: 'resourcegroup', label: 'Bastion', resourceKind: 'bastion', resourceItems: [{ key: 'BASTION', name: 'bastionfralzhub' }], x: 300, y: 0, width: 200, height: 100 },
      { id: 'subnet', kind: 'subnet', label: 'Management\n10.0.0.0/24', x: 600, y: 0, width: 200, height: 100 },
    ],
    edges: [
      { id: 'bastion-session', source: 'operator', target: 'bastion' },
      { id: 'bastion-private-endpoint', source: 'bastion', target: 'subnet' },
    ],
  };
  const initialNodes = diagram.nodes.map((node) => ({
    id: node.id, type: node.kind, data: { ...node }, position: { x: node.x, y: node.y }, width: node.width, height: node.height,
  }));
  const html = renderToStaticMarkup(<ReactFlowProvider initialNodes={initialNodes} initialWidth={1000} initialHeight={600}>
    <LzDiagram diagram={diagram} />
  </ReactFlowProvider>);
  for (const edge of diagram.edges) {
    for (const [nodeId, direction] of [[edge.source, 'source'], [edge.target, 'target']]) {
      const handles = html.match(new RegExp(`<div[^>]*data-nodeid="${nodeId}"[^>]*>`, 'g')) ?? [];
      expect(handles.some((handle) => handle.includes(` ${direction} `)), `${edge.id}: ${nodeId} needs a ${direction} handle`).toBe(true);
    }
  }
});
