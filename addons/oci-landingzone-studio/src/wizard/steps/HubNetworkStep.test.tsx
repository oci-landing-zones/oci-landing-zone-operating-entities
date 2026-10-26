import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VcnEditor } from './HubNetworkStep';

describe('VCN subnet validation', () => {
  it('associates an invalid VCN range with its visible error', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="invalid" vcnCidr="invalid" subnets={[]} emptyNote="" onApply={() => {}} />);
    expect(html).toMatch(/id="invalid-vcn-cidr"[^>]*aria-invalid="true"[^>]*aria-describedby="invalid-vcn-error"/);
    expect(html).toContain('id="invalid-vcn-error"');
  });
  it('suggests an available in-range CIDR when a subnet is outside the VCN', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="test" vcnCidr="10.0.0.0/21" emptyNote="" onApply={() => {}}
      subnets={[{ name: 'outside', cidr: '192.168.1.0/24' }, { name: 'used', cidr: '10.0.0.0/24' }]} />);
    expect(html).toContain('Outside the VCN (10.0.0.0/21)');
    expect(html).toContain('Use 10.0.1.0/24');
    expect(html).toContain('aria-invalid="true"');
  });

  it('explains when the VCN is full instead of suggesting an overlapping block', () => {
    const html = renderToStaticMarkup(<VcnEditor idPrefix="full" vcnCidr="10.0.0.0/24" emptyNote="" onApply={() => {}}
      subnets={[{ name: 'outside', cidr: '192.168.1.0/24' }, { name: 'used', cidr: '10.0.0.0/24' }]} />);
    expect(html).toContain('No free subnet range remains in this VCN.');
    expect(html).not.toContain('>Use ');
  });
});
