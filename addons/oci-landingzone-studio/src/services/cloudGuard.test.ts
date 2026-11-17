import { expect, it } from 'vitest';
import { emptyLzModel, normalizeModel } from '../model/defaults';
import { buildConfig, serializeConfig } from './lzConfig';
import { deploymentPrerequisites } from './deployment';
import { importConfig } from './importConfig';
import { validateCloudGuard } from './cloudGuard';

it('keeps Cloud Guard enabled for new and legacy designs', () => {
  const model = emptyLzModel();
  expect(model.foundation.cloudGuardEnabled).toBe(true);
  delete model.foundation.cloudGuardEnabled;
  expect(buildConfig(normalizeModel(model)).enable_cloud_guard).not.toBe(false);
  expect(validateCloudGuard(model)).toEqual([]);
});

it('exports exclusion and imports it without assuming an existing service is enabled', () => {
  const model = emptyLzModel();
  model.foundation.cloudGuardEnabled = false;
  model.foundation.cloudGuardExistingConfirmed = true;
  const config = buildConfig(model);
  expect(config.enable_cloud_guard).toBe(false);
  expect(serializeConfig(model)).toContain('enable_cloud_guard: false');
  const restored = importConfig(config).model;
  expect(restored.foundation.cloudGuardEnabled).toBe(false);
  expect(restored.foundation.cloudGuardExistingConfirmed).not.toBe(true);
  expect(validateCloudGuard(restored)).toHaveLength(1);
});

it('requires confirmation for Home exclusion and preserves it in saved designs', () => {
  const model = emptyLzModel();
  model.foundation.cloudGuardEnabled = false;
  expect(validateCloudGuard(model)).toHaveLength(1);
  model.foundation.cloudGuardExistingConfirmed = true;
  expect(validateCloudGuard(normalizeModel(model))).toEqual([]);
  model.foundation.stackScope = 'regional';
  model.foundation.cloudGuardExistingConfirmed = false;
  expect(validateCloudGuard(model)).toEqual([]);
});

it('rejects invalid enable flags on import', () => {
  expect(() => importConfig({ ...buildConfig(emptyLzModel()), enable_cloud_guard: 'false' })).toThrow('enable_cloud_guard');
});

it('accepts an explicit default-on import', () => {
  expect(importConfig({ ...buildConfig(emptyLzModel()), enable_cloud_guard: true }).model.foundation.cloudGuardEnabled).toBe(true);
});

it('imports an excluded Cloud Guard topic without requiring an empty notification object', () => {
  const restored = importConfig({ ...buildConfig(emptyLzModel()), enable_cloud_guard: false,
    notification_emails: { cloudguard: ['ops@example.com'] } }).model;
  expect(restored.foundation.notifications?.cloudguard).toBe('ops@example.com');
  expect(buildConfig(restored)).not.toHaveProperty('notification_emails');
});

it('records the external service prerequisite in deployment guidance', () => {
  const model = emptyLzModel();
  model.foundation.cloudGuardEnabled = false;
  expect(deploymentPrerequisites(buildConfig(model)).join(' ')).toContain('Cloud Guard must already be enabled');
});
