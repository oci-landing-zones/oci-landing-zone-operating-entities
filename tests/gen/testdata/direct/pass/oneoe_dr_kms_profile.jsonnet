// DR-aware CIS2 security changes only the audit-bucket key service grantees.
// contains: "fra_ams_pre_exact": true
// contains: "fra_ams_final_exact": true
// contains: "london_is_dynamic": true
// contains: "same_region_is_deduplicated": true
local defaults = import 'gen/defaults.libsonnet';
local profiles = import 'gen/addons/oci-lz-dr/one-oe/profiles.libsonnet';
local home_security = import 'gen/addons/oci-lz-dr/one-oe/home_security.libsonnet';

local key = 'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY';
local with_grantees(document, grantees) = document + {
  vaults_configuration+: {
    keys+: {
      [key]+: {
        service_grantees: grantees,
      },
    },
  },
};

local home = (import 'gen/landing_zone.libsonnet')(defaults.hub_a);
local fra_ams = home_security({ home: defaults.hub_a, dr: profiles.hub_a });
local expected_fra_ams = [
  'objectstorage-eu-frankfurt-1',
  'objectstorage-eu-amsterdam-1',
];
local london_dr = profiles.hub_a + {
  region: 'uk-london-1',
  region_short_name: 'lhr',
};
local london = home_security({ home: defaults.hub_a, dr: london_dr });
local london_grantees = london.cis2.vaults_configuration.keys[key].service_grantees;
local same_region = home_security({ home: defaults.hub_a, dr: defaults.hub_a });

{
  fra_ams_pre_exact:
    fra_ams.cis2_pre == with_grantees(home.security_cis2_pre, expected_fra_ams),
  fra_ams_final_exact:
    fra_ams.cis2 == with_grantees(home.security_cis2, expected_fra_ams),
  london_is_dynamic:
    london_grantees == [
      'objectstorage-eu-frankfurt-1',
      'objectstorage-uk-london-1',
    ] && !std.member(london_grantees, 'objectstorage-eu-amsterdam-1'),
  same_region_is_deduplicated:
    same_region.cis2.vaults_configuration.keys[key].service_grantees ==
    ['objectstorage-eu-frankfurt-1'],
}
