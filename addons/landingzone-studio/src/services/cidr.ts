/**
 * IPv4 CIDR math — ported from Iwan's standalone OCI VCN CIDR Calculator
 * (vcn-cidr-calculator/src/utils/cidrUtils.js), trimmed to what the wizard
 * needs and extended with the subnet-planning helpers: re-basing subnets when
 * the VCN CIDR moves, next-free-block suggestions, OCI validation, and the
 * free-space breakdown the calculator panel shows.
 *
 * All range work uses unsigned 32-bit integer math.
 */

const IPV4_OCTET = /^(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])$/;

export interface ParsedCidr {
  ipInt: number;
  prefix: number;
  start: number;
  end: number;
}

/** "10.0.1.0" → unsigned 32-bit int, or null if invalid. */
export function ipToInt(ip: string): number | null {
  if (!ip) return null;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    const p = part.trim();
    if (!IPV4_OCTET.test(p)) return null;
    n = (n << 8) | parseInt(p, 10);
  }
  return n >>> 0;
}

/** Unsigned 32-bit int → dotted-decimal IPv4 string. */
export function formatIp(n: number): string {
  const u = n >>> 0;
  return `${(u >>> 24) & 0xff}.${(u >>> 16) & 0xff}.${(u >>> 8) & 0xff}.${u & 0xff}`;
}

/** Parse "x.x.x.x/p" into its network range. IPv4 only. */
export function parseCidr(cidr: string): ParsedCidr | null {
  if (!cidr) return null;
  const s = cidr.trim();
  if (s.includes(':')) return null; // IPv6
  const slashIdx = s.indexOf('/');
  if (slashIdx === -1) return null;
  const base = s.slice(0, slashIdx).trim();
  const prefixStr = s.slice(slashIdx + 1).trim();
  if (!/^\d+$/.test(prefixStr)) return null;
  const prefix = parseInt(prefixStr, 10);
  if (prefix < 0 || prefix > 32) return null;
  const ipInt = ipToInt(base);
  if (ipInt === null) return null;
  const size = 2 ** (32 - prefix);
  const start = prefix === 0 ? 0 : ((ipInt >>> (32 - prefix)) << (32 - prefix)) >>> 0;
  const end = (start + size - 1) >>> 0;
  return { ipInt, prefix, start, end };
}

/** Normalise to canonical "network/prefix" form, or null if invalid. */
export function normalizeCidr(cidr: string): string | null {
  const p = parseCidr(cidr);
  return p ? `${formatIp(p.start)}/${p.prefix}` : null;
}

/** CIDR prefix → subnet mask string, e.g. 24 → "255.255.255.0". */
export function prefixToMask(prefix: number): string {
  if (prefix < 0 || prefix > 32) return '0.0.0.0';
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return formatIp(mask);
}

/** Is childCidr fully contained in parentCidr? */
export function contains(parentCidr: string, childCidr: string): boolean {
  const p = parseCidr(parentCidr);
  const c = parseCidr(childCidr);
  if (!p || !c) return false;
  return c.start >= p.start && c.end <= p.end;
}

/** Do two CIDR ranges overlap at all? */
export function overlaps(cidrA: string, cidrB: string): boolean {
  const a = parseCidr(cidrA);
  const b = parseCidr(cidrB);
  if (!a || !b) return false;
  return a.start <= b.end && b.start <= a.end;
}

/** Total addresses in a prefix. */
export function totalIps(prefix: number): number {
  return 2 ** (32 - prefix);
}

/** Usable addresses per OCI: 3 reserved per subnet (network, gateway, broadcast). */
export function usableIps(prefix: number): number {
  return Math.max(0, totalIps(prefix) - 3);
}

/**
 * Shift a CIDR by a delta (new VCN start − old VCN start), keeping its prefix.
 * Used to re-base subnets when the VCN CIDR changes.
 */
export function shiftCidr(cidr: string, delta: number): string | null {
  const p = parseCidr(cidr);
  if (!p) return null;
  return `${formatIp((p.start + delta) >>> 0)}/${p.prefix}`;
}

/** RFC1918 base ranges a VCN can live in — mirrors the standalone calculator. */
export const BASE_RANGES = [
  { id: '10', label: '10.x', cidr: '10.0.0.0/8' },
  { id: '172', label: '172.16.x', cidr: '172.16.0.0/12' },
  { id: '192', label: '192.168.x', cidr: '192.168.0.0/16' },
] as const;
export type BaseRangeId = (typeof BASE_RANGES)[number]['id'];

/** Which base range a CIDR lives in, or null if outside all three. */
export function baseRangeOf(cidr: string): BaseRangeId | null {
  const p = parseCidr(cidr);
  if (!p) return null;
  for (const range of BASE_RANGES) {
    const r = parseCidr(range.cidr)!;
    if (p.start >= r.start && p.end <= r.end) return range.id;
  }
  return null;
}

/**
 * Move a CIDR into another base range, keeping its prefix. The offset within
 * the old base range is preserved when it fits the new one; otherwise the
 * block lands at the start of the new range.
 */
export function moveToBaseRange(cidr: string, rangeId: BaseRangeId): string | null {
  const p = parseCidr(cidr);
  const target = BASE_RANGES.find((r) => r.id === rangeId);
  if (!p || !target) return null;
  const t = parseCidr(target.cidr)!;
  if (p.prefix < t.prefix) return null; // block bigger than the base range
  const current = baseRangeOf(cidr);
  let start = t.start;
  if (current) {
    const offset = p.start - parseCidr(BASE_RANGES.find((r) => r.id === current)!.cidr)!.start;
    if (t.start + offset + (p.end - p.start) <= t.end) start = t.start + offset;
  }
  return `${formatIp(start >>> 0)}/${p.prefix}`;
}

