// Multiple requestor RPCs preserve RPC OCID, dependency-key, and runtime-owned OCID-shaped references through config mode.
// A regression would bind a requestor to the wrong acceptor or reject a reference owned by the deployment runtime.
// The standard example covers one connection; this is the only additional successful X-RPC config scenario.
// contains: "peer_id": "ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.ocid-peer"
// contains: "peer_key": "RPC-ZRH-LZ-HUB-DEPENDENCY-KEY"
// contains: "peer_key": "ocid1.tenancy.oc1..runtime-validates-this"
// contains: PCY-AMS-LZ-HUB-RPC-ACCEPTOR-OCID-01-KEY
// contains: PCY-AMS-LZ-HUB-RPC-ACCEPTOR-KEY-01-KEY
// contains: PCY-AMS-LZ-HUB-RPC-RUNTIME-REFERENCE-01-KEY
// contains: RPC-AMS-LZ-HUB-ACCEPTOR-OCID-01-KEY
// contains: RPC-AMS-LZ-HUB-ACCEPTOR-KEY-01-KEY
// contains: RPC-AMS-LZ-HUB-RUNTIME-REFERENCE-01-KEY
{
  region: 'eu-amsterdam-1',
  region_short_name: 'ams',
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.1.0.0/21' },
  },
  environments: {
    prod: {
      shared_project_network: { network: { vcn: '10.1.64.0/21' } },
    },
  },
  remote_peering_connections: {
    acceptor_ocid_01: {
      remote_cidrs: ['10.0.0.0/21'],
      peer_id: 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.ocid-peer',
      peer_region_name: 'eu-frankfurt-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor-one',
    },
    acceptor_key_01: {
      remote_cidrs: ['10.2.0.0/21'],
      peer_id: 'RPC-ZRH-LZ-HUB-DEPENDENCY-KEY',
      peer_region_name: 'eu-zurich-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor-two',
    },
    runtime_reference_01: {
      remote_cidrs: ['10.3.0.0/21'],
      peer_id: 'ocid1.tenancy.oc1..runtime-validates-this',
      peer_region_name: 'eu-marseille-1',
      peer_tenancy_ocid: 'ocid1.tenancy.oc1..acceptor-three',
    },
  },
}
