// The published connectivity-hub/OE1 example preserves its RPC, routing, IAM, and manual-reference contract without changing Network Firewall policies.
// A regression would break the documented deployment handoff or silently make the add-on own customer firewall policy.
// This is the single integrated X-RPC outcome test; separate fixtures cover only multi-connection acceptance and collision boundaries.
// contains: "firewall_policy_failures": []
// contains: "iam_failures": []
// contains: "manual_iam_failures": []
// contains: "manual_network_failures": []
// contains: "requestor_import_failures": []
// contains: "standard_surface_failures": []
local profiles = import 'gen/addons/oci-x-rpc/profiles.libsonnet';
local published = import 'gen/addons/oci-x-rpc/published.libsonnet';

local without_rpc(config) = {
  [key]: config[key]
  for key in std.objectFields(config)
  if key != 'remote_peering_connections'
};
local acceptor = published.complete(profiles.connectivity_hub_reference);
local requestor = published.complete(profiles.oe1_reference);
local acceptor_manual_iam =
  published.manual_iam_reference(
    profiles.connectivity_hub_reference,
    profiles.manual_iam_options.connectivity_hub
  );
local requestor_manual_iam =
  published.manual_iam_reference(
    profiles.oe1_reference,
    profiles.manual_iam_options.oe1
  );
local acceptor_manual_network =
  published.manual_network_reference(profiles.connectivity_hub_reference);
local requestor_manual_network =
  published.manual_network_reference(profiles.oe1_reference);
local acceptor_manual_shared =
  acceptor_manual_network.network_configuration
  .network_configuration_categories['0-shared'];
local requestor_manual_shared =
  requestor_manual_network.network_configuration
  .network_configuration_categories['0-shared'];
local requestor_manual_hub_vcn =
  requestor_manual_shared.vcns['VCN-AMS-LZ-HUB-KEY'];
local acceptor_manual_root =
  acceptor_manual_iam.compartments_configuration.compartments[
    'CMP-LANDINGZONE-KEY'
  ];
local requestor_manual_root =
  requestor_manual_iam.compartments_configuration.compartments[
    'CMP-LANDINGZONE-KEY'
  ];
local manual_network_compartments_ok(root) =
  std.objectFields(root.children) == [
    'CMP-LZ-NETWORK-KEY',
    'CMP-LZ-PREPROD-KEY',
    'CMP-LZ-PROD-KEY',
  ]
  && std.objectFields(
    root.children['CMP-LZ-PREPROD-KEY'].children
  ) == ['CMP-LZ-PREPROD-NETWORK-KEY']
  && std.objectFields(
    root.children['CMP-LZ-PROD-KEY'].children
  ) == ['CMP-LZ-PROD-NETWORK-KEY'];
local acceptor_baseline =
  published.complete(without_rpc(profiles.connectivity_hub_reference));
local acceptor_fragment =
  published.network_fragment(profiles.connectivity_hub_reference);
local acceptor_shared =
  acceptor.network.network_configuration.network_configuration_categories[
    '0-shared'
  ];
local baseline_shared =
  acceptor_baseline.network.network_configuration
  .network_configuration_categories['0-shared'];
local requestor_shared =
  requestor.network.network_configuration.network_configuration_categories[
    '0-shared'
  ];
local acceptor_drg =
  acceptor_shared.non_vcn_specific_gateways.dynamic_routing_gateways[
    'DRG-FRA-LZ-HUB-KEY'
  ];
local requestor_drg =
  requestor_shared.non_vcn_specific_gateways.dynamic_routing_gateways[
    'DRG-AMS-LZ-HUB-KEY'
  ];
local acceptor_rpc =
  acceptor_drg.remote_peering_connections['RPC-FRA-LZ-HUB-OE1-KEY'];
local requestor_rpc =
  requestor_drg.remote_peering_connections[
    'RPC-AMS-LZ-HUB-CONNECTIVITY-HUB-KEY'
  ];
