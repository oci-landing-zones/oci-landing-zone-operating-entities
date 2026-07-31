import { describe, expect, it } from 'vitest';
import {
  parseCidr, normalizeCidr, prefixToMask, contains, overlaps, usableIps,
  shiftCidr, validateVcnCidr, validateSubnetCidr, freeRanges, firstFreeBlock,
  suggestSubnetCidrs, baseRangeOf, moveToBaseRange, hostIpInSubnet, validateHostIp,
} from './cidr';

describe('firewall host IPs', () => {
  it('derives an in-range host IP from the subnet', () => {
    expect(hostIpInSubnet('10.0.0.0/24')).toBe('10.0.0.4');
    expect(hostIpInSubnet('172.16.2.0/24')).toBe('172.16.2.4');
    expect(hostIpInSubnet('10.0.0.0/30')).toBe('10.0.0.0'); // offset past the block falls back to network
    expect(hostIpInSubnet('nonsense')).toBe('');
  });

  it('validates a host IP against its subnet', () => {
    expect(validateHostIp('10.0.0.9', '10.0.0.0/24')).toBeNull();
    expect(validateHostIp('10.0.1.9', '10.0.0.0/24')).toMatch(/Outside the subnet/);
    expect(validateHostIp('not-an-ip', '10.0.0.0/24')).toMatch(/valid IPv4/);
  });
});

describe('parse / format', () => {
  it('parses and normalises CIDRs to their network address', () => {
    expect(normalizeCidr('10.100.3.17/24')).toBe('10.100.3.0/24');
    expect(normalizeCidr('10.100.0.0/21')).toBe('10.100.0.0/21');
    expect(parseCidr('not-a-cidr')).toBeNull();
    expect(parseCidr('10.0.0.0')).toBeNull();
    expect(parseCidr('::1/64')).toBeNull();
    expect(parseCidr('10.0.0.0/33')).toBeNull();
  });

  it('computes masks and OCI usable counts (3 reserved per subnet)', () => {
    expect(prefixToMask(24)).toBe('255.255.255.0');
    expect(prefixToMask(21)).toBe('255.255.248.0');
    expect(usableIps(24)).toBe(253);
    expect(usableIps(30)).toBe(1);
  });

  it('checks containment and overlap', () => {
    expect(contains('10.100.0.0/21', '10.100.3.0/24')).toBe(true);
    expect(contains('10.100.0.0/21', '10.100.8.0/24')).toBe(false);
    expect(overlaps('10.100.0.0/24', '10.100.0.128/25')).toBe(true);
    expect(overlaps('10.100.0.0/24', '10.100.1.0/24')).toBe(false);
  });
});

describe('shiftCidr (VCN re-base)', () => {
  it('moves a subnet by the VCN delta, keeping the prefix', () => {
    const oldVcn = parseCidr('10.100.0.0/21')!;
    const newVcn = parseCidr('10.200.16.0/21')!;
    const delta = newVcn.start - oldVcn.start;
    expect(shiftCidr('10.100.3.0/24', delta)).toBe('10.200.19.0/24');
    expect(shiftCidr('10.100.0.0/24', delta)).toBe('10.200.16.0/24');
  });
});

describe('base ranges (RFC1918)', () => {
  it('identifies which base range a CIDR lives in', () => {
    expect(baseRangeOf('10.100.0.0/21')).toBe('10');
    expect(baseRangeOf('172.16.4.0/21')).toBe('172');
    expect(baseRangeOf('192.168.0.0/21')).toBe('192');
    expect(baseRangeOf('8.8.8.0/24')).toBeNull();
  });

  it('moves a VCN into another base range, preserving the offset when it fits', () => {
    // offset 0.8.0 within 172.16/12 fits in 10/8 and 192.168/16
    expect(moveToBaseRange('172.16.8.0/21', '10')).toBe('10.0.8.0/21');
    expect(moveToBaseRange('172.16.8.0/21', '192')).toBe('192.168.8.0/21');
    // 10.100.0.0's offset is too big for 172.16/12 → lands at the range start
    expect(moveToBaseRange('10.100.0.0/21', '172')).toBe('172.16.0.0/21');
    // a /16 block fits exactly into 192.168/16
    expect(moveToBaseRange('10.5.0.0/16', '192')).toBe('192.168.0.0/16');
  });
});

describe('OCI validation', () => {
  it('validates VCN CIDRs (/16–/30)', () => {
    expect(validateVcnCidr('10.100.0.0/21')).toBeNull();
    expect(validateVcnCidr('10.0.0.0/8')).toMatch(/16/);
    expect(validateVcnCidr('10.0.0.0/31')).toMatch(/16/);
    expect(validateVcnCidr('banana')).toMatch(/valid/i);
  });

  it('validates subnet CIDRs: format, size, containment, overlap', () => {
    const vcn = '10.100.0.0/21';
    const others = [{ name: 'mgmt', cidr: '10.100.3.0/24' }];
    expect(validateSubnetCidr('10.100.6.0/24', vcn, others)).toBeNull();
    expect(validateSubnetCidr('nope', vcn, others)).toMatch(/valid/i);
    expect(validateSubnetCidr('10.100.6.0/31', vcn, others)).toMatch(/\/30/);
    expect(validateSubnetCidr('10.200.0.0/24', vcn, others)).toMatch(/Outside/);
    expect(validateSubnetCidr('10.100.0.0/20', vcn, others)).toMatch(/Larger/);
    expect(validateSubnetCidr('10.100.3.128/25', vcn, others)).toMatch(/Overlaps mgmt/);
  });
});

describe('free space + suggestions', () => {
  const vcn = '10.100.0.0/21';
  const subnets = ['10.100.0.0/24', '10.100.1.0/24', '10.100.2.0/24'];

  it('finds the free ranges inside the VCN', () => {
    const gaps = freeRanges(vcn, subnets);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].startIp).toBe('10.100.3.0');
    expect(gaps[0].endIp).toBe('10.100.7.255');
    // a gap in the middle is found too
    const withHole = freeRanges(vcn, ['10.100.0.0/24', '10.100.2.0/24']);
    expect(withHole[0].startIp).toBe('10.100.1.0');
    expect(withHole[0].endIp).toBe('10.100.1.255');
  });

  it('first free block continues counting from the allocated space', () => {
    expect(firstFreeBlock(vcn, subnets, 24)).toBe('10.100.3.0/24');
    expect(firstFreeBlock(vcn, subnets, 25)).toBe('10.100.3.0/25');
    // nothing fits when the VCN is full
    expect(firstFreeBlock('10.100.0.0/24', ['10.100.0.0/24'], 25)).toBeNull();
  });

  it('suggests the next free blocks, last-used prefix first', () => {
    const suggestions = suggestSubnetCidrs(vcn, subnets);
    expect(suggestions[0]).toBe('10.100.3.0/24');
    expect(suggestions).toContain('10.100.3.0/25');
  });
});
