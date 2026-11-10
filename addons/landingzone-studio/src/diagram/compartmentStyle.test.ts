import { describe, expect, it } from 'vitest';
import { compartmentStyle } from './compartmentStyle';

describe('compartment palette contract', () => {
  it('distinguishes shared and environment compartments using actual ancestry', () => {
    expect(compartmentStyle({ tone: 'yellow', compartmentScope: 'shared' }).fill).toBe('#FAF8D6');
    expect(compartmentStyle({ tone: 'yellow', compartmentScope: 'environment' }).fill).toBe('#FCF9BD');
  });

  it('retains the environment hierarchy and dark platform text contrast', () => {
    expect(compartmentStyle({ tone: 'green', compartmentScope: 'environment' }).fill).toBe('#E3F3E3');
    expect(compartmentStyle({ tone: 'platform', compartmentScope: 'environment' })).toMatchObject({ fill: '#999999', text: '#ffffff' });
    expect(compartmentStyle({ tone: 'projects', compartmentScope: 'environment' }).fill).toBe('#F5F3F1');
  });
});
