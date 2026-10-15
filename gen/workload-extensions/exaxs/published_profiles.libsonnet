local address_plan = import '../../data/network-address-plan.json';
local ranges = address_plan.platforms.exaxs;
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
  hub: { kind: 'hub_e', network: { vcn: address_plan.foundation.hub_vcn } },
  environments: {
    prod: {
      project_network: { network: { vcn: address_plan.foundation.project_vcns.prod } },
      projects: { proj1: {} },
    },
    preprod: {
      project_network: { network: { vcn: address_plan.foundation.project_vcns.preprod } },
      projects: { proj1: {} },
    },
  },
};

{
  uc1: base {
    shared_platforms: { exaxs: platform(ranges.shared) },
  },
  uc2: base {
    shared_platforms: { exaxs: platform() },
    environments+: {
      prod+: { platforms: { exaxs: platform(ranges.prod) } },
      preprod+: { platforms: { exaxs: platform(ranges.preprod) } },
    },
  },
  uc3: base {
    environments+: {
      prod+: { platforms: { exaxs: platform(ranges.prod) } },
      preprod+: { platforms: { exaxs: platform(ranges.preprod) } },
    },
  },
}
