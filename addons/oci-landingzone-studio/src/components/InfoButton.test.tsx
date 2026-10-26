import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import InfoButton from './InfoButton';

describe('contextual information', () => {
  it('connects each trigger and close control to its own named native popover', () => {
    const html = renderToStaticMarkup(<>
      <InfoButton title="Deployment type"><p>Complete or DR.</p></InfoButton>
      <InfoButton title="VCN ranges"><p>Subnets must fit inside the VCN.</p></InfoButton>
    </>);
    const targets = [...html.matchAll(/popoverTarget="([^"]+)"/g)].map((match) => match[1]);
    expect(targets).toHaveLength(4);
    expect(new Set(targets).size).toBe(2);
    for (const id of new Set(targets)) {
      expect(html).toContain(`id="${id}" popover="auto" role="dialog" aria-labelledby="${id}-title"`);
      expect(html).toContain(`id="${id}-title"`);
      expect(html).toContain(`popoverTarget="${id}" popoverTargetAction="hide"`);
    }
    expect(html).toContain('aria-label="About Deployment type"');
    expect(html).toContain('aria-label="Close Deployment type"');
    expect(html).not.toContain('aria-modal="true"');
  });
});
