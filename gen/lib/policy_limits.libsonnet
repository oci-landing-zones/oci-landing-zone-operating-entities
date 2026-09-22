local supplied_policies(iam) =
  if std.objectHas(iam, 'policies_configuration') &&
     std.objectHas(iam.policies_configuration, 'supplied_policies') then
    iam.policies_configuration.supplied_policies
  else {};

local statement_count(policy) =
  if std.objectHas(policy, 'statements') then std.length(policy.statements)
  else 0;

local roots(iam) =
  if std.objectHas(iam, 'compartments_configuration') &&
     std.objectHas(iam.compartments_configuration, 'compartments') then
    iam.compartments_configuration.compartments
  else {};

local children(compartment) =
  if std.objectHas(compartment, 'children') then compartment.children else {};

local collect_compartment_ids(compartments) =
  std.foldl(
    function(acc, key)
      acc + [key] + collect_compartment_ids(children(compartments[key])),
    std.objectFields(compartments),
    []
  );

local policy_statement_count(iam) =
  local policies = supplied_policies(iam);
  std.foldl(
    function(total, policy_key) total + statement_count(policies[policy_key]),
    std.objectFields(policies),
    0
  );

local statement_counts_by_compartment(iam) =
  local policies = supplied_policies(iam);
  std.foldl(
    function(acc, policy_key)
      local policy = policies[policy_key];
      local compartment_id =
        if std.objectHas(policy, 'compartment_id') then policy.compartment_id
        else 'TENANCY-ROOT';
      local existing =
        if std.objectHas(acc, compartment_id) then acc[compartment_id] else 0;
      acc + { [compartment_id]: existing + statement_count(policy) },
    std.objectFields(policies),
    {}
  );

local known_compartment_ids(iam) =
  ['TENANCY-ROOT'] + collect_compartment_ids(roots(iam));

local unknown_policy_compartment_refs(iam) =
  local policies = supplied_policies(iam);
  local known = known_compartment_ids(iam);
  [
    {
      policy_key: policy_key,
      compartment_id:
        if std.objectHas(policies[policy_key], 'compartment_id') then
          policies[policy_key].compartment_id
        else 'TENANCY-ROOT',
    }
    for policy_key in std.objectFields(policies)
    if !std.member(
      known,
      if std.objectHas(policies[policy_key], 'compartment_id') then
        policies[policy_key].compartment_id
      else 'TENANCY-ROOT'
    )
  ];

local compartment_chains(iam) =
  local walk(key, compartment, prefix) =
    local chain = prefix + [key];
    local child_keys = std.objectFields(children(compartment));
    if std.length(child_keys) == 0 then [chain]
    else std.flattenArrays([
      walk(child_key, children(compartment)[child_key], chain)
      for child_key in child_keys
    ]);
  local root_chains = std.flattenArrays([
    walk(root_key, roots(iam)[root_key], ['TENANCY-ROOT'])
    for root_key in std.objectFields(roots(iam))
  ]);
  if std.length(root_chains) == 0 then [['TENANCY-ROOT']]
  else root_chains;

local chain_statement_count(iam, chain) =
  local counts = statement_counts_by_compartment(iam);
  std.foldl(
    function(total, compartment_id)
      total + if std.objectHas(counts, compartment_id) then counts[compartment_id] else 0,
    chain,
    0
  );

local chain_statement_counts(iam) = [
  {
    chain: chain,
    count: chain_statement_count(iam, chain),
  }
  for chain in compartment_chains(iam)
];

local max_chain_statement_count(iam) =
  local counts = chain_statement_counts(iam);
  if std.length(counts) == 0 then 0
  else std.foldl(
    function(max_count, entry)
      if entry.count > max_count then entry.count else max_count,
    counts,
    0
  );

local validate(iam, max_statements=400) =
  local unknown_refs = unknown_policy_compartment_refs(iam);
  assert std.length(unknown_refs) == 0 :
    'generated IAM policy %s uses unknown compartment_id %s; policy limit cannot be evaluated' % [
      unknown_refs[0].policy_key,
      unknown_refs[0].compartment_id,
    ];
  local violations = [
    entry
    for entry in chain_statement_counts(iam)
    if entry.count > max_statements
  ];
  assert std.length(violations) == 0 :
    'generated IAM policy statements exceed safety limit of %d for compartment chain %s: %d statements' % [
      max_statements,
      std.join(' > ', violations[0].chain),
      violations[0].count,
    ];
  iam;

{
  policy_statement_count(iam):: policy_statement_count(iam),
  statement_counts_by_compartment(iam):: statement_counts_by_compartment(iam),
  known_compartment_ids(iam):: known_compartment_ids(iam),
  unknown_policy_compartment_refs(iam):: unknown_policy_compartment_refs(iam),
  compartment_chains(iam):: compartment_chains(iam),
  chain_statement_count(iam, chain):: chain_statement_count(iam, chain),
  chain_statement_counts(iam):: chain_statement_counts(iam),
  max_chain_statement_count(iam):: max_chain_statement_count(iam),
  validate(iam, max_statements=400):: validate(iam, max_statements),
}
