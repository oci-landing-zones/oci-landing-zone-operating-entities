import { ocvsDefaultParams } from '../services/platforms';
import { oracle } from '../theme';
import { s } from '../wizard/steps/networkEditorStyles';

const local = { note: { fontSize: 12.5, color: oracle.textMuted, marginBottom: 14, lineHeight: 1.5 }, okeGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 8, alignItems: 'start' } };

/** The currently supported one-SDDC OCVS input contract. */
export default function OcvsSettingsFields({ id, value, onChange, showHeading = true }: {
  id: string;
  showHeading?: boolean;
  value: ReturnType<typeof ocvsDefaultParams>;
  onChange: (patch: Partial<ReturnType<typeof ocvsDefaultParams>>) => void;
}) {
  return (
    <div style={s.subCard}>
      {showHeading && <div style={s.subHead}>OCVS management cluster</div>}
      <div style={local.note}>One platform creates one SDDC management cluster. An SSH public key is required. HCX is not included in this deployment package.</div>
      <div style={local.okeGrid}>
        <div><label style={s.addLabel} htmlFor={`${id}-ssh`}>SSH public key</label><input id={`${id}-ssh`} style={s.rowInput} value={value.sshAuthorizedKeys} onChange={(e) => onChange({ sshAuthorizedKeys: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-sddc`}>SDDC name</label><input id={`${id}-sddc`} style={s.rowInput} value={value.sddcDisplayName} onChange={(e) => onChange({ sddcDisplayName: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-cluster`}>Cluster name</label><input id={`${id}-cluster`} style={s.rowInput} value={value.clusterDisplayName} onChange={(e) => onChange({ clusterDisplayName: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-hosts`}>ESXi hosts</label><input id={`${id}-hosts`} type="number" min="1" style={s.rowInput} value={value.esxiHostsCount} onChange={(e) => onChange({ esxiHostsCount: Number(e.target.value) })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-vmware`}>VMware version</label><input id={`${id}-vmware`} style={s.rowInput} value={value.vmwareSoftwareVersion} onChange={(e) => onChange({ vmwareSoftwareVersion: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-ad`}>Availability domain</label><input id={`${id}-ad`} style={s.rowInput} value={value.computeAvailabilityDomain} onChange={(e) => onChange({ computeAvailabilityDomain: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-vsphere`}>vSphere type</label><input id={`${id}-vsphere`} style={s.rowInput} value={value.vsphereType} onChange={(e) => onChange({ vsphereType: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-ocpu`}>Initial host OCPUs</label><input id={`${id}-ocpu`} type="number" min="1" style={s.rowInput} value={value.initialHostOcpuCount} onChange={(e) => onChange({ initialHostOcpuCount: Number(e.target.value) })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-shape`}>Initial host shape</label><input id={`${id}-shape`} style={s.rowInput} value={value.initialHostShapeName} onChange={(e) => onChange({ initialHostShapeName: e.target.value })} /></div>
        <div><label style={s.addLabel} htmlFor={`${id}-workload`}>Workload network CIDR</label><input id={`${id}-workload`} style={s.rowInput} value={value.workloadNetworkCidr} onChange={(e) => onChange({ workloadNetworkCidr: e.target.value })} /></div>
      </div>
    </div>
  );
}
