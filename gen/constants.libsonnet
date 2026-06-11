// gen/constants.libsonnet
// OCI realm constants. Add realm-owned values here instead of in builders.
local security_zone_policy_suffixes = {
  // Recipe 03: Shared Network
  shared_network: [
    'aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba',
    'aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba',
    'aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga',
    'aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq',
  ],

  // Recipe 04: Environment Network
  environment_network: [
    'aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba',
    'aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba',
    'aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga',
    'aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq',
    'aaaaaaaak5wxfr2r6kxmtd6bq6hqhyywfkj6pcnl74g3iui6qnlq7rof4ezq',
    'aaaaaaaabs6kboflsfan2lihfnodhbeb75r4nxiolhlobvj6vqclx6j5yyha',
    'aaaaaaaa6j7b5bf3ytsno7a45r7xupqt2q342q2hlecnf7fgqpkq67stakda',
    'aaaaaaaamewv6k5a7cik6ds6m6bsijwkiixpfzgsqzvrjlns5pxg6lslrzgq',
  ],

  // Recipe 05: Workload
  workload: [
    'aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba',
    'aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba',
    'aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga',
    'aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq',
    'aaaaaaaak5wxfr2r6kxmtd6bq6hqhyywfkj6pcnl74g3iui6qnlq7rof4ezq',
    'aaaaaaaabs6kboflsfan2lihfnodhbeb75r4nxiolhlobvj6vqclx6j5yyha',
    'aaaaaaaa6j7b5bf3ytsno7a45r7xupqt2q342q2hlecnf7fgqpkq67stakda',
    'aaaaaaaamewv6k5a7cik6ds6m6bsijwkiixpfzgsqzvrjlns5pxg6lslrzgq',
    'aaaaaaaaf45c2imtiuyxbccuwrh3s7is5lokpx5ksr4heu46c6mz6k35dsqa',
    'aaaaaaaa5qtljtbaeacnhfhr7hfs5nd3jp6jin6grbdgf6izkf4ukxmatjpa',
    'aaaaaaaa6oycc62uuvpi6oddkzku6x2vzhraud7ynkbdeols5i4khwroklva',
    'aaaaaaaauvfkentmqda6mq7lxekkstjpe7kwgmrpkadzt7krhrt66tliourq',
    'aaaaaaaa544n6cyqrq6tato53ohh7vcz523af5dtuz6x54efhs6mb7bcw54a',
    'aaaaaaaay32fadjsdgsytdpyn4busugqftko2shttseljqbagapngiatxepa',
    'aaaaaaaaqlpaf5tc3xfqdzdw2rtx7hk4ifywzml3eh3upspeh4s6x4epaskq',
    'aaaaaaaaxou4266jlusvklor34czqvloa64k5dsok5cejug2bxi2jvqy32zq',
    'aaaaaaaak2x2aomzhqoeg2bf4zgqyr3bg2ppsfhupn2xvu66zpuz7kbvae5a',
    'aaaaaaaauah5cz3vxzpdvw4uz32hcgcmhogvuhacgyc7z3al42tfjey46eea',
    'aaaaaaaawebiliesbgzdguac5m5u332oj66afaab6ruovydpsdoexloguweq',
    'aaaaaaaa2lfkaypfwyykhbz65zlgc4lvypl64axzhnsqmegllgiyxbweruya',
    'aaaaaaaah3k66efqfgo5ccjgvtkwbfpzj5yjajmw7vt5eub6ma4jp6su55zq',
    'aaaaaaaajscm24dhll5wk65k6q4mmkopiykpqrumtururitjaxk3j4ibe3ua',
    'aaaaaaaaol3pxbbikegih24c7l4um7wqeeun2dpkvgm3izz5syf755xfscgq',
    'aaaaaaaawol5fz6qkrkxm5ui7n3car44e5wbs54thnku2hjxwaedi5ee6htq',
    'aaaaaaaaegi6cweu5jqwipqhj5quz4pebfd76djed4lfogslzuawqavkrsjq',
    'aaaaaaaarkvvuzwtc6xwwr57zg6fymgkco3lbt35c7r4lnahw4ab5i3vkbrq',
    'aaaaaaaauhuzsidaju3mwy3llsetvm3dlc6ftel65ielfu7h4hg6q2cfsrxa',
    'aaaaaaaawec56szedvf6hogbbnu7cxywm4xkmta53wuo7lenceiqyr4bx5hq',
  ],
};

local security_zone_policy_ocids(realm) = {
  [recipe]: [
    'ocid1.securityzonessecuritypolicy.%s..%s' % [realm, suffix]
    for suffix in security_zone_policy_suffixes[recipe]
  ]
  for recipe in std.objectFields(security_zone_policy_suffixes)
};

{
  oc1: {
    service_identifiers: {
      fss: 'Fssoc1Prod',
      objectstorage(region):: 'objectstorage-%s' % region,
    },

    usage_report_tenancy_ocid: 'ocid1.tenancy.oc1..aaaaaaaaned4fkpkisbwjlr56u7cj63lf3wffbilvqknstgtvzub7vhqkggq',

    // Security zone recipe policy OCIDs — same across all oc1 tenancies.
    // Extracted from blueprints/one-oe/runtime/one-stack/oneoe_security_cis*.json.
    // Recipes 01 (CIS L1) and 02 (CIS L2) use cis_level only, no explicit OCIDs.
    security_zone_policy_ocids: security_zone_policy_ocids('oc1'),
  },

  oc19: {
    service_identifiers: {
      // Realm keys greater than 10 use the generic File Storage service principal.
      fss: 'fssocprod',
      objectstorage(region):: 'objectstorage-%s' % region,
    },

    usage_report_tenancy_ocid: 'ocid1.tenancy.oc19..aaaaaaaaqukxloflocfzrs2yrqwemn356zrtyo2hdnjtu3gn3mg5e3ve6g4a',

    // Extracted from addons/oci-sovereign-landing-zone/security.auto.tfvars.json.
    security_zone_policy_ocids: security_zone_policy_ocids('oc19'),
  },
}
