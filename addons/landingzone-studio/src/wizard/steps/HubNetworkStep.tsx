/**
 * HubNetworkStep — step 2 inputs: hub kind, hub VCN CIDR, and the subnet table
 * (default subnets per hub kind + custom subnets). Writes into the canonical
 * model's `network`. Diagram / JSON wiring comes later.
 *
 * Focus for now is hub_a; switching hub kind resets the subnets to that kind's
 * defaults.
 */

import React, { useState } from 'react';
import { useWizard } from '../wizardContext';
import DeleteButton from '../../components/DeleteButton';
import { hubRoutingDefaults } from '../../model/defaults';
import { oracle } from '../../theme';
import { HUB_KINDS, getHubKind, hubKindDefaults, resolveHubName } from '../../services/hubKinds';
import {
  BASE_RANGES, baseRangeOf, moveToBaseRange, parseCidr, shiftCidr, prefixToMask,
  totalIps, usableIps, freeRanges, suggestSubnetCidrs, validateSubnetCidr, validateVcnCidr,
  hostIpInSubnet, validateHostIp,
  type BaseRangeId,
} from '../../services/cidr';
import type { HubKind, NetworkConfig, Subnet, VcnRouting } from '../../model/types';
import { FONT, s } from './networkEditorStyles';

/** Per-hub-kind documentation shown by the ⓘ button; placeholders have none yet. */
const HUB_INFO: Partial<Record<HubKind, { title: string; body: React.ReactNode }>> = {
  hub_a: {
    title: 'Hub A — Landing Zone',
    body: (
      <>
        <div style={s.docH}>Table of Contents</div>
        <ol style={s.docToc}>
          <li>Overview</li>
          <li>Components</li>
          <li>Specifications and Considerations</li>
          <li>Routing</li>
        </ol>

        <div style={s.docH}>1. Overview</div>
        <p style={{ margin: 0 }}>
          Hub A is equipped with two OCI Network Firewalls — a next-generation managed network
          firewall and an intrusion detection and prevention service. The first firewall is
          dedicated to inbound traffic, while the second is responsible for outbound and
          East-West traffic control and inspection.
        </p>

        <div style={s.docH}>2. Components</div>
        <ul style={s.docUl}>
          <li>VCN (Virtual Cloud Network)</li>
          <li>
            Two regional public subnets (depicted in green)
            <ul style={s.docUl}>
              <li>
                public-subnet for DMZ/external OCI Network Firewall (note: even though DMZ-FW is
                in a public subnet, it hasn&apos;t public interface, it has only single private
                interface with private IP address)
              </li>
              <li>public-subnet for Public Load Balancers</li>
            </ul>
          </li>
          <li>
            Four regional private subnets (depicted in dark-orange)
            <ul style={s.docUl}>
              <li>private-subnet for Internal OCI Network Firewall</li>
              <li>private-subnet for management workloads</li>
              <li>private-subnet for monitoring and logs</li>
              <li>private-subnet for DNS (for OCI DNS resolver endpoints)</li>
            </ul>
          </li>
          <li>Internet Gateway</li>
          <li>NAT Gateway</li>
          <li>Service Gateway</li>
          <li>DMZ-FW — first OCI Network Firewall: responsible for Inbound network traffic control and inspection.</li>
          <li>Internal-FW — second OCI Network Firewall: responsible for Outbound and East-West network traffic control and inspection.</li>
          <li>Public Load Balancer (LBaaS)</li>
        </ul>

        <div style={s.docH}>3. Specifications and Considerations</div>
        <ul style={s.docUl}>
          <li>Segmentation of network traffic and increased throughput: ensures efficient traffic management and higher data transfer rates.</li>
          <li>Visibility into Inbound traffic source on DMZ-FW: enables detailed control over traffic entering the Hub VCN.</li>
          <li>SSL Decryption Policy configuration on DMZ-FW to allow inspect SSL traffic before sending it to the Public Load Balancer.</li>
          <li>Higher cost compared to the Hub B model: 2 × price of the OCI Network Firewall.</li>
        </ul>
      </>
    ),
  },
};

