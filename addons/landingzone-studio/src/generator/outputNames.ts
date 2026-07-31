/**
 * Names of the generator's artifacts, split out from `generate.ts` so the UI can
 * label and order saved outputs without importing the generator itself — that
 * module eagerly bundles ~0.7 MB of vendored jsonnet.
 */

/**
 * The artifacts Hub A actually deploys, in deployment order. `network_pre.json`
 * goes in first with placeholder firewall OCIDs; `network.json` replaces it once
 * the firewall's private IPs exist. The generator emits ten more files (iam,
 * governance, the CIS security/observability tiers) which ride along in the bundle.
 */
export const PRIMARY_OUTPUTS = ['network.json', 'network_pre.json'] as const;

/** Filename the wizard's own config is written under, inside the bundle. */
export const CONFIG_FILENAME = 'config.jsonnet';

/** What each surfaced artifact is for, so a reviewer knows which to deploy first. */
export const OUTPUT_BLURB: Record<string, string> = {
  'network_pre.json': 'Deploy first — placeholder firewall OCIDs, no routing through the NFW yet.',
  'network.json': 'Deploy second — full routing, once the firewall private IPs exist.',
};
