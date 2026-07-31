/**
 * OCI realms and their regions (region identifier + three-letter region key).
 *
 * Sources (verified 2026-06):
 *   - https://docs.oracle.com/en-us/iaas/Content/General/Concepts/regions.htm
 *   - https://docs.oracle.com/en-us/iaas/Content/General/Concepts/identifiers.htm
 * Government/sovereign realms (oc2/oc3/oc4) carry their publicly documented
 * regions; commercial (oc1) and EU Sovereign (oc19) are the common cases.
 */

export interface Region {
  id: string;        // region identifier, e.g. eu-frankfurt-1
  shortName: string; // three-letter region key, e.g. fra
}

export interface Realm {
  id: string;
  label: string;
}

export const REALM_OPTIONS: Realm[] = [
  { id: 'oc1', label: 'OC1 — Commercial' },
  { id: 'oc2', label: 'OC2 — US Government' },
  { id: 'oc3', label: 'OC3 — US Federal (DoD)' },
  { id: 'oc4', label: 'OC4 — UK Government' },
  { id: 'oc19', label: 'OC19 — EU Sovereign' },
];

export const REGIONS_BY_REALM: Record<string, Region[]> = {
  oc1: [
    { id: 'eu-frankfurt-1', shortName: 'fra' },
    { id: 'af-casablanca-1', shortName: 'lej' },
    { id: 'af-johannesburg-1', shortName: 'jnb' },
    { id: 'ap-batam-1', shortName: 'hsg' },
    { id: 'ap-chuncheon-1', shortName: 'yny' },
    { id: 'ap-delhi-1', shortName: 'onm' },
    { id: 'ap-hyderabad-1', shortName: 'hyd' },
    { id: 'ap-kulai-2', shortName: 'jbp' },
    { id: 'ap-melbourne-1', shortName: 'mel' },
    { id: 'ap-mumbai-1', shortName: 'bom' },
    { id: 'ap-osaka-1', shortName: 'kix' },
    { id: 'ap-seoul-1', shortName: 'icn' },
    { id: 'ap-singapore-1', shortName: 'sin' },
    { id: 'ap-singapore-2', shortName: 'xsp' },
    { id: 'ap-sydney-1', shortName: 'syd' },
    { id: 'ap-tokyo-1', shortName: 'nrt' },
    { id: 'ca-montreal-1', shortName: 'yul' },
    { id: 'ca-toronto-1', shortName: 'yyz' },
    { id: 'eu-amsterdam-1', shortName: 'ams' },
    { id: 'eu-madrid-1', shortName: 'mad' },
    { id: 'eu-madrid-3', shortName: 'orf' },
    { id: 'eu-marseille-1', shortName: 'mrs' },
    { id: 'eu-milan-1', shortName: 'lin' },
    { id: 'eu-paris-1', shortName: 'cdg' },
    { id: 'eu-stockholm-1', shortName: 'arn' },
    { id: 'eu-turin-1', shortName: 'nrq' },
    { id: 'eu-zurich-1', shortName: 'zrh' },
    { id: 'il-jerusalem-1', shortName: 'mtz' },
    { id: 'me-abudhabi-1', shortName: 'auh' },
    { id: 'me-dubai-1', shortName: 'dxb' },
    { id: 'me-jeddah-1', shortName: 'jed' },
    { id: 'me-riyadh-1', shortName: 'ruh' },
    { id: 'mx-monterrey-1', shortName: 'mty' },
    { id: 'mx-queretaro-1', shortName: 'qro' },
    { id: 'sa-bogota-1', shortName: 'bog' },
    { id: 'sa-santiago-1', shortName: 'scl' },
    { id: 'sa-saopaulo-1', shortName: 'gru' },
    { id: 'sa-valparaiso-1', shortName: 'vap' },
    { id: 'sa-vinhedo-1', shortName: 'vcp' },
    { id: 'uk-cardiff-1', shortName: 'cwl' },
    { id: 'uk-london-1', shortName: 'lhr' },
    { id: 'us-ashburn-1', shortName: 'iad' },
    { id: 'us-chicago-1', shortName: 'ord' },
    { id: 'us-phoenix-1', shortName: 'phx' },
    { id: 'us-saltlake-2', shortName: 'aga' },
    { id: 'us-sanjose-1', shortName: 'sjc' },
  ],
  oc2: [
    { id: 'us-langley-1', shortName: 'lfi' },
    { id: 'us-luke-1', shortName: 'luf' },
  ],
  oc3: [
    { id: 'us-gov-ashburn-1', shortName: 'ric' },
    { id: 'us-gov-chicago-1', shortName: 'pia' },
    { id: 'us-gov-phoenix-1', shortName: 'tus' },
  ],
  oc4: [
    { id: 'uk-gov-london-1', shortName: 'ltn' },
    { id: 'uk-gov-cardiff-1', shortName: 'brs' },
  ],
  oc19: [
    { id: 'eu-frankfurt-2', shortName: 'str' },
    { id: 'eu-madrid-2', shortName: 'vll' },
  ],
};

export function getRegionsForRealm(realm: string): Region[] {
  return REGIONS_BY_REALM[realm] || [];
}

export function getDefaultRegionForRealm(realm: string): Region | null {
  return getRegionsForRealm(realm)[0] || null;
}

export function findRegion(realm: string, regionId: string): Region | null {
  return getRegionsForRealm(realm).find((region) => region.id === regionId) || null;
}