function HubInfoModal({ title, body, onClose }: { title: string; body: React.ReactNode; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHead}>
          <div style={s.modalTitle}>{title}</div>
          <button type="button" style={s.modalClose} aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>{body}</div>
      </div>
    </div>
  );
}

/** Live VCN CIDR calculator — ported from the standalone OCI VCN CIDR Calculator. */
export function CidrCalculator({ vcnCidr, subnets }: { vcnCidr: string; subnets: { name: string; cidr: string }[] }) {
  const [open, setOpen] = useState(false);
  const vcn = parseCidr(vcnCidr);
  const vcnInvalid = validateVcnCidr(vcnCidr);

  let body: React.ReactNode;
  if (vcnInvalid || !vcn) {
    body = <div style={s.errText}>Enter a valid VCN CIDR to calculate. {vcnInvalid}</div>;
  } else {
    const total = totalIps(vcn.prefix);
    const validSubnets = subnets.filter((sn) => {
      const p = parseCidr(sn.cidr);
      return p && p.start >= vcn.start && p.end <= vcn.end;
    });
    const allocated = validSubnets.reduce((sum, sn) => sum + totalIps(parseCidr(sn.cidr)!.prefix), 0);
    const gaps = freeRanges(vcnCidr, subnets.map((sn) => sn.cidr));
    const free = gaps.reduce((sum, g) => sum + g.size, 0);

    body = (
      <>
        <div style={s.calcStats}>
          <div style={s.calcStat}><div style={s.calcStatLabel}>Netmask</div><div style={s.calcStatValue}>{prefixToMask(vcn.prefix)}</div></div>
          <div style={s.calcStat}><div style={s.calcStatLabel}>Total IPs</div><div style={s.calcStatValue}>{total.toLocaleString()}</div></div>
          <div style={s.calcStat}><div style={s.calcStatLabel}>Allocated</div><div style={s.calcStatValue}>{allocated.toLocaleString()} ({Math.round((allocated / total) * 100)}%)</div></div>
          <div style={s.calcStat}><div style={s.calcStatLabel}>Free</div><div style={s.calcStatValue}>{free.toLocaleString()}</div></div>
        </div>

        <table style={s.calcTable}>
          <thead>
            <tr>
              <th style={s.calcTh}>Subnet</th>
              <th style={s.calcTh}>CIDR</th>
              <th style={s.calcTh}>Total IPs</th>
              <th style={s.calcTh}>Usable (OCI)</th>
            </tr>
          </thead>
          <tbody>
            {subnets.map((sn, i) => {
              const p = parseCidr(sn.cidr);
              const err = validateSubnetCidr(sn.cidr, vcnCidr, subnets.filter((_, idx) => idx !== i));
              return (
                <tr key={i}>
                  <td style={{ ...s.calcTd, fontFamily: FONT }}>{sn.name}</td>
                  <td style={s.calcTd}>{sn.cidr || '—'}</td>
                  <td style={s.calcTd}>{p ? totalIps(p.prefix).toLocaleString() : '—'}</td>
                  <td style={s.calcTd}>{err ? <span style={{ color: '#b3261e', fontFamily: FONT, fontWeight: 600 }}>{err}</span> : usableIps(p!.prefix).toLocaleString()}</td>
                </tr>
              );
            })}
            {gaps.map((g, i) => (
              <tr key={`free-${i}`}>
                <td style={{ ...s.calcTd, fontFamily: FONT, color: oracle.textMuted }}>free</td>
                <td style={{ ...s.calcTd, color: oracle.textMuted }}>{g.startIp} – {g.endIp}</td>
                <td style={{ ...s.calcTd, color: oracle.textMuted }}>{g.size.toLocaleString()}</td>
                <td style={{ ...s.calcTd, color: oracle.textMuted }} />
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 11.5, color: oracle.textMuted }}>
          OCI reserves 3 IPs per subnet (network, gateway, broadcast). VCN CIDRs: /16 – /30, subnets /30 or larger.
        </div>
      </>
    );
  }

  return (
    <div style={s.calcCard}>
      <button type="button" style={s.calcHead} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>VCN CIDR Calculator</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={s.calcBody}>{body}</div>}
    </div>
  );
}

