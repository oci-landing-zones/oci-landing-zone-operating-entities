import { describe, expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from '../model/defaults';
import { buildConfig, serializeConfig } from './lzConfig';
import { defaultBastion, validateBastion } from './bastion';

describe('Bastion configuration', () => {
  it('keeps existing saved designs disabled without changing their model version', () => {
    const original = emptyLzModel();
    const restored = normalizeModel(JSON.parse(JSON.stringify(original)));
    expect(restored.version).toBe('0.20.0');
    expect(buildConfig(restored).bastion).toBeUndefined();
    expect(validateBastion(restored)).toEqual([]);
  });

  it('emits the root capability from Foundations and retains disabled inputs after reopening', () => {
    const model = emptyLzModel();
    model.bastion = { ...defaultBastion(), enabled: true, clientCidrs: '203.0.113.10/32\n198.51.100.0/24' };
    expect(buildConfig(model).bastion).toEqual({
      client_cidr_block_allow_list: ['203.0.113.10/32', '198.51.100.0/24'], max_session_ttl_in_seconds: 3600,
    });
    expect(serializeConfig(model, 1)).toContain("bastion: { client_cidr_block_allow_list: ['203.0.113.10/32', '198.51.100.0/24'], max_session_ttl_in_seconds: 3600 }");
    expect(buildConfig(model).hub.network).not.toHaveProperty('bastion');
    model.bastion.enabled = false;
    const restored = normalizeModel(JSON.parse(JSON.stringify(model)));
    expect(restored.bastion).toEqual(model.bastion);
    expect(buildConfig(restored).bastion).toBeUndefined();
    expect(serializeConfig(restored)).not.toContain('bastion:');
    expect(validateBastion(restored)).toEqual([]);
  });

  it.each(['', '0.0.0.0/0', '::1/128', '203.0.113.10/24', '203.0.113.010/32', '203.0.113.10/032', 'not-a-cidr'])('rejects an invalid enabled client allowlist: %j', (clientCidrs) => {
    const model = emptyLzModel();
    model.bastion = { ...defaultBastion(), enabled: true, clientCidrs };
    expect(validateBastion(model).length).toBeGreaterThan(0);
  });

  it('accepts 20 canonical client CIDRs and rejects 21', () => {
    const model = emptyLzModel();
    model.bastion = { ...defaultBastion(), enabled: true, clientCidrs: Array.from({ length: 20 }, (_, i) => `203.0.113.${i}/32`).join('\n') };
    expect(validateBastion(model)).toEqual([]);
    model.bastion.clientCidrs += '\n203.0.113.20/32';
    expect(validateBastion(model).join(' ')).toContain('20');
  });

  it.each([1799, 10801, 1800.5, Number.NaN])('rejects an invalid session duration: %j', (maxSessionTtlInSeconds) => {
    const model = emptyLzModel();
    model.bastion = { ...defaultBastion(), enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds };
    expect(validateBastion(model).join(' ')).toContain('session duration');
  });

  it.each([1800, 3600, 10800])('accepts a valid session duration: %j', (maxSessionTtlInSeconds) => {
    const model = emptyLzModel();
    model.bastion = { ...defaultBastion(), enabled: true, clientCidrs: '203.0.113.10/32', maxSessionTtlInSeconds };
    expect(validateBastion(model)).toEqual([]);
  });
});
