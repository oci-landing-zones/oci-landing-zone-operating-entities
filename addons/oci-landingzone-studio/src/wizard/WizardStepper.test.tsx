import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import WizardStepper, { WIZARD_STEPS } from './WizardStepper';

it('places Observability and cost at step 5 and Review at step 6', () => {
  expect(WIZARD_STEPS).toHaveLength(6);
  expect(WIZARD_STEPS[4]).toEqual({ id: 5, label: 'Observability and cost' });
  expect(WIZARD_STEPS[5]).toEqual({ id: 6, label: 'Review' });
  const html = renderToStaticMarkup(<WizardStepper active={5} onSelect={() => {}} />);
  expect(html).toMatch(/aria-current="step"[^>]*>[\s\S]*?Observability and cost/);
});
