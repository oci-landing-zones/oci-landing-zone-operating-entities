local cis1 = import 'oci_open_lz_one-oe_security_cisl1.auto.tfvars.jsonnet';

cis1 {
  security_zones_configuration+: {
    security_zones: {
      'SZ-TGT-LZP-KEY': {
        name: 'sz-tgt-lzp',
        compartment_id: 'CMP-LANDINGZONE-P-KEY',
        recipe_key: 'SZ-RCP-LZP-02-CIS-LVL-2-KEY',
      },
    },
  },
  vaults_configuration: {
    default_compartment_id: 'CMP-LZP-SECURITY-KEY',
    vaults: {
      'VLT-LZP-SHARED-SECURITY-KEY': {
        name: 'vlt-lzp-shared-security',
      },
    },
    keys: {
      'KEY-LZP-OSS-AUDIT-BKT-KEY': {
        name: 'key-lzp-oss-audit-bkt',
        protection_mode: 'SOFTWARE',
        vault_key: 'VLT-LZP-SHARED-SECURITY-KEY',
        service_grantees: ['objectstorage-eu-frankfurt-1'],
        group_grantees: ['grp-security-admins'],
        versions: ['1', '2'],
      },
    },
  },
}