local acceptor_route =
  acceptor_drg.drg_route_tables['DRGRT-FRA-LZ-RPC-OE1-KEY']
  .route_rules['DRGRT-FRA-LZ-RPC-OE1-STATIC-ROUTE'];
local requestor_distribution =
  requestor_drg.drg_route_distributions[
    'DRGRD-AMS-LZ-RPC-CONNECTIVITY-HUB-KEY'
  ];
local imported_attachment_keys = std.sort([
  requestor_distribution.statements[key].match_criteria.drg_attachment_key
  for key in std.objectFields(requestor_distribution.statements)
]);
local local_attachment_keys = std.sort([
  key
  for key in std.objectFields(requestor_drg.drg_attachments)
  if requestor_drg.drg_attachments[key].network_details.type == 'VCN'
]);
local acceptor_statements =
  acceptor.iam.policies_configuration.supplied_policies[
    'PCY-FRA-LZ-HUB-RPC-OE1-KEY'
  ].statements;
local requestor_statements =
  requestor.iam.policies_configuration.supplied_policies[
    'PCY-AMS-LZ-HUB-RPC-CONNECTIVITY-HUB-KEY'
  ].statements;
local expected_acceptor_statements = [
  'Define group requestorGroup as ocid1.group.oc1..requestor-network-admin',
  'Define tenancy Requestor as ocid1.tenancy.oc1..requestor',
  'Admit group requestorGroup of tenancy Requestor to manage remote-peering-to in compartment cmp-landingzone:cmp-lz-network',
];
local expected_requestor_statements = [
  'Define tenancy Acceptor as ocid1.tenancy.oc1..acceptor',
  "Allow group 'id_lz_common'/'grp-lz-network-admin' to manage remote-peering-from in compartment cmp-landingzone:cmp-lz-network",
  "Endorse group 'id_lz_common'/'grp-lz-network-admin' to manage remote-peering-to in tenancy Acceptor",
];
local policy_failures(role, actual, expected) =
  [
    role + ' missing: ' + statement
    for statement in expected
    if !std.member(actual, statement)
  ] + [
    role + ' unexpected: ' + statement
    for statement in actual
    if !std.member(expected, statement)
  ];
local fragment_categories =
  acceptor_fragment.network_configuration.network_configuration_categories;

