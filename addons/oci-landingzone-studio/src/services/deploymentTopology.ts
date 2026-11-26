import type { FoundationConfig } from '../model/types';
import { findRegion } from './regions';

/** Separate Home governance when it has its own selected deployment region. */
export function hasSeparateHomePrimary(foundation: FoundationConfig): boolean {
  return foundation.stackScope !== 'regional' && foundation.tenancyHomeRegion !== foundation.drRegion
    && !!foundation.tenancyHomeRegion && foundation.tenancyHomeRegion !== foundation.region
    && !!findRegion(foundation.realm, foundation.tenancyHomeRegion) && !!findRegion(foundation.realm, foundation.region);
}

/** Deployment stacks represented by the Foundation diagram. */
export function foundationDeploymentStacks(foundation: FoundationConfig): ('home' | 'primary' | 'secondary')[] {
  const primary = foundation.stackScope === 'regional' ? foundation.homeRegion : foundation.region;
  const secondary = foundation.stackScope === 'regional' ? foundation.region : foundation.drRegion;
  if (primary && secondary && primary !== secondary && findRegion(foundation.realm, primary) && findRegion(foundation.realm, secondary)) {
    const home = foundation.tenancyHomeRegion;
    return home && home !== primary && home !== secondary && findRegion(foundation.realm, home)
      ? ['home', 'primary', 'secondary'] : ['primary', 'secondary'];
  }
  if (hasSeparateHomePrimary(foundation)) return ['home', 'primary'];
  return primary && findRegion(foundation.realm, primary) ? ['primary'] : [];
}
