import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CostCenterCoverageNotice from './CostCenterCoverageNotice';

it('lists uncovered resources and explains which filters need changing', () => {
  const html = renderToStaticMarkup(<CostCenterCoverageNotice resources={[{ file: 'iam.json', path: '/compartments/prod',
    name: 'cmp-lz-prod', platform: 'iam', environment: 'prod', project: 'notapplicable' }]} />);
  expect(html).toContain('role="alert"');
  expect(html).toContain('1 resource has no cost center');
  expect(html).toContain('cmp-lz-prod');
  expect(html).toContain('Platform: iam');
  expect(html).toContain('Environment: prod');
  expect(html).toContain('Files with unassigned cost centers cannot be downloaded');
  expect(renderToStaticMarkup(<CostCenterCoverageNotice resources={[]} />)).toBe('');
});
