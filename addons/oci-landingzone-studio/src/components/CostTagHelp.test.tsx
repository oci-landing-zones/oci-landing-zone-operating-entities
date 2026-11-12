import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CostTagHelp from './CostTagHelp';
import { tagHelpPosition } from './tagHelpPosition';

it('describes inherited Platform values separately from the base values', () => {
  const html = renderToStaticMarkup(<CostTagHelp name="tag-lz-platform" />);
  expect(html).toContain('aria-describedby=');
  expect(html).toContain('popover="auto" role="tooltip"');
  expect(html).toContain('network, security, observability, iam and governance');
  expect(html).toContain('workload extensions');
});

it('explains customer choices and initial assignments for each remaining tag', () => {
  for (const [name, text] of Object.entries({
    'tag-lz-environment': 'Foundations', 'tag-lz-project': 'notapplicable',
    'tag-lz-cost-center': 'CC12345', 'tag-lz-business-unit': 'IT', 'tag-lz-owner': 'email.address@example.com',
  })) {
    const html = renderToStaticMarkup(<CostTagHelp name={name} />);
    expect(html).toContain(text);
    expect(html).toContain('Configuration');
  }
});

it('positions help to the left when space is available and keeps it within narrow viewports', () => {
  const left = tagHelpPosition({ left: 350, top: 400, bottom: 430 }, 1200, 800, 200);
  expect(left.left + left.width).toBeLessThan(350);
  expect(left.top + 200).toBeLessThanOrEqual(788);
  const narrow = tagHelpPosition({ left: 20, top: 500, bottom: 530 }, 360, 640, 250);
  expect(narrow.left).toBeGreaterThanOrEqual(12);
  expect(narrow.left + narrow.width).toBeLessThanOrEqual(348);
  expect(narrow.top + 250).toBeLessThanOrEqual(628);
});
