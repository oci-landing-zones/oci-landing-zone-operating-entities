local common = import 'rpc_common.libsonnet';

function(local_side, peer_side, final_network)
  common.build(
    local_side=local_side,
    peer_side=peer_side,
    final_network=final_network,
    local_role='DR',
    peer_role='HOME',
    is_requester=false
  )
