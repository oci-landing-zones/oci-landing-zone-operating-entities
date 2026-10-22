import { useWizard } from '../wizard/wizardContext';
import { createModelId } from '../model/defaults';
import type { RemotePeeringConnection } from '../model/types';
import { getRegionsForRealm } from '../services/regions';
import { validateRemotePeering } from '../services/remotePeering';
import { s } from '../wizard/steps/networkEditorStyles';
import DeleteButton from './DeleteButton';

export default function RemotePeeringEditor() {
  const { model, setField } = useWizard();
  const connections = model.remotePeeringConnections ?? [];
  const regional = model.foundation.stackScope === 'regional';
  const regions = getRegionsForRealm(model.foundation.realm);
  const errors = validateRemotePeering(model);
  function update(id: string, patch: Partial<RemotePeeringConnection>) {
    setField('remotePeeringConnections', connections.map((connection) => connection.id === id ? { ...connection, ...patch } : connection));
  }
  return <section style={s.panel} aria-labelledby="rpc-title">
    <div style={s.accent} /><div style={s.body}>
      <h3 id="rpc-title" style={s.title}>Remote peering (X-RPC)</h3>
      <p style={s.help}>Connect this hub to another Landing Zone. Create the acceptor first, then configure the requester with its RPC OCID or dependency key. Review both sides' routes and firewall policies.</p>
      {regional && <p style={s.help}>Regional DR supports same-tenancy peering. Cross-tenancy peering requires IAM in a complete stack.</p>}
      {!connections.length && <p style={s.help}>No remote connections. X-RPC is optional.</p>}
      {connections.map((connection, index) => <fieldset key={connection.id} style={{ border: 0, borderTop: '1px solid #d9d6d0', margin: '20px 0', padding: '20px 0 0', minWidth: 0 }}>
        <legend style={{ padding: '0 8px 0 0', fontWeight: 700 }}>Connection {index + 1}</legend>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><DeleteButton label={`Remove RPC ${connection.name || index + 1}`} onClick={() => setField('remotePeeringConnections', connections.filter((item) => item.id !== connection.id))} /></div>
        <label style={s.label} htmlFor={`rpc-name-${connection.id}`}>Connection name</label>
        <input id={`rpc-name-${connection.id}`} style={s.input} value={connection.name} onChange={(event) => update(connection.id, { name: event.target.value })} />
        <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-role-${connection.id}`}>This side's role</label>
        <select id={`rpc-role-${connection.id}`} style={s.input} value={connection.role} onChange={(event) => update(connection.id, { role: event.target.value as RemotePeeringConnection['role'], peerId: '', requestorGroupOcid: '' })}>
          <option value="acceptor">Acceptor (create first)</option><option value="requester">Requester (connect to the acceptor)</option>
        </select>
        <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-region-${connection.id}`}>Peer region</label>
        <select id={`rpc-region-${connection.id}`} style={s.input} value={connection.peerRegionName} onChange={(event) => update(connection.id, { peerRegionName: event.target.value })}>
          <option value="">Choose a peer region</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
        </select>
        <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-cidrs-${connection.id}`}>Remote routable VCN CIDRs (one per line)</label>
        <textarea id={`rpc-cidrs-${connection.id}`} rows={3} style={{ ...s.input, resize: 'vertical' }} value={connection.remoteCidrs.join('\n')} onChange={(event) => update(connection.id, { remoteCidrs: event.target.value.split('\n') })} />
        <p style={s.help}>Use reviewed peer VCN ranges or non-overlapping aggregates. Kubernetes service and overlay pod ranges are not automatically routed.</p>
        {connection.role === 'requester' && <>
          <label style={s.label} htmlFor={`rpc-peer-${connection.id}`}>Acceptor RPC OCID or dependency key</label>
          <input id={`rpc-peer-${connection.id}`} style={s.input} value={connection.peerId ?? ''} onChange={(event) => update(connection.id, { peerId: event.target.value })} />
        </>}
        {(!regional || connection.peerTenancyOcid) && <>
          <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-tenancy-${connection.id}`}>Peer tenancy OCID (blank for same tenancy)</label>
          <input id={`rpc-tenancy-${connection.id}`} style={s.input} value={connection.peerTenancyOcid ?? ''} onChange={(event) => update(connection.id, { peerTenancyOcid: event.target.value, requestorGroupOcid: '' })} />
          {connection.peerTenancyOcid && connection.role === 'acceptor' && <>
            <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-group-${connection.id}`}>Foreign requester network-admin group OCID</label>
            <input id={`rpc-group-${connection.id}`} style={s.input} value={connection.requestorGroupOcid ?? ''} onChange={(event) => update(connection.id, { requestorGroupOcid: event.target.value })} />
          </>}
        </>}
      </fieldset>)}
      <button type="button" style={s.addBtn} onClick={() => setField('remotePeeringConnections', [...connections, { id: createModelId('rpc'), name: '', role: regional ? 'requester' : 'acceptor', remoteCidrs: [], peerRegionName: model.foundation.homeRegion ?? '' }])}>Add remote connection</button>
      {!!errors.length && <ul role="alert" style={{ color: '#9f1d1d', fontSize: 13, lineHeight: 1.6 }}>{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
    </div>
  </section>;
}
