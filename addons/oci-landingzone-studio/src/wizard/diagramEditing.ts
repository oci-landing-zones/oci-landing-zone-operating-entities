import type { LzModel } from '../model/types';
import { parseCidr } from '../services/cidr';
import { platformInEnv } from '../services/platforms';

/** Text edits commit the diagram on blur/Enter; discrete controls remain immediate. */
export function isDiagramTextControl(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  const element = target as HTMLInputElement | HTMLTextAreaElement | null;
  return element?.tagName === 'TEXTAREA' || (element?.tagName === 'INPUT'
    && !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'hidden'].includes(element.type));
}

/** Empty added rows and partially typed CIDRs must not be sent to the generator. */
export function hasIncompleteNetworkInput(model: LzModel): boolean {
  const cidrs = [model.network.hubVcnCidr, ...model.network.subnets.map((sn) => sn.cidr)];
  for (const env of model.environments) {
    if (env.projectNetworkEnabled !== false) cidrs.push(env.network.vcnCidr, ...env.network.subnets.map((sn) => sn.cidr));
  }
  for (const platform of model.sharedPlatforms) cidrs.push(platform.vcnCidr, ...platform.subnets.map((sn) => sn.cidr));
  for (const platform of model.platforms) {
    if (!model.environments.some((env) => platformInEnv(platform, env.id))) continue;
    cidrs.push(platform.vcnCidr, ...(!platform.okeParams?.clusterSize ? platform.subnets.map((sn) => sn.cidr) : []));
    for (const [id, override] of Object.entries(platform.overrides ?? {})) {
      if (!model.environments.some((env) => env.id === id && platformInEnv(platform, id))) continue;
      if (override.vcnCidr !== undefined) cidrs.push(override.vcnCidr);
      if (!platform.okeParams?.clusterSize) cidrs.push(...(override.subnets ?? []).map((sn) => sn.cidr));
    }
    if (platform.okeParams) {
      const oke = platform.okeParams;
      if (!oke.apiAllowedCidrs.length) return true;
      cidrs.push(oke.servicesCidr, ...oke.apiAllowedCidrs, ...oke.peerVcnCidrs ?? []);
      if (oke.cniType === 'overlay' && oke.podsCidr !== undefined) cidrs.push(oke.podsCidr);
    }
  }
  for (const connection of model.remotePeeringConnections ?? []) cidrs.push(...connection.remoteCidrs);
  return cidrs.some((cidr) => !parseCidr(cidr));
}
