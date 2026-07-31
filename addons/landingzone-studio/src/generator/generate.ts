/**
 * generate — run the real OCI landing-zone jsonnet generator over the wizard's
 * canonical config and hand back the deployable JSON artifacts.
 *
 * This is the same computation `gen/generate.sh` performs on the command line:
 *
 *   jsonnet --multi out/ --tla-code-file config=<config> gen/landing_zone_multi.jsonnet
 *
 * The config we feed it is exactly what Step 1–4 already emit — `serializeConfig`
 * targets `gen/config.libsonnet`'s schema, so no adapter sits in between. Outputs
 * are verified against upstream's checked-in blueprints in `generate.test.ts`.
 */

import type { LzModel } from '../model/types';
import { serializeConfig } from '../services/lzConfig';
import { evaluate } from './jsonnetVm';
import { buildVirtualFs } from './virtualFs';
import { PRIMARY_OUTPUTS } from './outputNames';

export interface GeneratedOutputs {
  /** The wizard config that was fed to the generator. */
  config: string;
  /** Output filename → pretty-printed JSON. Includes every file the generator emits. */
  files: Record<string, string>;
  /** `PRIMARY_OUTPUTS` that were actually produced, in that order. */
  primary: string[];
  /** Everything else the generator emitted, sorted. */
  secondary: string[];
}

/** A jsonnet evaluation failure, with alias names mapped back to real source paths. */
export class GeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeneratorError';
  }
}

function isFileMap(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Evaluate the generator with a jsonnet config expression. `makeConfigCode` is
 * handed the flat name of `defaults.libsonnet`, so callers can build a config
 * that imports upstream's own reference profiles.
 */
async function run(makeConfigCode: (defaults: string) => string): Promise<Record<string, string>> {
  const { files, entry, defaults } = buildVirtualFs();
  let result: unknown;
  try {
    result = await evaluate(entry, files, { config: makeConfigCode(defaults) });
  } catch (err) {
    throw new GeneratorError(err instanceof Error ? err.message : String(err));
  }
  if (!isFileMap(result)) {
    throw new GeneratorError(`Generator returned ${typeof result}, expected an object of output files`);
  }
  const out: Record<string, string> = {};
  for (const [name, body] of Object.entries(result)) out[name] = `${JSON.stringify(body, null, 4)}\n`;
  return out;
}

/**
 * Evaluate the generator against an arbitrary jsonnet config expression.
 * `configCode` is jsonnet source, not JSON — it becomes the `config` top-level arg.
 */
export function generateFromConfigCode(configCode: string): Promise<Record<string, string>> {
  return run(() => configCode);
}

/**
 * Evaluate the generator against one of upstream's own reference profiles
 * (`hub_a`, `hub_b`, `hub_c`, `hub_e`) from `gen/defaults.libsonnet`. The golden
 * test uses this to prove our pipeline reproduces the checked-in blueprints.
 */
export function generateFromUpstreamDefaults(profile: string): Promise<Record<string, string>> {
  return run((defaults) => `(import '${defaults}').${profile}`);
}

/** Run the generator over a wizard model. */
export async function generateOutputs(model: LzModel): Promise<GeneratedOutputs> {
  const config = serializeConfig(model);
  const files = await generateFromConfigCode(config);
  const primary = PRIMARY_OUTPUTS.filter((name) => name in files);
  const secondary = Object.keys(files).filter((name) => !primary.includes(name as never)).sort();
  return { config, files, primary, secondary };
}
