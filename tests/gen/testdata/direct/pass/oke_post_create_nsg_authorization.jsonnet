// The generated Hub grant authorizes only matching-tag post-create NSG attachment for opted-in clusters.
// contains: "grant_owned_by_shared_hub_policy": true
// contains: "exact_restricted_grant_present": true
// contains: "matching_tag_attachment_authorized": true
// contains: "other_platform_attachment_authorized": false
// contains: "untagged_attachment_authorized": false
// contains: "mixed_attachment_authorized": false
// contains: "tag_mutated_attachment_authorized": false
// contains: "lb_initial_create_is_separate_from_target_tag_branch": true
// contains: "public_nlb_statement_present": false
// contains: "initial_nsg_attachment_represented": false
local lz = import 'gen/landing_zone.libsonnet';
local result = lz({
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      platforms: {
        oke: {
          network: { vcn: '10.0.80.0/20' },
          extension: {
            type: 'oke_simple',
            params: {
              kubernetes_version: 'v1.35.2',
              services_cidr: '10.96.0.0/16',
              api_endpoint_allowed_cidrs: ['10.0.1.0/24'],
              public_load_balancer: true,
            },
          },
        },
      },
    },
  },
});
local policies = result.iam.policies_configuration.supplied_policies;
local hub_policy_key = 'PCY-LZ-OKE-SERVICE-PUBLIC-LB-HUB-KEY';
local hub_policy = policies[hub_policy_key];
local platform_tag = 'tagns-lz-oke.platform';
local source_platform = 'prod-oke';
local target_equality =
  'request.principal.compartment.tag.%s = target.resource.tag.%s' % [platform_tag, platform_tag];
local expected_grant =
  "allow any-user to use network-security-groups in compartment cmp-lz-network where all { request.principal.type = 'cluster', request.principal.compartment.tag.tagns-lz-oke.platform = 'prod-oke', request.principal.compartment.tag.tagns-lz-oke.platform = target.resource.tag.tagns-lz-oke.platform }";
local membership_statements = [
  statement
  for statement in hub_policy.statements
  if std.startsWith(statement, 'allow any-user to use network-security-groups')
];
local lb_statement = [
  statement
  for statement in hub_policy.statements
  if std.startsWith(statement, 'allow any-user to manage load-balancers')
][0];
local public_nlb_statements = [
  statement
  for statement in hub_policy.statements
  if std.startsWith(statement, 'allow any-user to manage network-load-balancers')
];

// IAM evaluates every referenced target NSG. The whole membership update is
// authorized only when the source platform is opted in and every target NSG
// carries the same network-team-controlled platform tag.
local enabled_platforms = [source_platform];
local attachment_authorized(request_platform, target_platforms) =
  std.member(enabled_platforms, request_platform) &&
  std.length(target_platforms) > 0 &&
  std.length([
    target_platform
    for target_platform in target_platforms
    if target_platform == null || target_platform != request_platform
  ]) == 0;

{
  grant_owned_by_shared_hub_policy:
    std.objectHas(policies, hub_policy_key) && hub_policy.compartment_id == 'CMP-LZ-NETWORK-KEY',
  exact_restricted_grant_present: membership_statements == [expected_grant],
  matching_tag_attachment_authorized:
    attachment_authorized(source_platform, [source_platform]),
  other_platform_attachment_authorized:
    attachment_authorized(source_platform, ['preprod-oke']),
  untagged_attachment_authorized:
    attachment_authorized(source_platform, [null]),
  mixed_attachment_authorized:
    attachment_authorized(source_platform, [source_platform, 'preprod-oke']),
  tag_mutated_attachment_authorized:
    attachment_authorized(source_platform, ['prod-oke-mutated']),
  lb_initial_create_is_separate_from_target_tag_branch:
    std.length(std.findSubstr(
      "request.permission = 'LOAD_BALANCER_CREATE', all { %s" % target_equality,
      lb_statement
    )) == 1,
  public_nlb_statement_present: std.length(public_nlb_statements) > 0,
  initial_nsg_attachment_represented:
    std.length(membership_statements) != 1 ||
    std.length(std.findSubstr(target_equality, membership_statements[0])) == 0 ||
    std.length(std.findSubstr('CREATE', membership_statements[0])) > 0,
}
