{
   "cloud_guard_configuration": {
      "compartment_id": "TENANCY-ROOT",
      "reporting_region": "eu-frankfurt-1",
      "self_manage_resources": false,
      "targets": {
         "CG-TGT-ROOT-KEY": {
            "compartment_id": "TENANCY-ROOT",
            "name": "cg-tgt-root",
            "resource_id": "TENANCY-ROOT",
            "resource_type": "COMPARTMENT",
            "use_cloned_recipes": true
         }
      }
   },
   "scanning_configuration": {
      "default_compartment_id": "CMP-LZP-SECURITY-KEY",
      "host_recipes": {
         "VSS-RECH-LZP-KEY": {
            "agent_settings": {
               "cis_benchmark_scan_level": "STRICT",
               "scan_level": "STANDARD",
               "vendor": "OCI"
            },
            "file_scan_settings": {
               "enable": true,
               "folders_to_scan": [
                  "/"
               ],
               "operating_system": "LINUX",
               "scan_recurrence": "FREQ=WEEKLY;INTERVAL=2;WKST=SU"
            },
            "name": "vss-rech-lzp",
            "port_scan_level": "STANDARD",
            "schedule_settings": {
               "day_of_week": "SUNDAY",
               "type": "WEEKLY"
            }
         }
      },
      "host_targets": {
         "VSS-TGT-LZP-KEY": {
            "host_recipe_id": "VSS-RECH-LZP-KEY",
            "name": "vss-tgt-lzp",
            "target_compartment_id": "CMP-LANDINGZONE-P-KEY"
         }
      }
   },
   "security_zones_configuration": {
      "recipes": {
         "SZ-RCP-LZP-01-CIS-LVL-1-KEY": {
            "cis_level": "1",
            "compartment_id": "CMP-LZP-SECURITY-KEY",
            "description": "Recipe 01 CIS Level 1",
            "name": "sz-rcp-lzp-01-CIS-Level-1"
         },
         "SZ-RCP-LZP-02-CIS-LVL-2-KEY": {
            "cis_level": "2",
            "compartment_id": "CMP-LZP-SECURITY-KEY",
            "description": "Recipe 02 CIS Level 2",
            "name": "sz-rcp-lzp-02-CIS-Level-2"
         },
         "SZ-RCP-LZP-03-SHARED-NETWORK-KEY": {
            "cis_level": "2",
            "compartment_id": "CMP-LZP-SECURITY-KEY",
            "description": "Recipe 03 Shared Network",
            "name": "sz-rcp-lzp-03-shared-network",
            "security_policies_ocids": [
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq"
            ]
         },
         "SZ-RCP-LZP-04-ENV-NETWORK-KEY": {
            "cis_level": "2",
            "compartment_id": "CMP-LZP-SECURITY-KEY",
            "description": "Recipe 04 Environment Network",
            "name": "sz-rcp-lzp-04-environment-network",
            "security_policies_ocids": [
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaak5wxfr2r6kxmtd6bq6hqhyywfkj6pcnl74g3iui6qnlq7rof4ezq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaabs6kboflsfan2lihfnodhbeb75r4nxiolhlobvj6vqclx6j5yyha",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaa6j7b5bf3ytsno7a45r7xupqt2q342q2hlecnf7fgqpkq67stakda",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaamewv6k5a7cik6ds6m6bsijwkiixpfzgsqzvrjlns5pxg6lslrzgq"
            ]
         },
         "SZ-RCP-LZP-05-WORKLOADS-KEY": {
            "cis_level": "2",
            "compartment_id": "CMP-LZP-SECURITY-KEY",
            "description": "Recipe 05 Workloads",
            "name": "sz-rcp-lzp-05-workloads",
            "security_policies_ocids": [
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaavolswrbfqy6qn2qe7zek2dumml6pbmyzv47q6jfwdatrywmqumba",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaayxn5ccbavcx5w35uoozguju5zlovvtbnuvnrduxpdp3vsho33lba",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaazlzn66zeazf5npw46qah3wlqpfrugv7w4tjbomit2msr43stidga",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaw6v2nz4unovq3joqk6pguxpaqriws2vzd7gvpldgai47tl72wseq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaak5wxfr2r6kxmtd6bq6hqhyywfkj6pcnl74g3iui6qnlq7rof4ezq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaabs6kboflsfan2lihfnodhbeb75r4nxiolhlobvj6vqclx6j5yyha",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaa6j7b5bf3ytsno7a45r7xupqt2q342q2hlecnf7fgqpkq67stakda",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaamewv6k5a7cik6ds6m6bsijwkiixpfzgsqzvrjlns5pxg6lslrzgq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaf45c2imtiuyxbccuwrh3s7is5lokpx5ksr4heu46c6mz6k35dsqa",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaa5qtljtbaeacnhfhr7hfs5nd3jp6jin6grbdgf6izkf4ukxmatjpa",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaa6oycc62uuvpi6oddkzku6x2vzhraud7ynkbdeols5i4khwroklva",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaauvfkentmqda6mq7lxekkstjpe7kwgmrpkadzt7krhrt66tliourq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaa544n6cyqrq6tato53ohh7vcz523af5dtuz6x54efhs6mb7bcw54a",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaay32fadjsdgsytdpyn4busugqftko2shttseljqbagapngiatxepa",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaqlpaf5tc3xfqdzdw2rtx7hk4ifywzml3eh3upspeh4s6x4epaskq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaxou4266jlusvklor34czqvloa64k5dsok5cejug2bxi2jvqy32zq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaak2x2aomzhqoeg2bf4zgqyr3bg2ppsfhupn2xvu66zpuz7kbvae5a",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaauah5cz3vxzpdvw4uz32hcgcmhogvuhacgyc7z3al42tfjey46eea",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaawebiliesbgzdguac5m5u332oj66afaab6ruovydpsdoexloguweq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaa2lfkaypfwyykhbz65zlgc4lvypl64axzhnsqmegllgiyxbweruya",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaah3k66efqfgo5ccjgvtkwbfpzj5yjajmw7vt5eub6ma4jp6su55zq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaajscm24dhll5wk65k6q4mmkopiykpqrumtururitjaxk3j4ibe3ua",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaol3pxbbikegih24c7l4um7wqeeun2dpkvgm3izz5syf755xfscgq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaawol5fz6qkrkxm5ui7n3car44e5wbs54thnku2hjxwaedi5ee6htq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaaegi6cweu5jqwipqhj5quz4pebfd76djed4lfogslzuawqavkrsjq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaarkvvuzwtc6xwwr57zg6fymgkco3lbt35c7r4lnahw4ab5i3vkbrq",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaauhuzsidaju3mwy3llsetvm3dlc6ftel65ielfu7h4hg6q2cfsrxa",
               "ocid1.securityzonessecuritypolicy.oc1..aaaaaaaawec56szedvf6hogbbnu7cxywm4xkmta53wuo7lenceiqyr4bx5hq"
            ]
         }
      },
      "reporting_region": "eu-frankfurt-1",
      "security_zones": {
         "SZ-TGT-LZP-CISL1-KEY": {
            "compartment_id": "CMP-LANDINGZONE-P-KEY",
            "name": "sz-tgt-lzp-cisl1",
            "recipe_key": "SZ-RCP-LZP-01-CIS-LVL-1-KEY"
         }
      },
      "tenancy_ocid": "TENANCY-ROOT"
   }
}
