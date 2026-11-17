import type { LzModel } from '../model/types';

export function validateCloudGuard(model: LzModel): string[] {
  return model.foundation.stackScope !== 'regional' && model.foundation.cloudGuardEnabled === false
    && model.foundation.cloudGuardExistingConfirmed !== true
    ? ['Confirm that Cloud Guard is already enabled and managed outside this deployment. Security Zones require it.'] : [];
}