{
  standard_surface_failures: [
    check.name
    for check in [
      {
        name: 'acceptor RPC contains a peer reference',
        ok: !std.objectHas(acceptor_rpc, 'peer_id')
            && !std.objectHas(acceptor_rpc, 'peer_key'),
      },
      {
        name: 'requestor RPC does not contain the acceptor OCID placeholder',
        ok: std.objectHas(requestor_rpc, 'peer_id')
            && requestor_rpc.peer_id
               == 'ocid1.remotepeeringconnection.oc1.eu-frankfurt-1.replace-me',
      },
      {
        name: 'acceptor RPC route no longer follows the standard hub path',
        ok: acceptor_route.destination == '0.0.0.0/0'
            && acceptor_route.next_hop_drg_attachment_key
               == 'DRGATT-FRA-LZ-HUB-VCN-KEY',
      },
      {
        name: 'complete IAM reference omits identity domains',
        ok: std.objectHas(acceptor.iam, 'identity_domains_configuration'),
      },
      {
        name: 'complete governance reference omits tags',
        ok: std.objectHas(acceptor.governance, 'tags_configuration'),
      },
    ]
    if !check.ok
  ],
  requestor_import_failures:
    [
      'missing ' + key
      for key in local_attachment_keys
      if !std.member(imported_attachment_keys, key)
    ] + [
      'unexpected ' + key
      for key in imported_attachment_keys
      if !std.member(local_attachment_keys, key)
    ],
  iam_failures:
    policy_failures(
      'acceptor',
      acceptor_statements,
      expected_acceptor_statements
    ) + policy_failures(
      'requestor',
      requestor_statements,
      expected_requestor_statements
    ),
  manual_iam_failures: [
    check.name
    for check in [
      {
        name: 'acceptor manual IAM expanded beyond the curated group',
        ok:
          std.objectFields(
            acceptor_manual_iam.identity_domain_groups_configuration.groups
          ) == ['GRP-LZ-NETWORK-ADMIN-KEY'],
      },
      {
        name: 'acceptor manual IAM expanded beyond network compartments',
        ok: manual_network_compartments_ok(acceptor_manual_root),
      },
      {
        name: 'acceptor manual IAM expanded beyond the RPC policy',
        ok:
          std.objectFields(
            acceptor_manual_iam.policies_configuration.supplied_policies
          ) == ['PCY-FRA-LZ-HUB-RPC-OE1-KEY'],
      },
      {
        name: 'requestor manual IAM expanded beyond the curated group',
        ok:
          std.objectFields(
            requestor_manual_iam.identity_domain_groups_configuration.groups
          ) == ['GRP-LZ-NETWORK-ADMIN-KEY'],
      },
      {
        name: 'requestor manual IAM expanded beyond network compartments',
        ok: manual_network_compartments_ok(requestor_manual_root),
      },
      {
        name: 'requestor manual IAM expanded beyond the RPC policy',
        ok:
          std.objectFields(
            requestor_manual_iam.policies_configuration.supplied_policies
          ) == ['PCY-AMS-LZ-HUB-RPC-CONNECTIVITY-HUB-KEY'],
      },
    ]
    if !check.ok
  ],
  manual_network_failures: [
    check.name
    for check in [
      {
        name: 'acceptor manual network includes Network Firewall resources',
        ok:
          !std.objectHas(
            acceptor_manual_shared.non_vcn_specific_gateways,
            'network_firewalls_configuration'
          ),
      },
      {
        name: 'acceptor manual network includes load-balancer resources',
        ok:
          !std.objectHas(
            acceptor_manual_shared.non_vcn_specific_gateways,
            'l7_load_balancers'
          ),
      },
      {
        name: 'requestor manual network includes load-balancer resources',
        ok:
          !std.objectHas(
            requestor_manual_shared.non_vcn_specific_gateways,
            'l7_load_balancers'
          ),
      },
      {
        name: 'requestor manual network is not the Amsterdam Hub E topology',
        ok:
          std.objectFields(requestor_manual_shared.vcns)
          == ['VCN-AMS-LZ-HUB-KEY']
          && std.objectFields(requestor_manual_hub_vcn.subnets) == [
            'SN-AMS-LZ-HUB-DNS-KEY',
            'SN-AMS-LZ-HUB-LB-KEY',
            'SN-AMS-LZ-HUB-MGMT-KEY',
            'SN-AMS-LZ-HUB-MON-KEY',
          ],
      },
      {
        name: 'manual networks omit their generated RPCs',
        ok:
          std.objectHas(
            acceptor_manual_shared.non_vcn_specific_gateways
            .dynamic_routing_gateways['DRG-FRA-LZ-HUB-KEY']
            .remote_peering_connections,
            'RPC-FRA-LZ-HUB-OE1-KEY'
          )
          && std.objectHas(
            requestor_manual_shared.non_vcn_specific_gateways
            .dynamic_routing_gateways['DRG-AMS-LZ-HUB-KEY']
            .remote_peering_connections,
            'RPC-AMS-LZ-HUB-CONNECTIVITY-HUB-KEY'
          ),
      },
    ]
    if !check.ok
  ],
  firewall_policy_failures:
    [
      'complete example changed the standard Network Firewall policy'
      for _ in [true]
      if acceptor_shared.non_vcn_specific_gateways
         .network_firewalls_configuration
         != baseline_shared.non_vcn_specific_gateways
         .network_firewalls_configuration
    ] + [
      'focused reference contains Network Firewall policy changes'
      for category_key in std.objectFields(fragment_categories)
      if std.objectHas(
        fragment_categories[category_key],
        'network_firewalls_configuration'
      )
    ],
}
