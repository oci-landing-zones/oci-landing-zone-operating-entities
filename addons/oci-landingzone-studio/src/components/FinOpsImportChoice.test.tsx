import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FinOpsImportChoice } from './ImportLandingZoneDialog';

describe('legacy FinOps import choice', () => {
  it('explains the ambiguous export and requires a choice with no default selection', () => {
    const html = renderToStaticMarkup(<FinOpsImportChoice value={null} onChange={() => {}} />);
    expect(html).toContain('<fieldset');
    expect(html).toContain('<legend');
    expect(html).toContain('does not record whether FinOps tags were enabled');
    expect(html).toContain('Keep FinOps tags');
    expect(html).toContain('Disable FinOps tags');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/required=""/g)).toHaveLength(2);
    expect(html).not.toContain('checked=""');
  });
  it.each([true, false])('shows only the explicit %s selection checked', (value) => {
    const html = renderToStaticMarkup(<FinOpsImportChoice value={value} onChange={() => {}} />);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    const selected = html.match(/<input[^>]*checked=""[^>]*>/)?.[0];
    expect(selected).toContain(`value="${value ? 'enabled' : 'disabled'}"`);
  });
});
