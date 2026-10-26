/**
 * lzStore — persistence for saved Landing Zones.
 *
 * All storage lives behind this service so the UI never touches localStorage
 * directly. That boundary means we can swap the backing store for IndexedDB or
 * a server / OCI Object Storage later without changing a single component.
 *
 * Layout in localStorage:
 *   lzng.lz.index        → LzMeta[]       (lightweight list for the dashboard)
 *   lzng.lz.<id>         → LzRecord       (full record incl. canonical model)
 *   lzng.lz.<id>.outputs → LzOutputs      (gzipped; the generator's artifacts)
 *
 * Generated outputs live under their own key, gzipped: the twelve artifacts are
 * ~250 KB of JSON, which would both blow the 5 MB quota across a few builds and
 * slow down every `getLZ` that only wanted the model.
 */

import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate';
import type { LzModel } from '../model/types';
import { emptyLzModel, LZ_MODEL_VERSION, normalizeModel } from '../model/defaults';
import type { DrDesignDraft } from './disasterRecoveryDesign';
import { findRegion } from './regions';
import { syncDrEnvironments } from './linkedDr';
import { serializeConfig } from './lzConfig';
import { isCurrentOutputSet } from '../generator/outputNames';

// Keep this namespace stable across the product rename so saved browser designs
// remain available without introducing a pre-release migration solely for branding.
const INDEX_KEY = 'lzng.lz.index';
const recordKey = (id: string) => `lzng.lz.${id}`;
const outputsKey = (id: string) => `lzng.lz.${id}.outputs`;

export interface LzMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LzRecord extends LzMeta {
  model: LzModel;
  /** Browser-local source relationship; excluded from deployment configuration. */
  homeLzId?: string;
  disasterRecovery?: { draft: DrDesignDraft; sourceLabel: string };
  previousCombinedDesign?: { home: LzModel; draft: DrDesignDraft; sourceLabel: string };
}

export interface StoreResult {
  ok: boolean;
  message?: string;
}

export interface CreateLzResult extends StoreResult {
  record?: LzRecord;
}

/** A generator run's artifacts, pinned to the config that produced them. */
export interface LzOutputs {
  /** The `config.jsonnet` fed to the generator — compare to spot stale outputs. */
  config: string;
  /** Output filename → JSON text. */
  files: Record<string, string>;
  generatedAt: string;
}

function now(): string {
  return new Date().toISOString();
}

