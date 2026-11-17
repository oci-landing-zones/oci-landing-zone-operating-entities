import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WizardStepper, { WIZARD_STEPS, previewPhase } from './WizardStepper';

it('places Security after Foundation and keeps the remaining steps in order', () => {
  expect(WIZARD_STEPS.map((step) => step.label)).toEqual([
    'Foundation', 'Security', 'Hub Network', 'Projects', 'Platforms', 'Governance', 'Review',
  ]);
  expect(WIZARD_STEPS.map((step) => step.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  const html = renderToStaticMarkup(<WizardStepper active={2} onSelect={() => {}} />);
  expect(html).toMatch(/aria-current="step"[^>]*><span[^>]*>2<\/span>Security/);
});

it('preserves existing diagram and config phases across the seven navigation steps', () => {
  expect(WIZARD_STEPS.map((step) => previewPhase(step.id))).toEqual([1, 1, 2, 3, 4, 5, 6]);
});
