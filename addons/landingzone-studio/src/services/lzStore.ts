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
import { emptyLzModel, normalizeModel } from '../model/defaults';

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

export function getLZ(id: string): LzRecord | null {
  try {
    const raw = window.localStorage.getItem(recordKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LzRecord;
    return { ...parsed, model: normalizeModel(parsed.model) };
  } catch {
    return null;
  }
}

export function createLZ(name?: string, model: LzModel = emptyLzModel(), clock: Date = new Date()): CreateLzResult {
  const ts = clock.toISOString();
  const resolvedName = name?.trim() || defaultLzName(clock, readIndex().map((entry) => entry.name));
  const record: LzRecord = { id: newId(), name: resolvedName, createdAt: ts, updatedAt: ts, model };
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

/** Persist the canonical model for an existing record; stamps updatedAt. */
export function saveLZ(id: string, model: LzModel): StoreResult {
  const existing = getLZ(id);
  if (!existing) return { ok: false, message: 'This Landing Zone is no longer available in browser storage.' };
  const updated: LzRecord = { ...existing, model, updatedAt: now() };
  try {
    window.localStorage.setItem(recordKey(id), JSON.stringify(updated));
  } catch {
    return { ok: false, message: STORAGE_FAILURE };
  }
  const indexed = upsertMeta({ id, name: updated.name, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
  if (indexed.ok) return indexed;
  try { window.localStorage.setItem(recordKey(id), JSON.stringify(existing)); } catch { /* original error remains authoritative */ }
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
  const created = createLZ(`Copy of ${source.name}`, source.model);
  if (!created.ok || !created.record) return created;
  // The copy has an identical model, so the source's artifacts still describe it.
  const outputs = getOutputs(id);
  if (outputs && !saveOutputs(created.record.id, { config: outputs.config, files: outputs.files }).ok) {
    return { ...created, message: 'The Landing Zone copy was created, but its output ZIP could not be saved.' };
  }
  return created;
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
