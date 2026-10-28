import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useWizard } from '../wizardContext';
import type { CrossConnectMapping, FastConnectConfig, VpnTunnel } from '../../model/hybridConnectivity';
import { ipsecPhaseOptions } from '../../model/hybridConnectivity';
import { bandwidthShapeError, bgpMd5KeyError, emptyHybridConnectivity, newVpn, vpnIdentityError, vpnSharedSecretError } from '../../services/hybridConnectivity';
import { FONT, s } from './networkEditorStyles';
import { connectivityCatalog, cpeDeviceError, providerSelectionError, providerServicesForRegion, selectCpeDevice, selectProviderService } from '../../services/connectivityCatalog';
import DeleteButton from '../../components/DeleteButton';
import Switch from '../../components/Switch';
import FieldHelp, { type FieldHelpContent } from './FieldHelp';
import FieldError from '../../components/FieldError';
import { connectivityHelp as help } from './connectivityHelp';
import { oracle } from '../../theme';
import './ConnectivityEditor.css';

const group: CSSProperties = { border: 0, borderTop: `1px solid ${oracle.border}`, padding: '16px 0 0', margin: 0, minWidth: 0 };
const disclosure: CSSProperties = { ...s.envHeadTitle, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const labelRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, minHeight: 24, marginBottom: 4 };
const fieldLabel: CSSProperties = { ...s.addLabel, marginBottom: 0, fontSize: 12.5, fontWeight: 600, textTransform: 'none', letterSpacing: 0 };
const list = (text: string) => text.trim() ? text.split(',').map((s) => s.trim()) : [];

export function Chevron() {
  return <svg className="connectivity-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>;
}

function Field({ label, ariaLabel, help, value, onChange, secret = false, type = 'text', note, invalid = false }: {
  label: string; ariaLabel?: string; help: FieldHelpContent; value?: string | number; onChange: (value: string) => void; secret?: boolean; type?: string; note?: string; invalid?: boolean;
}) {
  const id = useId();
  return <div><div style={labelRow}><label style={fieldLabel} htmlFor={id}>{label}</label><FieldHelp id={`${id}-help`} label={ariaLabel ?? label} help={help} /></div><input id={id} aria-label={ariaLabel} aria-invalid={invalid || undefined} aria-describedby={`${id}-help${note ? ` ${id}-note` : ''}`} style={{ ...s.rowInput, minHeight: 38, lineHeight: '20px', ...(invalid ? s.errInput : {}) }} type={secret ? 'password' : type} autoComplete={secret ? 'new-password' : 'off'} autoCapitalize="none" spellCheck={false} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{invalid ? <FieldError id={`${id}-note`} error={note} /> : note && <p id={`${id}-note`} style={{ ...s.help, marginTop: 6, fontWeight: 400 }}>{note}</p>}</div>;
}