export function defaultLzName(date: Date, existingNames: string[] = []): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const base = `Landing Zone ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const used = new Set(existingNames);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base} (${suffix})`)) suffix += 1;
  return `${base} (${suffix})`;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `lz-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function readIndex(): LzMeta[] {
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LzMeta[]) : [];
  } catch {
    return [];
  }
}

const STORAGE_FAILURE = 'Browser storage is unavailable or full. Changes were not saved.';

function writeIndex(index: LzMeta[]): StoreResult {
  try {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    return { ok: true };
  } catch {
    return { ok: false, message: STORAGE_FAILURE };
  }
}

function upsertMeta(meta: LzMeta): StoreResult {
  const index = readIndex().filter((m) => m.id !== meta.id);
  index.push(meta);
  return writeIndex(index);
}

/** Lightweight list of saved Landing Zones, most-recently-edited first. */
export function listLZs(): LzMeta[] {
  return readIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function readRecord(id: string): LzRecord | null {
  try {
    const raw = window.localStorage.getItem(recordKey(id));
    return raw ? JSON.parse(raw) as LzRecord : null;
  } catch {
    return null;
  }
}

/** Read only a complete, independent source; linked records cannot form chains or cycles. */
function readHomeRecord(id: string): LzRecord | null {
  const record = readRecord(id);
  const model = record?.model;
  if (!record || record.id !== id || typeof record.name !== 'string' || !record.name.trim() || !model
    || record.homeLzId || record.disasterRecovery || ![undefined, 'complete'].includes(model.foundation?.stackScope)
    || !['0.16.0', '0.18.0', '0.19.0', LZ_MODEL_VERSION].includes(model.version)
    || !model.foundation || (model.foundation.cisLevel !== 1 && model.foundation.cisLevel !== 2)
    || !model.network || !['hub_a', 'hub_b', 'hub_c', 'hub_e'].includes(model.network.hubKind)
    || typeof model.network.hubVcnCidr !== 'string' || !Array.isArray(model.network.subnets)
    || typeof model.foundation.realm !== 'string' || typeof model.foundation.region !== 'string'
    || !Array.isArray(model.environments) || !Array.isArray(model.projects)
    || !Array.isArray(model.platforms) || !Array.isArray(model.sharedPlatforms)
    || (['0.19.0', LZ_MODEL_VERSION].includes(model.version) && (!model.exadata?.exacc || !model.exadata?.exacs))) return null;
  try {
    const normalized = normalizeModel(model);
    if (model.version !== '0.16.0' && (model.environments.some((env) => !env.id) || model.projects.some((project) => !project.id))) return null;
    if (model.environments.some((env) => !env.network || typeof env.network.vcnCidr !== 'string' || !Array.isArray(env.network.subnets))) return null;
    const ids = normalized.environments.map((env) => env.id);
    const names = model.environments.map((env) => env.name.trim().toLowerCase());
    if (ids.some((id) => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length
      || names.some((name) => !name) || new Set(names).size !== names.length) return null;
    return { ...record, model: normalized };
  } catch {
    return null;
  }
}

export function linkedHomeRecord(record: LzRecord): LzRecord | null {
  return record.homeLzId && record.homeLzId !== record.id ? readHomeRecord(record.homeLzId) : null;
}

export function getLZ(id: string): LzRecord | null {
  const record = readRecord(id);
  if (!record) return null;
  try {
    const model = normalizeModel(record.model);
    const home = linkedHomeRecord(record);
    return { ...record, model: home ? syncDrEnvironments(model, home.model) : model };
  } catch {
    return null;
  }
}

function createRecord(name: string, model: LzModel, clock: Date, homeLzId?: string): CreateLzResult {
  const ts = clock.toISOString();
  const record: LzRecord = { id: newId(), name, createdAt: ts, updatedAt: ts, model,
    ...(homeLzId ? { homeLzId } : {}) };
  try {
    window.localStorage.setItem(recordKey(record.id), JSON.stringify(record));
  } catch {
    return { ok: false, message: STORAGE_FAILURE };
  }
  const indexed = upsertMeta({ id: record.id, name: record.name, createdAt: ts, updatedAt: ts });
  if (indexed.ok) return { ok: true, record };
  try { window.localStorage.removeItem(recordKey(record.id)); } catch { /* best-effort rollback */ }
  return indexed;
}

export function createLZ(name?: string, model: LzModel = emptyLzModel(), clock: Date = new Date()): CreateLzResult {
  const resolvedName = name?.trim() || defaultLzName(clock, readIndex().map((entry) => entry.name));
  return createRecord(resolvedName, model, clock);
}

export function createDrLZ(homeId: string): CreateLzResult {
  const home = readHomeRecord(homeId);
  if (!home) return { ok: false, message: 'Choose an available Home Region design with valid environments as the Home source.' };
  const model = structuredClone(home.model);
  const region = findRegion(model.foundation.realm, model.foundation.drRegion ?? '');
  model.foundation = { ...model.foundation, stackScope: 'regional', homeRegion: home.model.foundation.region,
    region: region && region.id !== home.model.foundation.region ? region.id : '',
    regionShortName: region && region.id !== home.model.foundation.region ? region.shortName : '', drRegion: undefined };
  return createRecord(`${home.name} DR`, model, new Date(), home.id);
}

/** Persist the canonical model for an existing record; stamps updatedAt. */
export function saveLZ(id: string, model: LzModel): StoreResult {
  const stored = readRecord(id);
  const existing = getLZ(id);
  if (!stored || !existing) return { ok: false, message: 'This Landing Zone is no longer available in browser storage.' };
  const home = linkedHomeRecord(existing);
  if (existing.homeLzId && !home) return { ok: false, message: 'The linked Home Region design is unavailable or no longer uses the Home Region deployment type. This DR design was not changed.' };
  const updated: LzRecord = { ...existing, model: home ? syncDrEnvironments(model, home.model) : model, updatedAt: now() };
  if (existing.disasterRecovery) {
    updated.previousCombinedDesign = { home: existing.model, ...existing.disasterRecovery };
    delete updated.disasterRecovery;
  }
  try {
    window.localStorage.setItem(recordKey(id), JSON.stringify(updated));
  } catch {
    return { ok: false, message: STORAGE_FAILURE };
  }
  const indexed = upsertMeta({ id, name: updated.name, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
  if (indexed.ok) return indexed;
  try { window.localStorage.setItem(recordKey(id), JSON.stringify(stored)); } catch { /* original error remains authoritative */ }
  return indexed;
}

/** Store a combined design separately from its original Home source. */
export function saveDisasterRecoveryLZ(input: { id?: string; name: string; model: LzModel; draft: DrDesignDraft; sourceLabel: string }): CreateLzResult {
  const existing = input.id ? getLZ(input.id) : null;
  if (input.id && !existing) return { ok: false, message: 'This Landing Zone is no longer available in browser storage.' };
  const ts = now();
  const record: LzRecord = {
    id: existing?.id ?? newId(), name: input.name.trim(), createdAt: existing?.createdAt ?? ts, updatedAt: ts,
    model: input.model, disasterRecovery: { draft: input.draft, sourceLabel: input.sourceLabel },
  };
  if (!record.name) return { ok: false, message: 'Landing Zone name cannot be empty.' };
  try { window.localStorage.setItem(recordKey(record.id), JSON.stringify(record)); }
  catch { return { ok: false, message: STORAGE_FAILURE }; }
  const indexed = upsertMeta({ id: record.id, name: record.name, createdAt: record.createdAt, updatedAt: record.updatedAt });
  if (indexed.ok) return { ok: true, record };
  try {
    if (existing) window.localStorage.setItem(recordKey(record.id), JSON.stringify(existing));
    else window.localStorage.removeItem(recordKey(record.id));
  } catch { /* Preserve the original storage error. */ }
  return indexed;
}

export function renameLZ(id: string, name: string): StoreResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: 'Landing Zone name cannot be empty.' };
  const existing = getLZ(id);
  if (!existing) return { ok: false, message: 'This Landing Zone is no longer available in browser storage.' };
  const updated: LzRecord = { ...existing, name: trimmed, updatedAt: now() };
  try {
    window.localStorage.setItem(recordKey(id), JSON.stringify(updated));
  } catch {
    return { ok: false, message: STORAGE_FAILURE };
  }
  const indexed = upsertMeta({ id, name: trimmed, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
  if (indexed.ok) return indexed;
  try { window.localStorage.setItem(recordKey(id), JSON.stringify(existing)); } catch { /* original error remains authoritative */ }
  return indexed;
}

export function duplicateLZ(id: string): CreateLzResult {
  const source = getLZ(id);
  if (!source) return { ok: false, message: 'This Landing Zone is no longer available in browser storage.' };
  const created = source.disasterRecovery
    ? saveDisasterRecoveryLZ({ name: `Copy of ${source.name}`, model: source.model, ...source.disasterRecovery })
    : createRecord(`Copy of ${source.name}`, structuredClone(source.model), new Date(), source.homeLzId);
  if (!created.ok || !created.record) return created;
  if (source.previousCombinedDesign) {
    created.record.previousCombinedDesign = source.previousCombinedDesign;
    try { window.localStorage.setItem(recordKey(created.record.id), JSON.stringify(created.record)); }
    catch {
      deleteLZ(created.record.id);
      return { ok: false, message: 'Could not retain the original Home and DR source in this copy.' };
    }
  }
  // The copy has an identical model, so the source's artifacts still describe it.
  const outputs = getOutputs(id);
  const reusable = outputs && (!source.homeLzId || isCurrentOutputSet(outputs, serializeConfig(source.model)));
  if (reusable && !saveOutputs(created.record.id, { config: outputs.config, files: outputs.files }).ok) {
    return { ...created, message: 'The Landing Zone copy was created, but its output ZIP could not be saved.' };
  }
  return created;
}

export function restoreCombinedDesign(id: string): StoreResult {
  const record = getLZ(id);
  const original = record?.previousCombinedDesign;
  if (!record || !original) return { ok: false, message: 'The original combined design is no longer available.' };
  return saveDisasterRecoveryLZ({ id, name: record.name, model: original.home, draft: original.draft, sourceLabel: original.sourceLabel });
}

export function deleteLZ(id: string): StoreResult {
  try {
    window.localStorage.removeItem(recordKey(id));
    window.localStorage.removeItem(outputsKey(id));
  } catch {
    return { ok: false, message: STORAGE_FAILURE };
  }
  return writeIndex(readIndex().filter((m) => m.id !== id));
}

/**
 * Persist a generator run. Stored gzipped as a latin1 string — every byte maps to
 * one code unit, so it survives localStorage without base64's 33% overhead.
 * Silently a no-op if the quota is exceeded: outputs are always regenerable.
 */
export function saveOutputs(id: string, outputs: Omit<LzOutputs, 'generatedAt'>): StoreResult {
  try {
    const payload: LzOutputs = { ...outputs, generatedAt: now() };
    const packed = gzipSync(strToU8(JSON.stringify(payload)));
    window.localStorage.setItem(outputsKey(id), strFromU8(packed, true));
    return { ok: true };
  } catch {
    return { ok: false, message: 'The ZIP was downloaded, but browser storage could not retain it for later download.' };
  }
}

export function getOutputs(id: string): LzOutputs | null {
  try {
    const raw = window.localStorage.getItem(outputsKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(strFromU8(gunzipSync(strToU8(raw, true)))) as LzOutputs;
    return parsed.files && parsed.config ? parsed : null;
  } catch {
    return null; // corrupt or written by an older format — treat as "not generated"
  }
}

export function clearOutputs(id: string): void {
  try { window.localStorage.removeItem(outputsKey(id)); } catch { /* ignore */ }
}