/**
 * Reusable VCN editor: RFC1918 base-range switch, VCN CIDR with validation and
 * subnet re-basing, the subnet table, the add-subnet suggestions, and the live
 * CIDR calculator. Used by the hub VCN and by every environment VCN.
 */
export function VcnEditor({ idPrefix, tokens, vcnCidr, subnets, emptyNote, onApply }: {
  idPrefix: string;
  tokens: { region: string; lze: string; env?: string };
  vcnCidr: string;
  subnets: Subnet[];
  emptyNote: string;
  onApply: (patch: { vcnCidr?: string; subnets?: Subnet[] }) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newCidr, setNewCidr] = useState('');
  const [cidrChoice, setCidrChoice] = useState('auto'); // 'auto' | 'custom' | a suggested CIDR

  // Anchor for re-basing: the last VCN CIDR that was actually valid.
  const lastValidVcn = React.useRef<string | null>(validateVcnCidr(vcnCidr) ? null : vcnCidr);
  React.useEffect(() => {
    if (!validateVcnCidr(vcnCidr)) lastValidVcn.current = vcnCidr;
  }, [vcnCidr]);

  /** VCN CIDR change re-bases every subnet by the same delta, keeping prefixes. */
  function applyVcnCidr(value: string) {
    const prev = lastValidVcn.current;
    if (!validateVcnCidr(value) && prev) {
      const delta = parseCidr(value)!.start - parseCidr(prev)!.start;
      if (delta !== 0) {
        onApply({
          vcnCidr: value,
          subnets: subnets.map((sn) => ({ ...sn, cidr: shiftCidr(sn.cidr, delta) ?? sn.cidr })),
        });
        return;
      }
    }
    onApply({ vcnCidr: value });
  }

  /** Move the VCN (and via re-base, its subnets) into another RFC1918 range. */
  function onBaseRange(id: BaseRangeId) {
    const anchor = lastValidVcn.current ?? vcnCidr;
    const moved = moveToBaseRange(anchor, id);
    if (moved && moved !== anchor) applyVcnCidr(moved);
  }

  function setSubnets(next: Subnet[]) { onApply({ subnets: next }); }
  function updateSubnet(i: number, patch: Partial<Subnet>) {
    setSubnets(subnets.map((sn, idx) => (idx === i ? { ...sn, ...patch } : sn)));
  }
  function deleteSubnet(i: number) { setSubnets(subnets.filter((_, idx) => idx !== i)); }

  const resolvedSubnets = subnets.map((sn) => ({ name: resolveHubName(sn.name, tokens), cidr: sn.cidr }));
  const vcnError = validateVcnCidr(vcnCidr);
  const activeBase = baseRangeOf(vcnCidr);
  function subnetError(i: number): string | null {
    return validateSubnetCidr(subnets[i].cidr, vcnCidr, resolvedSubnets.filter((_, idx) => idx !== i));
  }

  // Add-subnet CIDR: suggestions continue counting from the allocated space.
  const suggestions = suggestSubnetCidrs(vcnCidr, subnets.map((sn) => sn.cidr));
  const newSubnetCidr = cidrChoice === 'custom' ? newCidr.trim() : cidrChoice === 'auto' ? (suggestions[0] ?? '') : cidrChoice;
  const newSubnetError = newSubnetCidr
    ? validateSubnetCidr(newSubnetCidr, vcnCidr, resolvedSubnets)
    : 'No free block — enter a CIDR manually';
  function addSubnet() {
    if (newSubnetError) return;
    setSubnets([...subnets, { name: newName.trim() || 'custom', cidr: newSubnetCidr }]);
    setNewName('');
    setNewCidr('');
    setCidrChoice('auto');
  }

  return (
    <>
      <div style={{ marginTop: 16 }}>
        <label style={s.label}>Base range</label>
        <div style={s.baseRow} role="group" aria-label="VCN base range">
          {BASE_RANGES.map((range) => {
            const active = range.id === activeBase;
            return (
              <button
                key={range.id}
                type="button"
                style={active ? { ...s.basePill, ...s.basePillActive } : s.basePill}
                aria-pressed={active}
                title={range.cidr}
                onClick={() => onBaseRange(range.id)}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        <label style={s.label} htmlFor={`${idPrefix}-vcn-cidr`}>VCN CIDR</label>
        <input
          id={`${idPrefix}-vcn-cidr`}
          style={vcnError ? { ...s.input, ...s.errInput } : s.input}
          value={vcnCidr}
          placeholder="10.0.0.0/21"
          onChange={(e) => applyVcnCidr(e.target.value)}
        />
        {vcnError && <div style={s.errText}>{vcnError}</div>}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={s.tableHead}>
          <span>Subnet</span>
          <span>CIDR</span>
          <span />
        </div>
        {subnets.length === 0 && <div style={s.empty}>{emptyNote}</div>}
        {subnets.map((sn, i) => {
          const resolved = resolveHubName(sn.name, tokens);
          const err = subnetError(i);
          return (
            <div key={i} style={s.row}>
              <input
                aria-label={`Subnet ${i + 1} name`}
                style={s.rowInput}
                value={resolved}
                onChange={(e) => updateSubnet(i, { name: e.target.value })}
              />
              <div>
                <input
                  aria-label={`Subnet ${i + 1} CIDR`}
                  style={err ? { ...s.rowInput, ...s.errInput } : s.rowInput}
                  value={sn.cidr}
                  onChange={(e) => updateSubnet(i, { cidr: e.target.value })}
                />
                {err && <div style={s.errText}>{err}</div>}
              </div>
              {sn.locked
                ? <span title="Mandatory subnet — can't be removed" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, color: oracle.textMuted, fontSize: 15 }} aria-label="Locked subnet">🔒</span>
                : <DeleteButton label={`Delete subnet ${resolved}`} onClick={() => deleteSubnet(i)} />}
            </div>
          );
        })}

        <div style={s.subCard}>
          <div style={s.subHead}>Add custom subnet</div>
          <div style={s.addGrid}>
            <div>
              <label style={s.addLabel} htmlFor={`${idPrefix}-new-subnet-name`}>Name</label>
              <input
                id={`${idPrefix}-new-subnet-name`}
                style={s.rowInput}
                placeholder="custom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addSubnet(); }}
              />
            </div>
            <div>
              <label style={s.addLabel} htmlFor={`${idPrefix}-new-subnet-cidr`}>CIDR</label>
              <select
                id={`${idPrefix}-new-subnet-cidr`}
                style={s.select}
                value={cidrChoice}
                onChange={(e) => setCidrChoice(e.target.value)}
              >
                {suggestions.length > 0 ? (
                  suggestions.map((cidr, i) => (
                    <option key={cidr} value={i === 0 ? 'auto' : cidr}>
                      {cidr} — next free /{cidr.split('/')[1]}
                    </option>
                  ))
                ) : (
                  <option value="auto" disabled>No free block in the VCN</option>
                )}
                <option value="custom">Custom…</option>
              </select>
              {cidrChoice === 'custom' && (
                <input
                  aria-label="Custom subnet CIDR"
                  style={{ ...s.rowInput, marginTop: 8, ...(newCidr.trim() && newSubnetError ? s.errInput : {}) }}
                  placeholder="10.0.6.0/24"
                  value={newCidr}
                  onChange={(e) => setNewCidr(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addSubnet(); }}
                />
              )}
              {newSubnetError && (cidrChoice !== 'custom' || newCidr.trim() !== '') && (
                <div style={s.errText}>{newSubnetError}</div>
              )}
            </div>
            <button
              type="button"
              style={newSubnetError ? { ...s.addBtn, ...s.addBtnDisabled } : s.addBtn}
              disabled={!!newSubnetError}
              onClick={addSubnet}
            >
              Add Subnet
            </button>
          </div>
        </div>

        <CidrCalculator vcnCidr={vcnCidr} subnets={resolvedSubnets} />
      </div>
    </>
  );
}

/**
 * Per-VCN routing editor — collapsible, collapsed by default. Holds the VCN's
 * DRG attachment name + its gateway names (hub also carries the DRG name and the
 * Internet/NAT Gateway names). All routing fields are diagram-only labels.
 */
export function RoutingEditor({ idPrefix, isHub, drgName, routing, tokens, onDrg, onRouting }: {
  idPrefix: string;
  isHub: boolean;
  drgName?: string;
  routing: VcnRouting;
  tokens: { region: string; lze: string; env?: string };
  onDrg?: (value: string) => void;
  onRouting: (patch: Partial<VcnRouting>) => void;
}) {
  const [open, setOpen] = useState(false);
  const field = (id: string, label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div>
      <label style={s.label} htmlFor={`${idPrefix}-${id}`}>{label}</label>
      <input id={`${idPrefix}-${id}`} style={s.input} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
  return (
    <div style={s.calcCard}>
      <button type="button" style={s.calcHead} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>Routing</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ ...s.calcBody, display: 'grid', gap: 14 }}>
          {isHub && onDrg && field('drg', 'DRG name', drgName ?? '', onDrg, 'DRG')}
          {field('attach', 'VCN attachment name', resolveHubName(routing.attachmentName, tokens), (v) => onRouting({ attachmentName: v }), 'vcn-<env>-attach')}
          <div style={{ display: 'grid', gridTemplateColumns: isHub ? '1fr 1fr 1fr' : '1fr', gap: 12 }}>
            {isHub && field('igw', 'Internet Gateway', routing.igwName ?? '', (v) => onRouting({ igwName: v }), 'Internet Gateway')}
            {isHub && field('nat', 'NAT Gateway', routing.natName ?? '', (v) => onRouting({ natName: v }), 'NAT Gateway')}
            {field('sgw', 'Service Gateway', routing.sgwName, (v) => onRouting({ sgwName: v }), 'Service Gateway')}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Network-firewall IP field. Shows the stored value, or an in-range default
 * derived from the firewall's subnet when blank; flags an out-of-range entry.
 */
function FwIpField({ id, label, subnetCidr, value, onChange }: {
  id: string;
  label: string;
  subnetCidr: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const derived = hostIpInSubnet(subnetCidr);
  const shown = value.trim() || derived;
  const err = value.trim() ? validateHostIp(value, subnetCidr) : null;
  return (
    <div>
      <label style={s.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        style={err ? { ...s.input, ...s.errInput } : s.input}
        value={shown}
        placeholder={derived}
        onChange={(e) => onChange(e.target.value)}
      />
      {err && <div style={s.errText}>{err}</div>}
    </div>
  );
}

export default function HubNetworkStep() {
  const { model, setField } = useWizard();
  const n = model.network;
  const kind = getHubKind(n.hubKind);
  // <region> / <lze> tokens in names resolve live from Step 1.
  const tokens = { region: model.foundation.regionShortName, lze: model.presentation.landingZone };
  const vcnResolved = resolveHubName(n.hubVcnName, tokens);

  const [infoOpen, setInfoOpen] = useState(false);
  const info = HUB_INFO[n.hubKind];
  const hubRouting = n.routing ?? hubRoutingDefaults(); // stale in-memory records may predate routing

  function setNetwork(patch: Partial<NetworkConfig>) {
    setField('network', { ...n, ...patch });
  }
  function onHubKind(id: HubKind) {
    // Switching hub kind resets the VCN name/CIDR + subnets to that kind's defaults,
    // but keeps the rest of the network (firewall IPs, DRG name, routing labels) so
    // those fields never become undefined.
    setField('network', { ...n, hubKind: id, ...hubKindDefaults(id) });
  }

  return (
    <div style={s.col}>
      <section style={s.panel}>
        <div style={s.accent} />
        <div style={s.body}>
          <div style={s.title}>Hub network</div>

          <label style={s.label}>Hub kind</label>
          <div style={s.kindRow} role="group" aria-label="Hub kind">
            {HUB_KINDS.map((k) => {
              const active = k.id === n.hubKind;
              return (
                <button
                  key={k.id}
                  type="button"
                  style={active ? { ...s.kindBtn, ...s.kindBtnActive } : s.kindBtn}
                  aria-pressed={active}
                  onClick={() => onHubKind(k.id)}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
          <div style={s.helpRow}>
            <div style={s.help}>{kind?.description}</div>
            {info && (
              <button
                type="button"
                style={s.infoBtn}
                aria-label={`About ${kind?.label}`}
                title={`About ${kind?.label}`}
                onClick={() => setInfoOpen(true)}
              >
                i
              </button>
            )}
          </div>
          {infoOpen && info && <HubInfoModal title={info.title} body={info.body} onClose={() => setInfoOpen(false)} />}

          {!kind?.implemented ? (
            <div style={{ ...s.empty, borderTop: `1px dashed ${oracle.border}`, borderRadius: 6 }}>
              {kind?.label} isn&apos;t specified yet — the network details and diagram will appear here once this hub model is defined.
            </div>
          ) : (
            <>
              <label style={s.label} htmlFor="hub-vcn-name">Hub VCN name</label>
              <input
                id="hub-vcn-name"
                style={s.input}
                value={vcnResolved}
                placeholder="vcn-<region>-<lze>-hub"
                onChange={(e) => setNetwork({ hubVcnName: e.target.value })}
              />

              <VcnEditor
                idPrefix="hub"
                tokens={tokens}
                vcnCidr={n.hubVcnCidr}
                subnets={n.subnets}
                emptyNote="No default subnets for this hub kind — add custom subnets below."
                onApply={(patch) => setNetwork({
                  ...(patch.vcnCidr !== undefined ? { hubVcnCidr: patch.vcnCidr } : {}),
                  ...(patch.subnets ? { subnets: patch.subnets } : {}),
                })}
              />

              {(() => {
                const dmzSn = n.subnets.find((sub) => sub.name.endsWith('-fw-dmz'));
                const intSn = n.subnets.find((sub) => sub.name.endsWith('-fw-int'));
                if (!dmzSn && !intSn) return null;
                return (
                  <div style={s.subCard}>
                    <div style={s.subHead}>Network firewall IPs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: dmzSn && intSn ? '1fr 1fr' : '1fr', gap: 12 }}>
                      {dmzSn && (
                        <FwIpField id="fw-dmz-ip" label="DMZ firewall IP" subnetCidr={dmzSn.cidr} value={n.fwDmzIp} onChange={(v) => setNetwork({ fwDmzIp: v })} />
                      )}
                      {intSn && (
                        <FwIpField id="fw-int-ip" label="Internal firewall IP" subnetCidr={intSn.cidr} value={n.fwIntIp} onChange={(v) => setNetwork({ fwIntIp: v })} />
                      )}
                    </div>
                  </div>
                );
              })()}

              <RoutingEditor
                idPrefix="hub"
                isHub
                drgName={n.drgName ?? 'DRG'}
                routing={hubRouting}
                tokens={tokens}
                onDrg={(v) => setNetwork({ drgName: v })}
                onRouting={(patch) => setNetwork({ routing: { ...hubRouting, ...patch } })}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
