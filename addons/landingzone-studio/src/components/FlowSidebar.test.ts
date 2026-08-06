import { describe, expect, it } from 'vitest';
import { flowChoices } from './FlowSidebar';

describe('flowChoices', () => {
  const environments = [{ name: 'prod' }, { name: 'preprod' }, { name: 'dev' }];

  it('makes every east-west destination explicit', () => {
    expect(flowChoices(environments, 0)).toEqual([
      { id: 'prod:egress', label: 'Spoke → Internet', sub: 'egress' },
      { id: 'prod:ingress', label: 'Internet → Spoke', sub: 'ingress' },
      { id: 'prod>preprod:east-west', label: 'Spoke → preprod', sub: 'east-west' },
      { id: 'prod>dev:east-west', label: 'Spoke → dev', sub: 'east-west' },
      { id: 'prod:services', label: 'Spoke → OCI Services', sub: 'SGW' },
    ]);
  });

  it('omits east-west choices when there is no destination environment', () => {
    expect(flowChoices([{ name: 'prod' }], 0).map((choice) => choice.id)).toEqual([
      'prod:egress', 'prod:ingress', 'prod:services',
    ]);
  });
});
