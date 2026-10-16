/**
 * virtualFs — expose this repository's canonical `gen/` Jsonnet tree to the
 * browser runtime. Keys are paths relative to the top-level `gen/`, matching the
 * paths used by Jsonnet imports and the command-line generator.
 */

/** Repository generator sources, keyed by path relative to the top-level `gen/`. */
const RAW: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../../gen/**/*.{jsonnet,libsonnet}', { query: '?raw', import: 'default', eager: true }),
  ).map(([k, v]) => [k.replace(/^\.\.\/\.\.\/\.\.\/\.\.\/gen\//, ''), v as string]),
);

export interface VirtualFs {
  /** Top-level-gen-relative path → Jsonnet source. */
  files: Record<string, string>;
  /** `landing_zone_multi.jsonnet`, the `--multi` entrypoint. */
  entry: string;
  /** `defaults.libsonnet` — the repository's reference configs. */
  defaults: string;
}

export function buildVirtualFs(): VirtualFs {
  return {
    files: RAW,
    entry: 'landing_zone_multi.jsonnet',
    defaults: 'defaults.libsonnet',
  };
}
