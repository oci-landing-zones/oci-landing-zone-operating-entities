local notification_emails = { default: ['exaxs-platform-team@example.com'] };
local exaxs_extension = {
  extension: {
    type: 'exaxs',
    params: { notification_emails: notification_emails },
  },
};
local platform(vcn=null) = exaxs_extension +
  (if vcn == null then {} else { network: { vcn: vcn } });

local base = {
  region: 'eu-frankfurt-1',
  region_short_name: 'fra',
  realm: 'oc1',
  security_targets: ['prod'],
  hub: { kind: 'hub_e', network: { vcn: '10.0.0.0/21' } },
  environments: {
    prod: {
      project_network: { network: { vcn: '10.0.64.0/21' } },
      projects: { proj1: {} },
    },
    preprod: {
      project_network: { network: { vcn: '10.0.128.0/21' } },
      projects: { proj1: {} },
    },
  },
};

{
  uc1: base {
    shared_platforms: { exaxs: platform('10.0.24.0/21') },
  },
  uc2: base {
    shared_platforms: { exaxs: platform() },
    environments+: {
      prod+: { platforms: { exaxs: platform('10.0.104.0/21') } },
      preprod+: { platforms: { exaxs: platform('10.0.168.0/21') } },
    },
  },
  uc3: base {
    environments+: {
      prod+: { platforms: { exaxs: platform('10.0.104.0/21') } },
      preprod+: { platforms: { exaxs: platform('10.0.168.0/21') } },
    },
  },
}