function Choice({ label, ariaLabel, help, value, options, onChange, note }: {
  label: string; ariaLabel?: string; help: FieldHelpContent; value: string; options: [string, string][]; onChange: (value: string) => void; note?: string;
}) {
  const id = useId();
  const unsupported = !options.some(([option]) => option === value);
  return <div><div style={labelRow}><label style={fieldLabel} htmlFor={id}>{label}</label><FieldHelp id={`${id}-help`} label={ariaLabel ?? label} help={help} /></div><span className="connectivity-select"><select id={id} aria-label={ariaLabel} aria-invalid={unsupported || undefined} aria-describedby={`${id}-help${unsupported || note ? ` ${id}-note` : ''}`} style={{ ...s.input, appearance: 'none', paddingRight: 36, minHeight: 38, lineHeight: '20px', ...(unsupported ? s.errInput : {}) }} value={value} onChange={(e) => onChange(e.target.value)}>{unsupported && <option value={value} disabled>Unsupported value: {value}</option>}{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select><Chevron /></span>{unsupported ? <FieldError id={`${id}-note`} error="Choose a supported value from the list." /> : note && <p id={`${id}-note`} style={{ ...s.help, marginTop: 6, fontWeight: 400 }}>{note}</p>}</div>;
}

const commonBandwidths = ['1 Gbps', '10 Gbps', '100 Gbps'];

function BandwidthField({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(false);
  const customSelected = custom || Boolean(value && !commonBandwidths.includes(value));
  const error = bandwidthShapeError(value);
  return <div style={{ alignSelf: 'start' }}>
    <Choice label="Provisioned bandwidth" help={help.bandwidth} value={customSelected ? 'custom' : value ?? ''} options={[["", 'Select bandwidth'], ...commonBandwidths.map((shape): [string, string] => [shape, shape]), ['custom', 'Other bandwidth']]} onChange={(selection) => {
      setCustom(selection === 'custom');
      if (selection !== 'custom') onChange(selection);
    }} />
    {customSelected && <div style={{ marginTop: 12 }}><Field label="Custom bandwidth" help={help.bandwidth} value={value} onChange={onChange} invalid={Boolean(error)} note={error || 'Use the exact shape name, for example 20 Gbps.'} /></div>}
    <p style={{ ...s.help, marginTop: 6 }}>Confirm the selected shape is available for your provider and region.</p>
  </div>;
}

function ProviderServiceField({ circuit, realm, region, onChange }: { circuit: FastConnectConfig; realm: string; region: string; onChange: (circuit: FastConnectConfig) => void }) {
  const available = providerServicesForRegion(realm, region);
  const selected = available.find((service) => service.ocid === circuit.provider_service_id);
  const value = selected?.ocid ?? (circuit.provider_service_id !== undefined ? 'ocid' : '');
  const error = providerSelectionError(circuit, realm, region);
  const manual = !available.length || value === 'ocid' || Boolean(error);
  return <div role="group" aria-label="Provider service selection" style={{ gridColumn: '1 / -1' }}>
    {available.length > 0 && <Choice label="Provider service" help={help.provider} value={value} options={[
      ['', 'Direct / physical connection'],
      ...available.map((service): [string, string] => [service.ocid, service.label]),
      ['ocid', 'Other provider service (enter OCID)'],
    ]} onChange={(selection) => onChange(selectProviderService(circuit, selection, realm, region))} />}
    {manual && <div style={available.length ? { marginTop: 12 } : undefined}>
      <Field label="Provider service OCID" help={help.provider} note={error || 'Leave empty for a direct physical connection.'} value={circuit.provider_service_id} invalid={Boolean(error)} onChange={(provider_service_id) => {
        const next = selectProviderService(circuit, '', realm, region);
        if (provider_service_id) next.provider_service_id = provider_service_id;
        else delete next.provider_service_id;
        onChange(next);
      }} />
    </div>}
  </div>;
}

function AddEntry({ label, owner, names, onAdd }: { label: string; owner?: string; names: string[]; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  const id = useId();
  const action = `Add ${label}${owner ? ` to ${owner}` : ''}`;
  const duplicate = names.some((n) => n.replaceAll('_', '-') === name.replaceAll('_', '-'));
  const valid = /^[a-z0-9][a-z0-9_-]{0,39}$/.test(name) && !duplicate;
  const error = name && !valid ? duplicate ? 'This name is already in use. Choose another name.' : 'Use 1–40 lowercase letters, numbers, hyphens or underscores, starting with a letter or number.' : '';
  return <section className="connectivity-add" aria-labelledby={id}>
    <h3 id={id} style={{ ...s.subHead, fontSize: 13, overflowWrap: 'anywhere' }}>{action}</h3>
    <div className="connectivity-add-row">
      <Field label="Name" ariaLabel={`${label} name${owner ? ` for ${owner}` : ''}`} help={help.name} value={name} onChange={setName} invalid={Boolean(error)} note={error || undefined} />
      <div className="connectivity-add-action"><button type="button" aria-label={action} style={{ ...s.addBtn, ...(!valid ? s.addBtnDisabled : {}), marginTop: 0, ...(!valid ? { color: oracle.ink } : {}) }} disabled={!valid} onClick={() => { onAdd(name); setName(''); }}>Add {label}</button></div>
    </div>
    {!error && <p style={{ ...s.help, marginTop: 6 }}>Use lowercase letters, numbers, hyphens or underscores. Up to 40 characters.</p>}
  </section>;
}

function Card({ name, type, attention, onDelete, children }: { name: string; type: string; attention?: boolean; onDelete: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  const title = `${type} ${name}`;
  return <div className="connectivity-resource" style={{ borderTop: `1px solid ${oracle.border}` }}>
    <div className="connectivity-resource-header" style={{ background: oracle.surfaceAlt }}>
      <button type="button" className="connectivity-resource-toggle" aria-label={title} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span style={{ display: 'grid', gap: 2 }}><span style={{ ...s.envHeadTitle, fontSize: 14, overflowWrap: 'anywhere' }}>{title}</span>{attention && <span style={{ ...s.errText, marginTop: 0, fontWeight: 400 }}>Settings need attention</span>}</span><Chevron />
      </button>
      <DeleteButton label={`Delete ${title}`} onClick={onDelete} />
    </div>
    <div id={id} hidden={!open} role="group" aria-label={title} className="connectivity-resource-body">
      <div className="connectivity-grid">{children}</div>
    </div>
  </div>;
}

function TunnelFields({ name, tunnel, onChange }: { name: string; tunnel: VpnTunnel; onChange: (t: VpnTunnel) => void }) {
  const keyError = vpnSharedSecretError(tunnel);
  const set = (key: keyof VpnTunnel, value: unknown) => {
    const next = { ...tunnel, [key]: value };
    if (value === '') delete next[key];
    onChange(next);
  };
  const phase = (one: boolean, key: string, value: string | boolean) => {
    const field = one ? 'phase_one_details' : 'phase_two_details';
    const next = { ...tunnel[field], [key]: key === 'lifetime' && value !== '' ? Number(value) : value };
    if (value === '') delete next[key];
    set(field, next);
  };
  return <details className="connectivity-disclosure connectivity-tunnel" style={{ borderTop: `1px solid ${oracle.border}` }}>
    <summary style={disclosure}><span className="connectivity-tunnel-heading"><span>{name}</span><span style={{ ...s.help, fontWeight: 400 }}>{tunnel.routing === 'BGP' ? 'BGP' : 'Static'} · {tunnel.ike_version === 'V1' ? 'IKEv1' : 'IKEv2'}</span>{keyError && <span style={{ ...s.errText, marginTop: 0, fontWeight: 400 }}>Key needs attention</span>}</span><Chevron /></summary>
    <fieldset className="connectivity-tunnel-body"><legend className="sr-only">{name}</legend>
    <div className="connectivity-grid">
      <Choice label="Routing" help={help.routing} value={tunnel.routing} options={[['STATIC', 'Static'], ['BGP', 'BGP']]} note={tunnel.routing === 'BGP' ? 'Your router exchanges routes with OCI. Ask your network team for its ASN and the inside-tunnel IP pair below.' : 'Use the remote networks entered above as fixed routes. Your network team must configure return routes on the router.'} onChange={(routing) => onChange({ ...tunnel, routing: routing as VpnTunnel['routing'], bgp_session_info: routing === 'BGP' ? {} : undefined })} />
      <Choice label="IKE version" help={help.ike} value={tunnel.ike_version ?? 'V2'} options={[['V2', 'IKEv2'], ['V1', 'IKEv1']]} onChange={(value) => set('ike_version', value)} />
      <Choice label="Key source" help={help.keyMode} value={tunnel.secretMode ?? 'oci'} options={[['oci', 'OCI-generated'], ['vault', 'Existing Vault secret OCID'], ['inline', 'Enter key for this session']]} note={tunnel.secretMode === 'vault' ? 'Use an existing secret readable by your deployment account. The LZ Vault can host it; this form does not create the secret.' : tunnel.secretMode === 'inline' ? 'Use the key agreed with your router administrator. Downloads include it; Studio clears it when you reopen the design.' : 'For a new tunnel, OCI creates the key during deployment. Retrieve it from OCI for your router. This choice does not reset an existing key.'} onChange={(value) => onChange({ ...tunnel, secretMode: value as VpnTunnel['secretMode'], shared_secret: undefined })} />
      {tunnel.secretMode !== 'oci' && tunnel.secretMode && <Field label={tunnel.secretMode === 'inline' ? 'Pre-shared key (session only)' : 'Vault secret OCID'} help={tunnel.secretMode === 'inline' ? help.vpnKey : help.vaultSecret} secret={tunnel.secretMode === 'inline'} value={tunnel.shared_secret} invalid={Boolean(keyError)} note={keyError} onChange={(value) => set('shared_secret', value)} />}
      {tunnel.routing === 'BGP' && <>
        <p style={{ ...s.help, gridColumn: '1 / -1' }}>Inside-tunnel IPs are the two ends of the BGP session, separate from the public VPN endpoints. Use different hosts in the same /30 or /31 and a separate pair for each tunnel. For example: customer 169.254.20.1/30 and Oracle 169.254.20.2/30 for Tunnel 1.</p>
        {(['customer_bgp_asn', 'customer_interface_ip', 'oracle_interface_ip'] as const).map((key, i) => <Field key={key} label={['Customer BGP ASN', 'Customer tunnel IP/prefix', 'Oracle tunnel IP/prefix'][i]} help={[help.vpnAsn, help.customerTunnelIp, help.oracleTunnelIp][i]} value={tunnel.bgp_session_info?.[key]} onChange={(value) => set('bgp_session_info', { ...tunnel.bgp_session_info, [key]: value })} />)}
      </>}
    </div>
    <details className="connectivity-disclosure" style={{ marginTop: 18 }}><summary style={disclosure}>Advanced IKE / IPSec settings<Chevron /></summary>
      <p style={{ ...s.help, marginTop: 8 }}>Automatic negotiation lets OCI and your router agree on a matching proposal. The lists below show published commercial-cloud settings; confirm current proposals for your region in OCI. The negotiated algorithms are known after connection.</p>
      <div className="connectivity-phases">{[true, false].map((one) => {
        const field = one ? 'phase_one_details' : 'phase_two_details';
        const prefix = one ? 'Phase 1' : 'Phase 2';
        const options = ipsecPhaseOptions[field];
        const dhGroups = one ? ipsecPhaseOptions.phase_one_details.custom_dh_group : ipsecPhaseOptions.phase_two_details.dh_group;
        const custom = tunnel[field]?.[one ? 'is_custom_phase_one_config' : 'is_custom_phase_two_config'] === true;
        // Oracle's commercial-cloud guide omits GROUP24 from its standard phase-one proposal list.
        const publishedDh = one ? dhGroups.filter((value) => value !== 'GROUP24') : ['GROUP5'];
        const pfs = tunnel.phase_two_details?.is_pfs_enabled;
        const gcm = !one && String(tunnel[field]?.custom_encryption_algorithm ?? '').endsWith('_GCM');
        const lifetime = tunnel[field]?.lifetime;
        const proposals: [string, string, FieldHelpContent][] = [
          ['Authentication proposals', options.custom_authentication_algorithm.join(', ') + (one ? '' : ' (CBC); GCM includes authentication.'), one ? help.phase1Auth : help.phase2Auth],
          ['Encryption proposals', options.custom_encryption_algorithm.join(', '), one ? help.phase1Encryption : help.phase2Encryption],
          ['DH group', !one && pfs === false ? 'Not used: PFS is disabled.' : publishedDh.join(', '), help.dh],
        ];
        return <fieldset key={field} className="connectivity-phase" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><legend style={{ ...s.subHead, marginBottom: 6 }}>{prefix}: {one ? 'IKE' : 'IPSec'}</legend>
          <p style={{ ...s.help, marginBottom: 12 }}>{one ? 'Authenticates the VPN peers and protects the negotiation channel.' : 'Protects the application traffic carried by the tunnel.'}</p>
          <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <span style={{ ...fieldLabel, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Custom algorithms<FieldHelp label={`${prefix} custom algorithms`} help={help.customPhase} /></span>
            <Switch checked={custom} ariaLabel={`${prefix} custom algorithms`} onChange={(checked) => phase(one, one ? 'is_custom_phase_one_config' : 'is_custom_phase_two_config', checked)} />
          </div>
          {custom && <>
            <Choice label="Authentication algorithm" ariaLabel={`${prefix} authentication algorithm`} help={one ? help.phase1Auth : help.phase2Auth} options={[["", gcm ? 'Included in GCM' : 'Automatic negotiation'], ...options.custom_authentication_algorithm.map((value): [string, string] => [value, value])]} value={String(tunnel[field]?.custom_authentication_algorithm ?? '')} note={gcm ? 'GCM includes authentication; a separate authentication algorithm is not required.' : !tunnel[field]?.custom_authentication_algorithm ? `Published proposals: ${proposals[0][1]}` : undefined} onChange={(value) => phase(one, 'custom_authentication_algorithm', value)} />
            <Choice label="Encryption algorithm" ariaLabel={`${prefix} encryption algorithm`} help={one ? help.phase1Encryption : help.phase2Encryption} options={[["", 'Automatic negotiation'], ...options.custom_encryption_algorithm.map((value): [string, string] => [value, value])]} value={String(tunnel[field]?.custom_encryption_algorithm ?? '')} note={!tunnel[field]?.custom_encryption_algorithm ? `Published proposals: ${proposals[1][1]}` : undefined} onChange={(value) => phase(one, 'custom_encryption_algorithm', value)} />
            <Choice label="DH group" ariaLabel={`${prefix} DH group`} help={help.dh} options={[["", one ? 'Automatic negotiation' : pfs === false ? 'Not used: PFS off' : 'GROUP5 (OCI setting)'], ...dhGroups.map((value): [string, string] => [value, value])]} value={String(tunnel[field]?.[one ? 'custom_dh_group' : 'dh_group'] ?? '')} note={!one && pfs === false ? 'The DH group is not used while PFS is disabled.' : !tunnel[field]?.[one ? 'custom_dh_group' : 'dh_group'] ? `Published setting: ${proposals[2][1]}` : undefined} onChange={(value) => phase(one, one ? 'custom_dh_group' : 'dh_group', value)} />
          </>}
          {!custom && <div role="group" aria-label={`${prefix} automatic proposals`} style={{ display: 'grid', gap: 12 }}>
            {proposals.map(([label, values, detail]) => <div key={label}><div style={labelRow}><span style={fieldLabel}>{label}</span><FieldHelp label={`${prefix} ${label}`} help={detail} /></div><p style={{ ...s.help, color: oracle.text, overflowWrap: 'anywhere' }}>{values}</p></div>)}
          </div>}
          <Field label="Lifetime (seconds)" ariaLabel={`${prefix} lifetime (seconds)`} help={one ? help.phase1Lifetime : help.phase2Lifetime} type="number" value={String(lifetime ?? '')} note={lifetime == null || lifetime === '' ? `Published OCI lifetime: ${one ? '28800 seconds (8 hours)' : '3600 seconds (1 hour)'}. Leave empty for service settings.` : undefined} onChange={(value) => phase(one, 'lifetime', value)} />
          {!one && <Choice label="Perfect forward secrecy (PFS)" ariaLabel="Phase 2 perfect forward secrecy" help={help.pfs} value={typeof pfs === 'boolean' ? String(pfs) : 'oci'} options={[["oci", 'Enabled (OCI setting)'], ["true", 'Enabled'], ["false", 'Disabled']]} note={typeof pfs !== 'boolean' ? 'Published OCI setting: enabled with GROUP5. Confirm settings for your region and realm.' : undefined} onChange={(value) => phase(false, 'is_pfs_enabled', value === 'oci' ? '' : value === 'true')} />}
          </div>
        </fieldset>;
      })}</div>
    </details>
    </fieldset>
  </details>;
}

export default function ConnectivityEditor({ kind }: { kind: 'vpn' | 'fastconnect' }) {
  const { model, setField } = useWizard();
  const h = model.hybridConnectivity ?? emptyHybridConnectivity();
  const update = (edit: (value: typeof h) => void) => {
    const next = structuredClone(h);
    edit(next);
    setField('hybridConnectivity', next);
  };
  return <div className="connectivity-editor" style={{ ...s.col, fontFamily: FONT, fontSize: 14, lineHeight: 1.5 }}>
    <section className="connectivity-setup" aria-label={kind === 'vpn' ? 'VPN setup guide' : 'FastConnect setup guide'}>
      <h2 style={{ ...s.title, marginBottom: 8 }}>{kind === 'vpn' ? 'Set up a VPN connection' : 'Set up a FastConnect circuit'}</h2>
      <p>{kind === 'vpn' ? 'A VPN connects your office or data center to OCI over the internet. The customer router and OCI must use matching tunnel settings.' : 'FastConnect uses a dedicated provider service or physical connection. Agree the service with your provider or network team before entering its details here.'}</p>
      <ol>
        {kind === 'vpn' ? <>
          <li><strong>Register your equipment.</strong> Add an OCI record for your router using its reachable public IP, or reuse an existing CPE object.</li>
          <li><strong>Add a VPN connection.</strong> Select the equipment and enter the remote networks that OCI needs to reach.</li>
          <li><strong>Configure both tunnels.</strong> Choose static or BGP routing and each tunnel's key source. Match IKE settings with your router administrator.</li>
        </> : <>
          <li><strong>Confirm the connection details.</strong> Select a provider service when choices are available, or enter its OCID for your region. Direct connections need a provisioned physical cross-connect/group OCID.</li>
          <li><strong>Add a circuit.</strong> Connect your private network to the landing zone. Select bandwidth offered for your service.</li>
          <li><strong>Configure BGP.</strong> Use the settings agreed with your network team or provider. If the provider operates BGP, follow its instructions.</li>
        </>}
      </ol>
      <p><strong>Then deploy and complete the connection.</strong> In Review, download the files for your Terraform deployment. Your network team must configure the router{kind === 'fastconnect' && ' and complete provider or physical activation'}. Allow the required traffic in firewall policies, network security groups and security lists, then test the path. Downloading files does not establish connectivity.</p>
      <a className="guide-link" href={kind === 'vpn' ? 'https://docs.oracle.com/en-us/iaas/Content/Network/Tasks/settingupIPsec.htm' : 'https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/fastconnectoverview.htm'} target="_blank" rel="noreferrer">{kind === 'vpn' ? 'Oracle VPN setup and prerequisites' : 'Oracle FastConnect connection options'}</a>
    </section>
    {kind === 'vpn' ? <>
    <section><h2 style={s.title}>Customer VPN equipment</h2>
      <p style={{ ...s.help, marginBottom: 12 }}>Customer premises equipment (CPE) is your router or firewall. This creates its record in OCI; your network team configures the device itself. Already have a CPE object in OCI? Supply its OCID when adding the VPN below.</p>
      {Object.entries(h.customer_premises_equipments).map(([name, cpe]) => <Card key={name} name={name} type="CPE" attention={Boolean(cpeDeviceError(cpe, model.foundation.realm))} onDelete={() => update((v) => { delete v.customer_premises_equipments[name]; })}>
        <Field label="Public IPv4 address" help={help.cpeIp} note="Ask your router administrator for the reachable public IP. Behind NAT, use the translated public address." value={cpe.ip_address} onChange={(value) => update((v) => { v.customer_premises_equipments[name].ip_address = value; })} />
        <Choice label="Device vendor" help={help.cpeVendor} value={cpe.cpe_device_shape_id !== undefined ? 'ocid' : cpe.cpe_device_shape_vendor_name ?? 'Other'} options={[...connectivityCatalog.cpe_vendors.map((vendor): [string, string] => [vendor.name, vendor.label]), ['ocid', 'Other device (enter shape ID / OCID)']]} note={`OCI resolves the vendor template in ${model.foundation.realm} / ${model.foundation.region} during deployment. Use a shape identifier for an exact model or an unlisted vendor.`} onChange={(selection) => update((v) => { v.customer_premises_equipments[name] = selectCpeDevice(cpe, selection); })} />
        {(cpe.cpe_device_shape_id !== undefined || Boolean(cpeDeviceError(cpe, model.foundation.realm))) && <div style={{ gridColumn: '1 / -1' }}><Field label="Device shape ID / OCID" help={help.cpeShape} value={cpe.cpe_device_shape_id} invalid={Boolean(cpeDeviceError(cpe, model.foundation.realm))} note={cpeDeviceError(cpe, model.foundation.realm) || 'Use the identifier returned by OCI in the selected realm. Some device shape identifiers are UUIDs.'} onChange={(value) => update((v) => {
          v.customer_premises_equipments[name].cpe_device_shape_id = value;
          delete v.customer_premises_equipments[name].cpe_device_shape_vendor_name;
        })} /></div>}
      </Card>)}
      <AddEntry label="CPE" names={Object.keys(h.customer_premises_equipments)} onAdd={(name) => update((v) => { v.customer_premises_equipments[name] = { ip_address: '' }; })} />
    </section>
    <section><h2 style={s.title}>Site-to-Site VPN</h2>
      {Object.keys(h.ipsecs).length === 0 && <p style={s.help}>Add a VPN connection to configure its remote networks and two IPSec tunnels.</p>}
      {Object.entries(h.ipsecs).map(([name, vpn]) => <Card key={name} name={name} type="VPN" attention={Boolean(vpnIdentityError(vpn)) || Object.values(vpn.tunnels_management).some((tunnel) => Boolean(vpnSharedSecretError(tunnel)))} onDelete={() => update((v) => { delete v.ipsecs[name]; })}>
        <fieldset className="connectivity-settings"><legend style={{ ...s.subHead, fontSize: 13 }}>Connection settings</legend><div className="connectivity-grid">
        <Choice label="Customer equipment" help={help.cpe} value={vpn.cpe_key ?? ''} options={[["", 'Existing CPE OCID'], ...Object.keys(h.customer_premises_equipments).map((n): [string, string] => [n, n])]} onChange={(value) => update((v) => { if (value) { v.ipsecs[name].cpe_key = value; delete v.ipsecs[name].cpe_id; } else { delete v.ipsecs[name].cpe_key; v.ipsecs[name].cpe_id = ''; } })} />
        <Field label="Remote IPv4 CIDRs" help={help.remote} note="Networks behind your router, for example 172.20.0.0/16. Ask your network team for ranges that do not overlap your OCI networks." value={vpn.remote_cidrs.join(', ')} onChange={(value) => update((v) => { v.ipsecs[name].remote_cidrs = list(value); })} />
        {!vpn.cpe_key && <div style={{ gridColumn: '1 / -1' }}><Field label="Existing CPE OCID" help={help.cpeId} value={vpn.cpe_id} onChange={(value) => update((v) => { v.ipsecs[name].cpe_id = value; })} /></div>}
        <details className="connectivity-disclosure" open={Boolean(vpn.cpe_local_identifier || vpnIdentityError(vpn))} style={{ gridColumn: '1 / -1' }}><summary style={disclosure}><span>Router identity <span style={{ ...s.help, fontWeight: 400 }}>{vpn.cpe_local_identifier ? 'Custom identity' : vpnIdentityError(vpn) ? 'Hostname required' : 'Uses CPE public IP'}</span></span><Chevron /></summary>
        <p style={{ ...s.help, margin: '8px 0 12px' }}>Leave the identifier empty when your router sends the CPE public IP as its IKE identity. Enter an override when it sends a different IP address or hostname. Check the router configuration, especially behind NAT.</p>
        <div className="connectivity-grid">
        <Field label="CPE local identifier" help={help.identifier} value={vpn.cpe_local_identifier} invalid={Boolean(vpnIdentityError(vpn))} note={vpnIdentityError(vpn)} onChange={(value) => update((v) => { if (value) v.ipsecs[name].cpe_local_identifier = value; else delete v.ipsecs[name].cpe_local_identifier; })} />
        <Choice label="CPE identifier type" help={help.identifierType} value={vpn.cpe_local_identifier_type ?? 'IP_ADDRESS'} options={[["IP_ADDRESS", 'IP address'], ["HOSTNAME", 'Hostname']]} onChange={(value) => update((v) => { v.ipsecs[name].cpe_local_identifier_type = value; })} />
        </div></details>
        </div></fieldset>
        <div className="connectivity-tunnels">
          <h3 style={{ ...s.subHead, fontSize: 13, marginBottom: 6 }}>IPSec tunnels</h3>
          <p style={{ ...s.help, marginBottom: 12 }}>Configure both tunnels so one can carry traffic if the other fails. Static routing uses fixed remote networks; BGP lets the routers exchange routes. Leave advanced proposals unchanged unless your router administrator requires specific settings.</p>
        {(['tunnel_1', 'tunnel_2'] as const).map((key) => <TunnelFields key={key} name={key === 'tunnel_1' ? 'Tunnel 1' : 'Tunnel 2'} tunnel={vpn.tunnels_management[key]} onChange={(tunnel) => update((v) => { v.ipsecs[name].tunnels_management[key] = tunnel; })} />)}
        </div>
      </Card>)}
      <AddEntry label="VPN" names={Object.keys(h.ipsecs)} onAdd={(name) => update((v) => { v.ipsecs[name] = newVpn(Object.keys(v.customer_premises_equipments)[0] ?? ''); if (!v.ipsecs[name].cpe_key) { delete v.ipsecs[name].cpe_key; v.ipsecs[name].cpe_id = ''; } })} />
    </section>
    </> : <>
    <section aria-label="FastConnect circuits">
      {Object.entries(h.fast_connect_virtual_circuits).map(([name, circuit]) => {
        const field = (key: keyof typeof circuit, value: unknown) => update((v) => {
          const next = { ...v.fast_connect_virtual_circuits[name], [key]: value };
          if (value === '') delete next[key];
          v.fast_connect_virtual_circuits[name] = next;
        });
        const partner = Boolean(circuit.provider_service_id);
        return <Card key={name} name={name} type="FastConnect" attention={Boolean(providerSelectionError(circuit, model.foundation.realm, model.foundation.region)) || Boolean(bandwidthShapeError(circuit.bandwidth_shape_name)) || Object.values(circuit.cross_connect_mappings ?? {}).some((mapping) => Boolean(bgpMd5KeyError(mapping)))} onDelete={() => update((v) => { delete v.fast_connect_virtual_circuits[name]; })}>
          <fieldset className="connectivity-settings"><legend style={{ ...s.subHead, fontSize: 13 }}>Circuit settings</legend><div className="connectivity-grid">
          <Field label="Remote IPv4 CIDRs" help={help.remote} note="Networks on your side that OCI should reach. Agree these ranges and BGP advertisements with your network team." value={circuit.remote_cidrs?.join(', ')} onChange={(value) => field('remote_cidrs', list(value))} />
          <ProviderServiceField circuit={circuit} realm={model.foundation.realm} region={model.foundation.region} onChange={(value) => update((v) => { v.fast_connect_virtual_circuits[name] = value; })} />
          <BandwidthField value={circuit.bandwidth_shape_name} onChange={(value) => field('bandwidth_shape_name', value)} />
          <div style={{ alignSelf: 'start' }}><Field label="Customer ASN" help={help.fcAsn} note="The number identifying your network in BGP. If the provider operates BGP, ask it which values you should supply." value={circuit.customer_asn} onChange={(value) => field('customer_asn', value)} /></div>
          </div></fieldset>
          {Object.entries(circuit.cross_connect_mappings ?? {}).map(([key, mapping]) => {
            const mapField = (k: keyof CrossConnectMapping, value: string) => update((v) => {
              const m = v.fast_connect_virtual_circuits[name].cross_connect_mappings![key];
              if (value) m[k] = value as never; else delete m[k];
            });
            const keyError = bgpMd5KeyError(mapping);
            return <div role="group" aria-label={`BGP mapping ${key} for FastConnect ${name}`} key={key} style={{ ...group, paddingTop: 8, gridColumn: '1 / -1' }}>
              <div className="connectivity-item-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                <h3 style={{ ...s.subHead, margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>BGP mapping: {key}</h3>
                <DeleteButton label={`Remove BGP mapping ${key} from FastConnect ${name}`} onClick={() => update((v) => { delete v.fast_connect_virtual_circuits[name].cross_connect_mappings![key]; })} />
              </div>
              <p style={{ ...s.help, marginBottom: 12 }}>{partner ? 'Use the peering details supplied for your partner service. A mapping describes this circuit; it does not order another provider connection.' : 'Map this circuit to a provisioned physical cross-connect/group. Use its real OCID and the VLAN agreed with your network team.'} The customer and Oracle addresses are different hosts in the same subnet; these are BGP interface IPs, not the remote networks.</p>
              <div className="connectivity-grid">
              <Field label="Customer BGP IP/prefix" help={help.customerPeeringIp} value={mapping.customer_bgp_peering_ip} onChange={(value) => mapField('customer_bgp_peering_ip', value)} /><Field label="Oracle BGP IP/prefix" help={help.oraclePeeringIp} value={mapping.oracle_bgp_peering_ip} onChange={(value) => mapField('oracle_bgp_peering_ip', value)} />
              <Choice label="BGP authentication" help={help.bgpAuth} value={mapping.bgp_md5auth_mode ?? 'none'} options={[["none", 'Disabled'], ["inline", 'MD5 key for this session']]} note={mapping.bgp_md5auth_mode === 'inline' ? 'Use the key agreed with your BGP peer. Downloads include it; Studio clears it when you reopen the design.' : 'Enable only when your provider or router administrator requires a matching MD5 key.'} onChange={(value) => update((v) => { const m = v.fast_connect_virtual_circuits[name].cross_connect_mappings![key]; m.bgp_md5auth_mode = value as 'none' | 'inline'; delete m.bgp_md5auth_key; })} />
              {mapping.bgp_md5auth_mode === 'inline' && <Field label="BGP MD5 key (session only)" help={help.bgpKey} secret value={mapping.bgp_md5auth_key} invalid={Boolean(keyError)} note={keyError} onChange={(value) => mapField('bgp_md5auth_key', value)} />}
              <details className="connectivity-disclosure" open={!partner || Boolean(mapping.cross_connect_or_cross_connect_group_id || mapping.vlan)} style={{ gridColumn: '1 / -1' }}>
                <summary style={disclosure}>Cross-connect and VLAN<Chevron /></summary>
                <p style={{ ...s.help, margin: '8px 0 12px' }}>Use a provisioned connection OCID for direct connections. Follow your provider's instructions for partner connections and VLANs.</p>
                <div className="connectivity-grid">
                  <div style={{ gridColumn: '1 / -1' }}><Field label="Cross-connect/group OCID" help={help.physicalId} value={mapping.cross_connect_or_cross_connect_group_id} onChange={(value) => mapField('cross_connect_or_cross_connect_group_id', value)} /></div>
                  <Field label="VLAN" help={help.vlan} value={mapping.vlan} onChange={(value) => mapField('vlan', value)} />
                </div>
              </details>
            </div></div>;
          })}
          <div className="connectivity-mapping-add" style={{ gridColumn: '1 / -1' }}><AddEntry label="BGP mapping" owner={`FastConnect ${name}`} names={Object.keys(circuit.cross_connect_mappings ?? {})} onAdd={(key) => field('cross_connect_mappings', { ...circuit.cross_connect_mappings, [key]: {} })} /></div>
          <details className="connectivity-disclosure" style={{ ...group, paddingTop: 0, gridColumn: '1 / -1' }}><summary style={disclosure}>Advanced circuit settings<Chevron /></summary>
            <div className="connectivity-grid" style={{ marginTop: 14 }}>
              <Field label="Partner service key (optional)" help={help.partnerKey} value={circuit.provider_service_key_name} onChange={(value) => field('provider_service_key_name', value)} />
              <Choice label="BGP administrative state" help={help.bgpState} value={circuit.bgp_admin_state ?? 'ENABLED'} options={[["ENABLED", 'Enabled'], ["DISABLED", 'Disabled']]} onChange={(value) => field('bgp_admin_state', value)} />
              <Field label="IP MTU (optional)" help={help.mtu} type="number" value={circuit.ip_mtu} onChange={(value) => field('ip_mtu', value ? Number(value) : '')} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}><span style={{ ...fieldLabel, display: 'inline-flex', alignItems: 'center', gap: 4 }}>BFD<FieldHelp label="BFD" help={help.bfd} /></span><Switch checked={circuit.is_bfd_enabled ?? false} ariaLabel="Enable FastConnect BFD" onChange={(checked) => field('is_bfd_enabled', checked)} /></div>
            </div>
          </details>
        </Card>;
      })}
      <AddEntry label="FastConnect circuit" names={Object.keys(h.fast_connect_virtual_circuits)} onAdd={(name) => update((v) => { v.fast_connect_virtual_circuits[name] = { type: 'PRIVATE', remote_cidrs: [], cross_connect_mappings: { primary: {} } }; })} />
    </section>
    <details className="connectivity-disclosure" style={{ ...group, paddingTop: 0 }}><summary style={disclosure}>Physical FastConnect preparation<Chevron /></summary>
      <p style={{ ...s.help, marginTop: 14 }}>Use this section only when you need to prepare physical ports with Oracle. Partner-managed services usually supply a provider service OCID instead. Create groups and ports first, complete cabling and activation, then enter their OCIDs in the circuit mappings. Terraform does not order carrier services or configure your router.</p>
      {Object.entries(h.cross_connect_groups).map(([name, group]) => <Card key={name} name={name} type="Cross-connect group" onDelete={() => update((v) => { delete v.cross_connect_groups[name]; })}>
        {Object.entries(group.cross_connects).map(([key, port]) => <div role="group" aria-label={`Port: ${key}`} key={key} style={{ gridColumn: '1 / -1' }}>
          <div className="connectivity-item-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h3 style={{ ...s.subHead, margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>Port: {key}</h3>
            <DeleteButton label={`Remove port ${key} from cross-connect group ${name}`} onClick={() => update((v) => { delete v.cross_connect_groups[name].cross_connects[key]; })} />
          </div><div className="connectivity-grid">
          {(['location_name', 'port_speed_shape_name', 'customer_reference_name', 'near_cross_connect_or_cross_connect_group_id', 'far_cross_connect_or_cross_connect_group_id'] as const).map((field, i) => <div key={field} style={{ gridColumn: field.endsWith('_id') ? '1 / -1' : undefined }}><Field label={['Location name', 'Port speed shape', 'Customer reference (optional)', 'Near connection/group OCID (optional)', 'Far connection/group OCID (optional)'][i]} help={[help.location, help.portSpeed, help.reference, help.near, help.far][i]} value={port[field]} onChange={(value) => update((v) => { const p = v.cross_connect_groups[name].cross_connects[key]; if (value || field === 'location_name' || field === 'port_speed_shape_name') p[field] = value; else delete p[field]; })} /></div>)}
        </div></div>)}
        <div style={{ gridColumn: '1 / -1' }}><AddEntry label="port" owner={`cross-connect group ${name}`} names={Object.keys(group.cross_connects)} onAdd={(key) => update((v) => { v.cross_connect_groups[name].cross_connects[key] = { location_name: '', port_speed_shape_name: '' }; })} /></div>
      </Card>)}
      <AddEntry label="cross-connect group" names={Object.keys(h.cross_connect_groups)} onAdd={(name) => update((v) => { v.cross_connect_groups[name] = { cross_connects: {} }; })} />
    </details>
    </>}
  </div>;
}