/** A sensible in-range host IP for a subnet — network address + offset, e.g. 10.0.0.4. */
export function hostIpInSubnet(subnetCidr: string, offset = 4): string {
  const p = parseCidr(subnetCidr);
  if (!p) return '';
  const ip = (p.start + offset) >>> 0;
  return ip >= p.start && ip <= p.end ? formatIp(ip) : formatIp(p.start);
}

/** Is `ip` a valid host inside `subnetCidr`? Returns a human-readable error or null. */
export function validateHostIp(ip: string, subnetCidr: string): string | null {
  const n = ipToInt(ip);
  if (n === null) return 'Not a valid IPv4 address';
  const p = parseCidr(subnetCidr);
  if (p && !(n >= p.start && n <= p.end)) return `Outside the subnet (${normalizeCidr(subnetCidr)})`;
  return null;
}

/** OCI VCN CIDR rule: valid IPv4 CIDR with prefix /16–/30. */
export function validateVcnCidr(cidr: string): string | null {
  const p = parseCidr(cidr);
  if (!p) return 'Not a valid IPv4 CIDR (e.g. 10.0.0.0/21)';
  if (p.prefix < 16 || p.prefix > 30) return 'OCI VCN CIDRs must be /16 – /30';
  return null;
}

/**
 * OCI subnet CIDR rules: valid CIDR, /30 or larger, inside the VCN, and not
 * overlapping any other subnet. Returns a human-readable error or null.
 */
export function validateSubnetCidr(
  cidr: string,
  vcnCidr: string,
  others: { name: string; cidr: string }[],
): string | null {
  const p = parseCidr(cidr);
  if (!p) return 'Not a valid IPv4 CIDR (e.g. 10.0.6.0/24)';
  if (p.prefix > 30) return 'OCI subnets must be /30 or larger';
  const vcn = parseCidr(vcnCidr);
  if (vcn) {
    if (p.prefix < vcn.prefix) return `Larger than the VCN (${normalizeCidr(vcnCidr)})`;
    if (!(p.start >= vcn.start && p.end <= vcn.end)) return `Outside the VCN (${normalizeCidr(vcnCidr)})`;
  }
  for (const other of others) {
    if (overlaps(cidr, other.cidr)) {
      return `Overlaps ${other.name || 'another subnet'} (${other.cidr})`;
    }
  }
  return null;
}

export interface FreeRange {
  start: number;
  end: number;
  /** Total addresses in the gap. */
  size: number;
  startIp: string;
  endIp: string;
}

/** Gaps inside the VCN not claimed by any (valid, contained) subnet, in order. */
export function freeRanges(vcnCidr: string, subnetCidrs: string[]): FreeRange[] {
  const vcn = parseCidr(vcnCidr);
  if (!vcn) return [];
  const taken = subnetCidrs
    .map(parseCidr)
    .filter((p): p is ParsedCidr => p !== null && p.start <= vcn.end && p.end >= vcn.start)
    .sort((a, b) => a.start - b.start);

  const gaps: FreeRange[] = [];
  let cursor = vcn.start;
  for (const t of taken) {
    if (t.start > cursor) {
      gaps.push({ start: cursor, end: t.start - 1, size: t.start - cursor, startIp: formatIp(cursor), endIp: formatIp(t.start - 1) });
    }
    cursor = Math.max(cursor, t.end + 1);
  }
  if (cursor <= vcn.end) {
    gaps.push({ start: cursor, end: vcn.end, size: vcn.end - cursor + 1, startIp: formatIp(cursor), endIp: formatIp(vcn.end) });
  }
  return gaps;
}

/** First free block of the given prefix inside the VCN (aligned, non-overlapping), or null. */
export function firstFreeBlock(vcnCidr: string, subnetCidrs: string[], prefix: number): string | null {
  const vcn = parseCidr(vcnCidr);
  if (!vcn || prefix < vcn.prefix || prefix > 32) return null;
  const blockSize = 2 ** (32 - prefix);
  for (const gap of freeRanges(vcnCidr, subnetCidrs)) {
    // Align the candidate start up to the block boundary.
    const aligned = Math.ceil(gap.start / blockSize) * blockSize;
    if (aligned + blockSize - 1 <= gap.end) {
      return `${formatIp(aligned)}/${prefix}`;
    }
  }
  return null;
}

/**
 * Suggested CIDRs for a new subnet: "continue counting" — first free block at
 * the most recently used subnet prefix, then a few smaller standard sizes.
 */
export function suggestSubnetCidrs(vcnCidr: string, subnetCidrs: string[]): string[] {
  const lastPrefix = [...subnetCidrs].reverse().map(parseCidr).find((p) => p !== null)?.prefix ?? 24;
  const prefixes = [...new Set([lastPrefix, 24, 25, 26, 27])].filter((p) => p >= (parseCidr(vcnCidr)?.prefix ?? 16) && p <= 30);
  const out: string[] = [];
  for (const prefix of prefixes) {
    const block = firstFreeBlock(vcnCidr, subnetCidrs, prefix);
    if (block && !out.includes(block)) out.push(block);
  }
  return out;
}
