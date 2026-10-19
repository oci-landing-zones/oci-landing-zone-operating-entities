import type { LzModel, PlatformType } from '../model/types';
import { validateExadataModel } from './exadata';
import { validateOkeModel } from './okeValidation';
import { validateOcvsModel } from './ocvsValidation';
import { validatePlatformContracts } from './platformValidation';
import { platformInEnv } from './platforms';

export type PlatformReadiness = {
  status: 'Not configured' | 'Needs attention' | 'Configured';
  errors: string[];
};

function readiness(included: boolean, errors: string[]): PlatformReadiness {
  return { status: !included ? 'Not configured' : errors.length ? 'Needs attention' : 'Configured', errors: included ? [...new Set(errors)] : [] };
}

export function platformReadiness(model: LzModel, type: PlatformType): PlatformReadiness {
  const platforms = model.platforms.filter((platform) => platform.type === type);
  const sharedPlatforms = model.sharedPlatforms.filter((platform) => (platform.type ?? 'custom') === type);
  const errors = validatePlatformContracts({ ...model, platforms, sharedPlatforms });
  // Scoped validation must still report key and VCN conflicts with other types.
  const keys = [...platforms, ...sharedPlatforms].map((platform) => platform.key.trim().toLowerCase()).filter(Boolean);
  errors.push(...validatePlatformContracts(model).filter((error) => {
    const text = error.toLowerCase();
    return keys.some((key) => text.endsWith(`platform config key: ${key}.`) || text.includes(`platform ${key} (`));
  }));
  for (const platform of platforms) {
    if (!model.environments.some((env) => platformInEnv(platform, env.id))) {
      errors.push(`${platform.key || type}: Select at least one environment.`);
    }
  }
  if (type === 'oke_simple') errors.push(...validateOkeModel(model));
  if (type === 'ocvs') errors.push(...validateOcvsModel(model));
  return readiness(platforms.length + sharedPlatforms.length > 0, errors);
}

export function exadataReadiness(model: LzModel, type: 'exacc' | 'exacs'): PlatformReadiness {
  const other = type === 'exacc' ? 'exacs' : 'exacc';
  const scoped = { ...model, exadata: { ...model.exadata, [other]: { ...model.exadata[other], enabled: false } } };
  // Keep the full-model errors too, so overlaps between both extensions remain visible.
  const errors = [...validateExadataModel(scoped), ...validateExadataModel(model).filter((error) => error.toLowerCase().includes(type))];
  return readiness(model.exadata[type].enabled, errors);
}
