import { useWizard } from '../wizard/wizardContext';
import { createModelId } from '../model/defaults';
import type { RemotePeeringConnection } from '../model/types';
import { getRegionsForRealm } from '../services/regions';
import { remotePeeringIssues } from '../services/remotePeering';
import { s } from '../wizard/steps/networkEditorStyles';
import DeleteButton from './DeleteButton';
import FieldError from './FieldError';
import InfoButton from './InfoButton';
import { fieldErrorProps } from '../services/fieldErrors';

export default function RemotePeeringEditor() {
  const { model, setField } = useWizard();
  const connections = model.remotePeeringConnections ?? [];
  const regional = model.foundation.stackScope === 'regional';
  const regions = getRegionsForRealm(model.foundation.realm);
  const errors = remotePeeringIssues(model);
  function feedback(connectionId: string, field: keyof RemotePeeringConnection) {
    return fieldErrorProps(`rpc-${connectionId}-${field}-error`, fieldErrors(connectionId, field), field === 'remoteCidrs' ? `rpc-${connectionId}-cidrs-help` : undefined);
  }
  function fieldErrors(connectionId: string, field: keyof RemotePeeringConnection) {
    return errors.filter((error) => error.connectionId === connectionId && error.field === field).map((error) => error.detail);
  }
  function message(connectionId: string, field: keyof RemotePeeringConnection) {
    return <FieldError id={`rpc-${connectionId}-${field}-error`} error={fieldErrors(connectionId, field)} />;
  }
  function update(id: string, patch: Partial<RemotePeeringConnection>) {
    setField('remotePeeringConnections', connections.map((connection) => connection.id === id ? { ...connection, ...patch } : connection));
  }
  return <section style={s.panel} aria-labelledby="rpc-title">
    <div style={s.accent} /><div style={s.body}>
      <div className="studio-info-heading"><h2 id="rpc-title" style={s.title}>Remote peering connection (RPC)</h2>
        <InfoButton title="Remote peering connection (RPC)"><p>Configure an <strong>acceptor</strong> in one landing zone first. Its deployment provides the RPC OCID or dependency output used by the <strong>requester</strong> in the other landing zone.</p><p>Enter only the remote VCN ranges that should be reachable. Keep them separate from local and other remote ranges, and review routing and firewall policies on both sides.</p><p>{regional ? 'DR supports same-tenancy peering. Cross-tenancy peering requires IAM from a Home Region deployment.' : 'Leave the peer tenancy blank for same-tenancy peering. A cross-tenancy acceptor also needs the foreign requester network-admin group OCID.'}</p></InfoButton>
      </div>
      <p style={s.intro}>Connect this hub to another landing zone. Create an acceptor connection on one side, then a requester on the other.</p>
      {regional && <p style={{ ...s.help, marginBottom: 12 }}>DR supports same-tenancy peering. Cross-tenancy peering requires IAM from a Home Region deployment.</p>}
      {!connections.length && <p style={{ ...s.help, marginBottom: 16 }}>No remote connections. RPC is optional.</p>}
      {connections.map((connection, index) => <div key={connection.id} className="rpc-connection" role="group" aria-labelledby={`rpc-${connection.id}-title`}>
        <div className="rpc-connection-header">
          <h3 id={`rpc-${connection.id}-title`}>Connection {index + 1}</h3>
          <DeleteButton label={`Remove RPC ${connection.name || index + 1}`} onClick={() => setField('remotePeeringConnections', connections.filter((item) => item.id !== connection.id))} />
        </div>
        <label style={s.label} htmlFor={`rpc-name-${connection.id}`}>Connection name</label>
        <input id={`rpc-name-${connection.id}`} {...feedback(connection.id, 'name')} style={s.input} value={connection.name} onChange={(event) => update(connection.id, { name: event.target.value })} />
        {message(connection.id, 'name')}
        <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-role-${connection.id}`}>This side's role</label>
        <select id={`rpc-role-${connection.id}`} value={connection.role} onChange={(event) => update(connection.id, { role: event.target.value as RemotePeeringConnection['role'], peerId: '', requestorGroupOcid: '' })}>
          <option value="acceptor">Acceptor (create first)</option><option value="requester">Requester (connect to the acceptor)</option>
        </select>
        <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-region-${connection.id}`}>Peer region</label>
        <select id={`rpc-region-${connection.id}`} {...feedback(connection.id, 'peerRegionName')} value={connection.peerRegionName} onChange={(event) => update(connection.id, { peerRegionName: event.target.value })}>
          <option value="">Choose a peer region</option>{regions.map((region) => <option key={region.id} value={region.id}>{region.id}</option>)}
        </select>
        {message(connection.id, 'peerRegionName')}
        <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-cidrs-${connection.id}`}>Remote routable VCN CIDRs (one per line)</label>
        <textarea id={`rpc-cidrs-${connection.id}`} {...feedback(connection.id, 'remoteCidrs')} rows={3} style={{ ...s.input, resize: 'vertical' }} value={connection.remoteCidrs.join('\n')} onChange={(event) => update(connection.id, { remoteCidrs: event.target.value.split('\n') })} />
        {message(connection.id, 'remoteCidrs')}
        <p id={`rpc-${connection.id}-cidrs-help`} style={{ ...s.help, marginTop: 6 }}>Use reviewed peer VCN ranges or non-overlapping aggregates. Kubernetes service and overlay pod ranges are not automatically routed.</p>
        {connection.role === 'requester' && <>
          <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-peer-${connection.id}`}>Acceptor RPC OCID or dependency key</label>
          <input id={`rpc-peer-${connection.id}`} {...feedback(connection.id, 'peerId')} style={s.input} value={connection.peerId ?? ''} onChange={(event) => update(connection.id, { peerId: event.target.value })} />
          {message(connection.id, 'peerId')}
        </>}
        {(!regional || connection.peerTenancyOcid || connection.requestorGroupOcid) && <>
          <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-tenancy-${connection.id}`}>Peer tenancy OCID (blank for same tenancy)</label>
          <input id={`rpc-tenancy-${connection.id}`} {...feedback(connection.id, 'peerTenancyOcid')} style={s.input} value={connection.peerTenancyOcid ?? ''} onChange={(event) => update(connection.id, { peerTenancyOcid: event.target.value, requestorGroupOcid: '' })} />
          {message(connection.id, 'peerTenancyOcid')}
          {((connection.peerTenancyOcid && connection.role === 'acceptor') || connection.requestorGroupOcid) && <>
            <label style={{ ...s.label, marginTop: 14 }} htmlFor={`rpc-group-${connection.id}`}>Foreign requester network-admin group OCID</label>
            <input id={`rpc-group-${connection.id}`} {...feedback(connection.id, 'requestorGroupOcid')} style={s.input} value={connection.requestorGroupOcid ?? ''} onChange={(event) => update(connection.id, { requestorGroupOcid: event.target.value })} />
            {message(connection.id, 'requestorGroupOcid')}
          </>}
        </>}
      </div>)}
      <button type="button" style={s.addBtn} onClick={() => setField('remotePeeringConnections', [...connections, { id: createModelId('rpc'), name: '', role: regional ? 'requester' : 'acceptor', remoteCidrs: [], peerRegionName: model.foundation.homeRegion ?? '' }])}>Add remote connection</button>
    </div>
  </section>;
}
