// Published X-RPC fragments preserve role, routing, IAM, and firewall-policy boundaries when rendered from the current generator.
// contains: "failures": []
local profiles = import 'gen/addons/oci-x-rpc/profiles.libsonnet';
local published = import 'gen/addons/oci-x-rpc/published.libsonnet';
local lz = import 'gen/landing_zone.libsonnet';

local acceptor = lz(profiles.cross_tenancy_acceptor);
local requestor = lz(profiles.cross_tenancy_requestor);
local acceptor_without_rpc = lz({
  [key]: profiles.cross_tenancy_acceptor[key]
  for key in std.objectFields(profiles.cross_tenancy_acceptor)
  if key != 'remote_peering_connections'
});
local acceptor_network = published.network_fragment(profiles.cross_tenancy_acceptor);
local requestor_network = published.network_fragment(profiles.cross_tenancy_requestor);
local acceptor_iam = published.iam_fragment(profiles.cross_tenancy_acceptor);
local requestor_iam = published.iam_fragment(profiles.cross_tenancy_requestor);
local same_acceptor_iam = published.iam_fragment(profiles.same_tenancy_acceptor);
local same_requestor_iam = published.iam_fragment(profiles.same_tenancy_requestor);
local acceptor_reference_network = published.network(profiles.cross_tenancy_acceptor);
local requestor_reference_network = published.network(profiles.cross_tenancy_requestor);
local acceptor_reference_iam = published.iam(profiles.cross_tenancy_acceptor);
local acceptor_reference_governance = published.governance(
  profiles.cross_tenancy_acceptor
);

local shared(result) =
  result.network.network_configuration.network_configuration_categories['0-shared'];
local drg(result, key) =
  shared(result).non_vcn_specific_gateways.dynamic_routing_gateways[key];
local acceptor_drg = drg(acceptor, 'DRG-FRA-LZ-HUB-KEY');
local requestor_drg = drg(requestor, 'DRG-AMS-LZ-HUB-KEY');
local acceptor_rpc =
  acceptor_drg.remote_peering_connections['RPC-FRA-LZ-HUB-TENANCY2-KEY'];
local requestor_rpc =
  requestor_drg.remote_peering_connections['RPC-AMS-LZ-HUB-TENANCY1-KEY'];
local acceptor_statements =
  acceptor_iam.policies_configuration.supplied_policies[
    'PCY-FRA-LZ-HUB-RPC-TENANCY2-KEY'
  ].statements;
local requestor_statements =
  requestor_iam.policies_configuration.supplied_policies[
    'PCY-AMS-LZ-HUB-RPC-TENANCY1-KEY'
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
local network_fragment_has_only_delta(fragment) =
  std.objectFields(fragment) == ['network_configuration']
  && std.objectHas(
    fragment.network_configuration,
    'network_configuration_categories'
  );
local reference_categories(network) =
  network.network_configuration.network_configuration_categories;
local complete_network_has_standard_categories(network) =
  local categories = reference_categories(network);
  local keys = std.objectFields(categories);
  std.length(keys) == 3
  && std.member(keys, '0-shared')
  && std.member(keys, '1-prod')
  && std.member(keys, '2-preprod')
  && std.objectHas(categories['0-shared'], 'vcns')
  && std.objectHas(categories['0-shared'], 'non_vcn_specific_gateways');

{
  failures: [
    check.name
    for check in [
      {
        name: 'acceptor RPC unexpectedly contains a peer reference',
        ok: !std.objectHas(acceptor_rpc, 'peer_id')
            && !std.objectHas(acceptor_rpc, 'peer_key'),
      },
      {
        name: 'requestor dependency key was not published as peer_key',
        ok: std.objectHas(requestor_rpc, 'peer_key')
            && requestor_rpc.peer_key == 'RPC-FRA-LZ-HUB-TENANCY2-KEY'
            && !std.objectHas(requestor_rpc, 'peer_id'),
      },
      {
        name: 'acceptor RPC attachment is not a remote-peering attachment',
        ok: acceptor_drg.drg_attachments[
          'DRGATT-FRA-LZ-HUB-RPC-TENANCY2-KEY'
        ].network_details.type == 'REMOTE_PEERING_CONNECTION',
      },
      {
        name: 'published profiles do not use the standard Hub A and Hub B pair',
        ok: profiles.cross_tenancy_acceptor.hub.kind == 'hub_a'
            && profiles.cross_tenancy_requestor.hub.kind == 'hub_b',
      },
      {
        name: 'acceptor IAM does not use the foreign requestor group OCID',
        ok: acceptor_statements == expected_acceptor_statements,
      },
      {
        name: 'requestor IAM does not use the local identity-domain group',
        ok: requestor_statements == expected_requestor_statements,
      },
      {
        name: 'same-tenancy acceptor emitted an IAM policy',
        ok: std.objectFields(
          same_acceptor_iam.policies_configuration.supplied_policies
        ) == [],
      },
      {
        name: 'same-tenancy requestor emitted an IAM policy',
        ok: std.objectFields(
          same_requestor_iam.policies_configuration.supplied_policies
        ) == [],
      },
      {
        name: 'published output is not an RPC-only network delta',
        ok: network_fragment_has_only_delta(acceptor_network)
            && network_fragment_has_only_delta(requestor_network),
      },
      {
        name: 'reference network output is not a complete prod/preprod One-OE surface',
        ok: complete_network_has_standard_categories(acceptor_reference_network)
            && complete_network_has_standard_categories(requestor_reference_network),
      },
      {
        name: 'reference IAM or governance output is incomplete',
        ok: std.objectHas(acceptor_reference_iam, 'compartments_configuration')
            && std.objectHas(acceptor_reference_iam, 'policies_configuration')
            && std.objectHas(
              acceptor_reference_governance,
              'tags_configuration'
            ),
      },
      {
        name: 'same-tenancy and cross-tenancy network profiles diverge',
        ok: published.network(profiles.same_tenancy_acceptor)
            == acceptor_reference_network
            && published.network(profiles.same_tenancy_requestor)
               == requestor_reference_network,
      },
      {
        name: 'RPC changed the standard customer Network Firewall policy',
        ok: shared(acceptor).non_vcn_specific_gateways
            .network_firewalls_configuration
            == shared(acceptor_without_rpc).non_vcn_specific_gateways
            .network_firewalls_configuration,
      },
    ]
    if !check.ok
  ],
}
