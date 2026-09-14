// X-RPC connection names must remain unique after key normalization.
// A collision would make two caller-owned connections address the same Terraform resource keys.
// Other naming scenarios use distinct normalized names and cannot prove this public fail-closed boundary.
// error_contains: connection names must remain unique after underscores are normalized to hyphens
{
  hub: {
    kind: 'hub_e',
    network: { vcn: '10.0.0.0/21' },
  },
  environments: {
    prod: {},
  },
  remote_peering_connections: {
    peer_a: {
      remote_cidrs: ['10.1.0.0/21'],
    },
    'peer-a': {
      remote_cidrs: ['10.2.0.0/21'],
    },
  },
}
