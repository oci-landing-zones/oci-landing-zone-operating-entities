local cis1 = import 'oneoe_security_cis1.jsonnet';

cis1 {
  security_zones_configuration+: {
    security_zones: {
      'SZ-TGT-LZ-CIS-L2-KEY': {
        name: 'sz-tgt-lz-cis-l2',
        compartment_id: 'CMP-LANDINGZONE-KEY',
        recipe_key: 'SZ-RCP-LZ-02-CIS-L2-KEY',
      },
    },
  },
  vaults_configuration: {
    default_compartment_id: 'CMP-LZ-SECURITY-KEY',
    vaults: {
      'VLT-LZ-SHARED-SECURITY-KEY': {
        name: 'vlt-lz-shared-security',
      },
    },
    keys: {
      'KEY-LZ-SHARED-OSS-AUDIT-BKT-KEY': {
        name: 'key-lz-shared-oss-audit-bkt',
        protection_mode: 'SOFTWARE',
        vault_key: 'VLT-LZ-SHARED-SECURITY-KEY',
        service_grantees: ['objectstorage-eu-frankfurt-1'],
        group_grantees: ['grp-lz-shared-security-key-admin'],
        versions: ['1', '2'],
      },
    },
  },
}
