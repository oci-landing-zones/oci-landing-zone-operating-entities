local acceptor_policy = {
  'PCY-RPC-ACCEPTOR': {
    name: 'pcy-rpc-acceptor',
    description: 'Open LZ policy for accepting RPC connections in the tenancy.',
    compartment_id: 'TENANCY-ROOT',
    statements: [
      'Define group requestorGroup as ocid1.group.oc1..aaaaaaaawnzc3yhxsv5....sufve5xhf4jyaeu2kr5zz35yiq',
      'Define tenancy Requestor as ocid1.tenancy.oc1..aaaaaaaatvskd4rq2s.....eyqxxhnshsxart4535oeq',
      'Admit group requestorGroup of tenancy Requestor to manage remote-peering-to in compartment cmp-landingzone:cmp-lz-network',
    ],
  },
};

local requestor_policy = {
  'PCY-RPC-REQUESTOR': {
    name: 'pcy-rpc-requester',
    description: 'Open LZ policy for requesting RPC connections in the tenancy.',
    compartment_id: 'TENANCY-ROOT',
    statements: [
      'Define tenancy Acceptor as ocid1.tenancy.oc1..aaaaaaaad5peu42knsfe22guml7b5eoz3eupjcgiwtugn3znbew7rmok2p7q',
      "Allow group 'id_lz_common'/'grp-lz-network-admin' to manage remote-peering-from in compartment cmp-landingzone:cmp-lz-network",
      "Endorse group 'id_lz_common'/'grp-lz-network-admin' to manage remote-peering-to in tenancy Acceptor",
    ],
  },
};

{
  single_stack: {
    tenancy1: {
      identity_domain_groups_configuration+: {
        ignore_external_membership_updates: true,
      },

      policies_configuration+: {
        supplied_policies+: acceptor_policy,
      },
    },

    tenancy2: {
      identity_domain_groups_configuration+: {
        ignore_external_membership_updates: true,
      },

      policies_configuration+: {
        supplied_policies+: requestor_policy,
      },
    },
  },

  multi_stack: {
    tenancy1: {
      policies_configuration: {
        enable_cis_benchmark_checks: 'false',
        supplied_policies: acceptor_policy,
      },
    },

    tenancy2: {
      policies_configuration: {
        enable_cis_benchmark_checks: 'false',
        supplied_policies: requestor_policy,
      },
    },
  },
}
