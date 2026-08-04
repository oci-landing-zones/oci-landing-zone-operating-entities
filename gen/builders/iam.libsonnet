// gen/builders/iam.libsonnet
// IAM builder: compartments, groups, identity domains, and policies.
//
// Generates the same structure as blueprints/one-oe/runtime/one-stack/oneoe_iam.json
// dynamically from config.environments (and their projects).
//
// function(config, n, realm_constants, topo) -> IAM output object

local context = import './iam/context.libsonnet';
local compartments = import './iam/compartments.libsonnet';
local identity_domains = import './iam/identity_domains.libsonnet';
local tenancy_policies = import './iam/tenancy_policies.libsonnet';

function(config, n, realm_constants, topo)
  local ctx = context(config, n, realm_constants, topo);
  {
    compartments_configuration: compartments(ctx),
    identity_domain_groups_configuration: identity_domains.groups(ctx),
    identity_domains_configuration: identity_domains.domains(ctx),
    policies_configuration: tenancy_policies(ctx),
  }
