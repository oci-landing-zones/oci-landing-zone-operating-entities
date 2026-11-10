// Split Exadata notifications work without publication metadata; null One-OE recipients use defaults.
// contains: "split_environment_notifications": true
// contains: "null_notifications_use_defaults": true
local lz = import 'gen/landing_zone.libsonnet';

local base = {
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: { prod: {} },
};

local check_split(product) =
  local code = std.asciiUpper(product);
  local result = lz(base + {
    environments: {
      prod: {
        platforms: {
          [product]: {
            extension: {
              type: product,
              params: {
                notification_emails: {
                  default: ['fallback@example.com'],
                  split_environment_topics: true,
                  environment_infra: { prod: ['infra@example.com'] },
                  environment_db: { prod: ['dba@example.com'] },
                },
              },
            },
          } + (if product == 'exacs' then { network: { vcn: '10.200.0.0/21' } } else {}),
        },
      },
    },
  });
  local infra = 'NOTT-LZ-PROD-%s-INFRA-WORKLOADS-KEY' % code;
  local db = 'NOTT-LZ-PROD-%s-DB-WORKLOADS-KEY' % code;
  local check_cis(observability) =
    local topics = observability.notifications_configuration.topics;
    local rules = observability.events_configuration.event_rules;
    local prefix = 'RUL-LZ-PROD-NOTIFICATION-PLATFORM-%s-' % code;
    assert std.objectHas(topics, infra) && std.objectHas(topics, db) : 'Missing split platform topics';
    assert topics[infra].subscriptions[0].values == ['infra@example.com'];
    assert topics[db].subscriptions[0].values == ['dba@example.com'];
    assert rules[prefix + 'INFRA-KEY'].destination_topic_ids == [infra];
    assert rules[prefix + 'DB-KEY'].destination_topic_ids == [db];
    assert rules[prefix + 'VMC-KEY'].destination_topic_ids == [infra];
    true;
  check_cis(result.observability_cis1) && check_cis(result.observability_cis2);

assert check_split('exacc') && check_split('exacs');
assert lz(base + { notification_emails: null }).observability_cis1.notifications_configuration ==
       lz(base).observability_cis1.notifications_configuration;
assert lz(base + { notification_emails: null }).observability_cis2.notifications_configuration ==
       lz(base).observability_cis2.notifications_configuration;
std.manifestJsonEx({ split_environment_notifications: true, null_notifications_use_defaults: true }, '  ')
